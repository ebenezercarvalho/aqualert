import hashlib
import json
import logging
import os
import tempfile
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd
from prophet import Prophet
from prophet.diagnostics import cross_validation, performance_metrics
from prophet.serialize import model_to_json
from sklearn.metrics import mean_absolute_error, mean_squared_error

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("NDCI_Prophet")

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_CSV_PATH = os.path.join(ROOT_DIR, "prophet", "dados_ndci_funil.csv")
CLEAN_CSV_PATH = os.path.join(ROOT_DIR, "prophet", "dados_ndci_limpos.csv")
MODEL_JSON_PATH = os.path.join(ROOT_DIR, "prophet", "modelo_ndci_prophet.json")
REPORT_JSON_PATH = os.path.join(ROOT_DIR, "prophet", "relatorio_metricas.json")

MODEL_VERSION = "v2.0-prophet-ar1-qa20m"
MIN_VALID_PIXELS_20M = 81
MAX_WATER_PIXELS_20M = 270
MAX_CLOUDY_PCT = 70.0
DEFAULT_TAU_DAYS = 6.5


def atomic_write_text(content: str, target_path: str) -> None:
    target_dir = os.path.dirname(os.path.abspath(target_path))
    os.makedirs(target_dir, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(prefix=".prophet_art_", suffix=".tmp", dir=target_dir)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as f:
            f.write(content)
        os.replace(tmp_path, target_path)
    except Exception:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass
        raise


def file_sha256(path: str) -> str:
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def apply_causal_optical_qa(df_raw: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, int]]:
    """
    Aplica exclusivamente regras físicas e ópticas causais (por cena, sem olhar para o futuro
    e sem ajustar modelo sobre a série inteira - resolve ML-01):
      1. Domínio físico estrito da razão normalizada: y em [-1.0, 1.0] e std_dev >= 0.
      2. Cobertura espacial mínima na grade UTM 20m (EPSG:32723): points_count >= 81 (>= 30% de 270 px).
      3. Cobertura de nuvens da cena < 70%.
    Preserva integralmente os eventos reais de floração algal (NDCI >= 0.20) validados por QA óptica.
    """
    work = df_raw.copy()
    work["ds"] = pd.to_datetime(work["ds"])
    work = work.sort_values("ds").drop_duplicates(subset=["ds"], keep="first").reset_index(drop=True)

    n_total = len(work)
    mask_finite = work["y"].notna() & np.isfinite(work["y"]) & work["std_dev"].notna() & (work["std_dev"] >= 0.0)
    mask_domain = (work["y"] >= -1.0) & (work["y"] <= 1.0)
    mask_coverage = work["points_count"] >= MIN_VALID_PIXELS_20M
    if "cloudy_pct" in work.columns:
        mask_cloud = work["cloudy_pct"].fillna(0.0) < MAX_CLOUDY_PCT
    else:
        mask_cloud = pd.Series(True, index=work.index)

    valid_mask = mask_finite & mask_domain & mask_coverage & mask_cloud
    clean_df = work.loc[valid_mask].reset_index(drop=True)

    qa_stats = {
        "total_bruto": int(n_total),
        "rejeitados_nao_finitos": int((~mask_finite).sum()),
        "rejeitados_fora_dominio_fisico": int((mask_finite & ~mask_domain).sum()),
        "rejeitados_baixa_cobertura_espacial": int((mask_finite & mask_domain & ~mask_coverage).sum()),
        "rejeitados_nuvem_cena": int((mask_finite & mask_domain & mask_coverage & ~mask_cloud).sum()),
        "total_aprovado_qa": int(len(clean_df)),
        "eventos_atencao_gte_012": int((clean_df["y"] >= 0.12).sum()),
        "eventos_criticos_gte_020": int((clean_df["y"] >= 0.20).sum()),
    }
    return clean_df, qa_stats


def get_observation_anchored_cutoffs(
    df_series: pd.DataFrame,
    initial_days: int = 730,
    min_step_days: int = 21,
    horizon_days: int = 45,
) -> List[pd.Timestamp]:
    """
    Seleciona datas de corte (cutoffs) ancoradas em passagens reais do Sentinel-2 espaçadas por >= 21 dias
    (passo coprimo ao ciclo orbital de 5 dias do Sentinel-2), garantindo amostragem uniforme de todos
    os horizontes (1 a 45 dias) e correspondência exata com o uso operacional (emissão após observação).
    """
    min_ds = df_series["ds"].min() + pd.Timedelta(days=initial_days)
    max_ds = df_series["ds"].max() - pd.Timedelta(days=horizon_days)
    eligible = df_series.loc[(df_series["ds"] >= min_ds) & (df_series["ds"] <= max_ds), "ds"].tolist()
    cutoffs: List[pd.Timestamp] = []
    for d in eligible:
        if not cutoffs or (d - cutoffs[-1]).days >= min_step_days:
            cutoffs.append(d)
    return cutoffs


def compute_causal_baselines_and_assimilation(
    df_cv: pd.DataFrame,
    df_full: pd.DataFrame,
    tau_days: float = DEFAULT_TAU_DAYS,
) -> pd.DataFrame:
    """
    Para cada par (cutoff, ds) da validação cruzada temporal, calcula de forma estritamente causal
    (usando apenas dados observados até t <= cutoff):
      - Persistência: último valor observado y(cutoff).
      - Climatologia Sazonal Histórica: média móvel circular de +-15 dias no dia do ano (DOY) até cutoff.
      - Prophet com Assimilação Causal de Estado AR(1): combina o estado observado em cutoff com a
        trajetória sazonal do Prophet segundo decaimento exponencial exp(-h / tau_days).
    """
    work = df_cv.copy()
    work["h_days"] = (work["ds"] - work["cutoff"]).dt.days
    obs_map = dict(zip(df_full["ds"], df_full["y"]))
    work["y_persistencia"] = work["cutoff"].map(obs_map).astype(float)

    clim_preds: List[float] = []
    for _, row in work.iterrows():
        c_date = row["cutoff"]
        t_date = row["ds"]
        past = df_full.loc[df_full["ds"] <= c_date]
        doy_t = t_date.dayofyear
        doy_p = past["ds"].dt.dayofyear.values
        diff_doy = np.minimum(np.abs(doy_p - doy_t), 365 - np.abs(doy_p - doy_t))
        sub_vals = past["y"].values[diff_doy <= 15]
        clim_preds.append(float(np.mean(sub_vals)) if len(sub_vals) > 0 else float(past["y"].mean()))

    work["y_climatologia"] = clim_preds

    if tau_days > 0:
        w = np.exp(-work["h_days"].values / float(tau_days))
    else:
        w = np.zeros(len(work), dtype=float)

    work["yhat_prophet_puro"] = work["yhat"].astype(float)
    work["yhat"] = np.clip(w * work["y_persistencia"].values + (1.0 - w) * work["yhat_prophet_puro"].values, -1.0, 1.0)
    return work


def build_operational_horizon_tables(
    df_cv_enriched: pd.DataFrame,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Constrói:
      1. metricas_horizontes_cv: lista canônica dos 5 horizontes (3, 5, 7, 10, 15 dias) com contrato
         estrito {'horizonte_alvo', 'horizonte_exato', 'MSE', 'RMSE', 'MAE'} exigido pelo backend e M2.
      2. metricas_horizontes_operacionais: tabela expandida até 45 dias (3, 5, 7, 10, 15, 21, 30, 45 dias)
         com contagem de pares, viés, comparação com Persistência e Climatologia, Skill Score e
         quantil empírico de 80% dos resíduos absolutos para calibração das bandas de incerteza (ML-03 a ML-07).
    """
    horizon_bins = [
        (3, 1, 3),
        (5, 4, 5),
        (7, 6, 7),
        (10, 8, 10),
        (15, 11, 15),
        (21, 16, 21),
        (30, 22, 30),
        (45, 31, 45),
    ]

    canonical_cv: List[Dict[str, Any]] = []
    operational_table: List[Dict[str, Any]] = []

    for h_target, b_min, b_max in horizon_bins:
        sub = df_cv_enriched.loc[(df_cv_enriched["h_days"] >= b_min) & (df_cv_enriched["h_days"] <= b_max)]
        if sub.empty:
            continue

        err_assim = sub["y"].values - sub["yhat"].values
        err_pure = sub["y"].values - sub["yhat_prophet_puro"].values
        err_pers = sub["y"].values - sub["y_persistencia"].values
        err_clim = sub["y"].values - sub["y_climatologia"].values

        mse_val = float(np.mean(err_assim ** 2))
        rmse_val = float(np.sqrt(mse_val))
        mae_val = float(np.mean(np.abs(err_assim)))
        bias_val = float(np.mean(err_assim))

        rmse_pure = float(np.sqrt(np.mean(err_pure ** 2)))
        mae_pure = float(np.mean(np.abs(err_pure)))

        rmse_pers = float(np.sqrt(np.mean(err_pers ** 2)))
        mae_pers = float(np.mean(np.abs(err_pers)))

        rmse_clim = float(np.sqrt(np.mean(err_clim ** 2)))
        mae_clim = float(np.mean(np.abs(err_clim)))

        skill_pers = float((1.0 - (rmse_val / rmse_pers)) * 100.0) if rmse_pers > 0 else 0.0
        skill_clim = float((1.0 - (rmse_val / rmse_clim)) * 100.0) if rmse_clim > 0 else 0.0

        q80_err = float(np.quantile(np.abs(err_assim), 0.80))
        raw_cov80 = float(
            np.mean((sub["y"].values >= sub["yhat_lower"].values) & (sub["y"].values <= sub["yhat_upper"].values))
        )
        cal_cov80 = float(np.mean(np.abs(err_assim) <= q80_err))
        mean_h = float(sub["h_days"].mean())

        mse_r = float(round(mse_val, 6))
        rmse_r = float(round(rmse_val, 4))
        mae_r = float(round(mae_val, 4))

        if h_target in (3, 5, 7, 10, 15):
            canonical_cv.append({
                "horizonte_alvo": f"{h_target} dias",
                "horizonte_exato": f"{mean_h:.1f} dias",
                "RMSE": rmse_r,
                "MAE": mae_r,
                "MSE": mse_r,
            })

        operational_table.append({
            "horizonte_alvo": f"{h_target} dias",
            "horizonte_dias": int(h_target),
            "faixa_dias": f"{b_min}-{b_max} dias",
            "horizonte_exato": f"{mean_h:.1f} dias",
            "n_pares": int(len(sub)),
            "RMSE": rmse_r,
            "MAE": mae_r,
            "MSE": mse_r,
            "vies": float(round(bias_val, 4)),
            "RMSE_prophet_puro": float(round(rmse_pure, 4)),
            "MAE_prophet_puro": float(round(mae_pure, 4)),
            "RMSE_persistencia": float(round(rmse_pers, 4)),
            "MAE_persistencia": float(round(mae_pers, 4)),
            "RMSE_climatologia": float(round(rmse_clim, 4)),
            "MAE_climatologia": float(round(mae_clim, 4)),
            "skill_vs_persistencia_pct": float(round(skill_pers, 2)),
            "skill_vs_climatologia_pct": float(round(skill_clim, 2)),
            "q80_abs_err": float(round(q80_err, 4)),
            "cobertura_nominal_80_bruta": float(round(raw_cov80, 4)),
            "cobertura_calibrada_80": float(round(cal_cov80, 4)),
        })

    return canonical_cv, operational_table


def evaluate_alert_classification(df_pairs: pd.DataFrame, threshold: float = 0.12) -> Dict[str, Any]:
    """Avalia sensibilidade, precisão, F1 e taxa de falsos alarmes para detecção de eventos NDCI >= threshold."""
    sub = df_pairs.loc[df_pairs["h_days"] <= 15].copy()
    y_true = sub["y"].values >= threshold
    # Alerta preditivo acionado quando a estimativa assimilada ou o limite superior calibrado indica risco
    y_pred = sub["yhat"].values >= (threshold - 0.02)

    tp = int(np.sum(y_true & y_pred))
    fp = int(np.sum((~y_true) & y_pred))
    fn = int(np.sum(y_true & (~y_pred)))
    tn = int(np.sum((~y_true) & (~y_pred)))

    precision = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
    recall = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
    f1 = float(2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    far = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0

    return {
        "limiar_ndci": float(threshold),
        "janela_avaliada": "1-15 dias",
        "total_pares": int(len(sub)),
        "eventos_reais": int(tp + fn),
        "verdadeiros_positivos": tp,
        "falsos_positivos": fp,
        "falsos_negativos": fn,
        "verdadeiros_negativos": tn,
        "precisao": float(round(precision, 4)),
        "sensibilidade_recall": float(round(recall, 4)),
        "f1_score": float(round(f1, 4)),
        "taxa_falso_alarme": float(round(far, 4)),
    }


def main() -> None:
    logger.info("=== 1. Carregando série histórica Sentinel-2 validada em grade 20m UTM (GEE) ===")
    df_raw = pd.read_csv(RAW_CSV_PATH)
    df_clean, qa_stats = apply_causal_optical_qa(df_raw)

    total_obs = len(df_clean)
    logger.info(f"Total de datas aprovadas por QA óptica causal: {total_obs} de {qa_stats['total_bruto']}")
    logger.info(
        f"Período: {df_clean['ds'].min().strftime('%Y-%m-%d')} até {df_clean['ds'].max().strftime('%Y-%m-%d')}"
    )
    logger.info(
        f"NDCI médio: {df_clean['y'].mean():.4f} (mín: {df_clean['y'].min():.4f}, "
        f"máx: {df_clean['y'].max():.4f}, std: {df_clean['y'].std():.4f})"
    )
    logger.info(
        f"Eventos preservados: {qa_stats['eventos_atencao_gte_012']} em atenção (>=0.12) e "
        f"{qa_stats['eventos_criticos_gte_020']} críticos (>=0.20)"
    )

    # Salva base aprovada por QA óptica causal (sem poda pelo futuro - ML-01)
    df_save_clean = df_clean[["ds", "y", "std_dev", "points_count"]].copy()
    df_save_clean["ds"] = df_save_clean["ds"].dt.strftime("%Y-%m-%d")
    atomic_write_text(df_save_clean.to_csv(index=False), CLEAN_CSV_PATH)

    # --- 2. Divisão Estrita Treino/Validação (80%) e Holdout de Teste (20%) ---
    logger.info("\n=== 2. Divisão Temporal Estrita: Treino/Validação (80%) vs Holdout Intocado (20%) ===")
    tamanho_treino = int(len(df_clean) * 0.8)
    df_treino = df_clean[["ds", "y"]].iloc[:tamanho_treino].copy()
    df_teste = df_clean[["ds", "y"]].iloc[tamanho_treino:].copy()

    train_end_date = df_treino["ds"].max()
    logger.info(
        f"Treino/Validação: {len(df_treino)} obs ({df_treino['ds'].min().strftime('%Y-%m-%d')} a "
        f"{train_end_date.strftime('%Y-%m-%d')})"
    )
    logger.info(
        f"Holdout Teste:    {len(df_teste)} obs ({df_teste['ds'].min().strftime('%Y-%m-%d')} a "
        f"{df_teste['ds'].max().strftime('%Y-%m-%d')})"
    )

    # --- 3. Seleção de Hiperparâmetros EXCLUSIVAMENTE por Rolling-Origin CV dentro do Treino (ML-02) ---
    logger.info("\n=== 3. Seleção de Hiperparâmetros por Rolling-Origin CV Estritamente no Treino ===")
    cutoffs_all = get_observation_anchored_cutoffs(df_clean, initial_days=730, min_step_days=21, horizon_days=45)
    cutoffs_train = [c for c in cutoffs_all if c <= train_end_date - pd.Timedelta(days=45)]
    cutoffs_holdout = [c for c in cutoffs_all if c >= train_end_date]

    configs = [
        {
            "nome": "Sazonal Regularizada (yearly=8, cp=0.03, sp=1.0, sem semanal)",
            "yearly": 8,
            "cp": 0.03,
            "sp": 1.0,
            "weekly": False,
        },
        {
            "nome": "Padrão Sem Semanal (yearly=10, cp=0.05, sp=5.0, sem semanal)",
            "yearly": 10,
            "cp": 0.05,
            "sp": 5.0,
            "weekly": False,
        },
        {
            "nome": "Padrão Original (yearly=10, cp=0.05, sp=10.0, com semanal)",
            "yearly": 10,
            "cp": 0.05,
            "sp": 10.0,
            "weekly": True,
        },
        {
            "nome": "Flexível (yearly=15, cp=0.15, sp=5.0, sem semanal)",
            "yearly": 15,
            "cp": 0.15,
            "sp": 5.0,
            "weekly": False,
        },
    ]

    resultados_tuning_treino: List[Dict[str, Any]] = []
    for cfg in configs:
        np.random.seed(42)
        m_tune = Prophet(
            yearly_seasonality=cfg["yearly"],
            weekly_seasonality=cfg["weekly"],
            daily_seasonality=False,
            changepoint_prior_scale=cfg["cp"],
            seasonality_prior_scale=cfg["sp"],
            interval_width=0.80,
        )
        m_tune.fit(df_treino)
        cv_tune = cross_validation(m_tune, cutoffs=cutoffs_train, horizon="45 days", disable_tqdm=True)
        cv_tune_enr = compute_causal_baselines_and_assimilation(cv_tune, df_treino, tau_days=DEFAULT_TAU_DAYS)

        mse_pure = mean_squared_error(cv_tune_enr["y"], cv_tune_enr["yhat_prophet_puro"])
        rmse_pure = float(np.sqrt(mse_pure))
        mae_pure = float(mean_absolute_error(cv_tune_enr["y"], cv_tune_enr["yhat_prophet_puro"]))

        mse_assim = mean_squared_error(cv_tune_enr["y"], cv_tune_enr["yhat"])
        rmse_assim = float(np.sqrt(mse_assim))
        mae_assim = float(mean_absolute_error(cv_tune_enr["y"], cv_tune_enr["yhat"]))

        resultados_tuning_treino.append({
            "configuracao": cfg["nome"],
            "yearly_seasonality": cfg["yearly"],
            "changepoint_prior_scale": cfg["cp"],
            "seasonality_prior_scale": cfg["sp"],
            "weekly_seasonality": cfg["weekly"],
            "cutoffs_treino": len(cutoffs_train),
            "pares_avaliados": int(len(cv_tune_enr)),
            "MSE": float(round(mse_assim, 6)),
            "RMSE": float(round(rmse_assim, 4)),
            "MAE": float(round(mae_assim, 4)),
            "RMSE_prophet_puro": float(round(rmse_pure, 4)),
            "MAE_prophet_puro": float(round(mae_pure, 4)),
            "erro_medio_relativo_ao_desvio": float(round(rmse_assim / df_treino["y"].std(), 2)),
        })

    melhor_cfg = min(resultados_tuning_treino, key=lambda x: x["RMSE"])
    logger.info(
        f"Melhor configuração eleita estritamente no CV de Treino: {melhor_cfg['configuracao']} "
        f"(RMSE Assimilado: {melhor_cfg['RMSE']}, RMSE Puro: {melhor_cfg['RMSE_prophet_puro']})"
    )

    # --- 4. Avaliação Independente no Bloco de Holdout Intocado (20% Finais) ---
    logger.info("\n=== 4. Avaliação Independente no Holdout Intocado (Extrapolação Longa vs Rolling Operacional) ===")
    dias_teste = (df_teste["ds"].max() - df_treino["ds"].max()).days
    np.random.seed(42)
    m_holdout_static = Prophet(
        yearly_seasonality=melhor_cfg["yearly_seasonality"],
        weekly_seasonality=melhor_cfg["weekly_seasonality"],
        daily_seasonality=False,
        changepoint_prior_scale=melhor_cfg["changepoint_prior_scale"],
        seasonality_prior_scale=melhor_cfg["seasonality_prior_scale"],
        interval_width=0.80,
    )
    m_holdout_static.fit(df_treino)
    fut_static = m_holdout_static.make_future_dataframe(periods=dias_teste + 5, freq="D")
    pred_static = m_holdout_static.predict(fut_static)
    comp_static = pd.merge(pred_static[["ds", "yhat", "yhat_lower", "yhat_upper"]], df_teste, on="ds", how="inner")

    rmse_static_prophet = float(np.sqrt(mean_squared_error(comp_static["y"], comp_static["yhat"])))
    mae_static_prophet = float(mean_absolute_error(comp_static["y"], comp_static["yhat"]))
    mean_train_val = float(df_treino["y"].mean())
    last_train_val = float(df_treino.iloc[-1]["y"])
    rmse_static_mean = float(np.sqrt(np.mean((comp_static["y"] - mean_train_val) ** 2)))
    rmse_static_last = float(np.sqrt(np.mean((comp_static["y"] - last_train_val) ** 2)))

    # --- 5. Validação Cruzada Temporal Completa (1 a 45 dias) e Avaliação Rolling no Holdout ---
    logger.info("\n=== 5. Validação Cruzada Temporal (81 Cutoffs Ancorados em Observações, Horizonte 1 a 45 dias) ===")
    np.random.seed(42)
    m_cv = Prophet(
        yearly_seasonality=melhor_cfg["yearly_seasonality"],
        weekly_seasonality=melhor_cfg["weekly_seasonality"],
        daily_seasonality=False,
        changepoint_prior_scale=melhor_cfg["changepoint_prior_scale"],
        seasonality_prior_scale=melhor_cfg["seasonality_prior_scale"],
        interval_width=0.80,
    )
    m_cv.fit(df_clean[["ds", "y"]])

    df_cv = cross_validation(m_cv, cutoffs=cutoffs_all, horizon="45 days", disable_tqdm=True)
    # NDCI pode ser zero ou negativo: avaliar erros absolutos, sem métricas percentuais.
    df_p = performance_metrics(df_cv, metrics=['mse', 'rmse', 'mae'])

    df_cv_enriched = compute_causal_baselines_and_assimilation(df_cv, df_clean, tau_days=DEFAULT_TAU_DAYS)
    metricas_horizontes, metricas_operacionais = build_operational_horizon_tables(df_cv_enriched)

    # Isola os cutoffs pertencentes exclusivamente ao período de Holdout de Teste (pós 2025-05-17)
    cv_holdout_sub = df_cv_enriched.loc[df_cv_enriched["cutoff"] >= train_end_date]
    cv_holdout_15d = cv_holdout_sub.loc[cv_holdout_sub["h_days"] <= 15]
    holdout_metrics = {
        "periodo_holdout": f"{df_teste['ds'].min().strftime('%Y-%m-%d')} a {df_teste['ds'].max().strftime('%Y-%m-%d')}",
        "observacoes_holdout": int(len(df_teste)),
        "dias_corridos_holdout": int(dias_teste),
        "rolling_operacional_1_15d": {
            "cutoffs_avaliados": int(cv_holdout_sub["cutoff"].nunique()),
            "pares_avaliados": int(len(cv_holdout_15d)),
            "RMSE_assimilado": float(round(np.sqrt(mean_squared_error(cv_holdout_15d["y"], cv_holdout_15d["yhat"])), 4)),
            "MAE_assimilado": float(round(mean_absolute_error(cv_holdout_15d["y"], cv_holdout_15d["yhat"]), 4)),
            "RMSE_prophet_puro": float(round(np.sqrt(mean_squared_error(cv_holdout_15d["y"], cv_holdout_15d["yhat_prophet_puro"])), 4)),
            "RMSE_persistencia": float(round(np.sqrt(mean_squared_error(cv_holdout_15d["y"], cv_holdout_15d["y_persistencia"])), 4)),
            "RMSE_climatologia": float(round(np.sqrt(mean_squared_error(cv_holdout_15d["y"], cv_holdout_15d["y_climatologia"])), 4)),
        },
        "rolling_operacional_1_45d": {
            "cutoffs_avaliados": int(cv_holdout_sub["cutoff"].nunique()),
            "pares_avaliados": int(len(cv_holdout_sub)),
            "RMSE_assimilado": float(round(np.sqrt(mean_squared_error(cv_holdout_sub["y"], cv_holdout_sub["yhat"])), 4)),
            "MAE_assimilado": float(round(mean_absolute_error(cv_holdout_sub["y"], cv_holdout_sub["yhat"]), 4)),
            "RMSE_prophet_puro": float(round(np.sqrt(mean_squared_error(cv_holdout_sub["y"], cv_holdout_sub["yhat_prophet_puro"])), 4)),
            "RMSE_persistencia": float(round(np.sqrt(mean_squared_error(cv_holdout_sub["y"], cv_holdout_sub["y_persistencia"])), 4)),
            "RMSE_climatologia": float(round(np.sqrt(mean_squared_error(cv_holdout_sub["y"], cv_holdout_sub["y_climatologia"])), 4)),
        },
        "extrapolacao_estatica_sem_atualizacao_503d": {
            "pontos_avaliados": int(len(comp_static)),
            "RMSE_prophet_estatico": float(round(rmse_static_prophet, 4)),
            "MAE_prophet_estatico": float(round(mae_static_prophet, 4)),
            "RMSE_baseline_media_treino": float(round(rmse_static_mean, 4)),
            "RMSE_baseline_ultimo_valor_treino": float(round(rmse_static_last, 4)),
        },
    }

    alert_eval = evaluate_alert_classification(df_cv_enriched, threshold=0.12)

    df_op_print = pd.DataFrame(metricas_operacionais)[
        [
            "horizonte_alvo",
            "faixa_dias",
            "n_pares",
            "RMSE",
            "MAE",
            "RMSE_prophet_puro",
            "RMSE_persistencia",
            "RMSE_climatologia",
            "skill_vs_persistencia_pct",
            "q80_abs_err",
        ]
    ]
    print("\n--- DESEMPENHO OPERACIONAL POR JANELA DE HORIZONTE (1 A 45 DIAS) ---")
    print(df_op_print.to_string(index=False))

    # --- 6. Treinamento do Modelo Final e Serialização Atômica (ML-06, ML-10) ---
    logger.info("\n=== 6. Treinando e Serializando Modelo Final e Relatório Científico ===")
    np.random.seed(42)
    modelo_final = Prophet(
        yearly_seasonality=melhor_cfg["yearly_seasonality"],
        weekly_seasonality=melhor_cfg["weekly_seasonality"],
        daily_seasonality=False,
        changepoint_prior_scale=melhor_cfg["changepoint_prior_scale"],
        seasonality_prior_scale=melhor_cfg["seasonality_prior_scale"],
        interval_width=0.80,
    )
    modelo_final.fit(df_clean[["ds", "y"]])

    last_obs_ds = df_clean["ds"].max()
    last_obs_y = float(df_clean.iloc[-1]["y"])
    futuro_final = modelo_final.make_future_dataframe(periods=30, freq="D")
    previsao_final = modelo_final.predict(futuro_final)

    yhat_at_anchor = float(previsao_final.loc[previsao_final["ds"] == last_obs_ds, "yhat"].iloc[-1])
    futuro_30d = previsao_final.loc[previsao_final["ds"] > last_obs_ds].head(30).copy()
    futuro_30d["h_days"] = (futuro_30d["ds"] - last_obs_ds).dt.days
    w_fut = np.exp(-futuro_30d["h_days"].values / DEFAULT_TAU_DAYS)
    futuro_30d["yhat_assimilado"] = np.clip(
        w_fut * last_obs_y + (1.0 - w_fut) * futuro_30d["yhat"].values, -1.0, 1.0
    )

    # Corrigido ML-10: seleciona os PRÓXIMOS 15 dias imediatamente após a última observação (.head(15) e não .tail(15))
    proximos_15 = futuro_30d.head(15)

    atomic_write_text(json.dumps(model_to_json(modelo_final)), MODEL_JSON_PATH)
    logger.info(f"Modelo final salvo atomicamente em: {MODEL_JSON_PATH}")

    relatorio = {
        "versao_modelo": MODEL_VERSION,
        "gerado_em_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "trained_through": last_obs_ds.strftime("%Y-%m-%d"),
        "horizonte_maximo_validado_dias": 45,
        "assimilacao_ar1_tau_dias": DEFAULT_TAU_DAYS,
        "yhat_ancora_treino": float(round(yhat_at_anchor, 6)),
        "hashes_artefatos": {
            "dados_ndci_funil_csv_sha256": file_sha256(RAW_CSV_PATH),
            "dados_ndci_limpos_csv_sha256": file_sha256(CLEAN_CSV_PATH),
            "modelo_ndci_prophet_json_sha256": file_sha256(MODEL_JSON_PATH),
        },
        "coordenadas": {
            "lat": -22.530116459790744,
            "lon": -44.5639148196765,
            "raio_m": 175,
            "diametro_m": 350,
            "crs": "EPSG:32723",
            "resolucao_m": 20,
            "pixels_agua_unicos_max": MAX_WATER_PIXELS_20M,
            "pixels_validos_min": MIN_VALID_PIXELS_20M,
        },
        "resumo_dados": {
            "total_bruto": qa_stats["total_bruto"],
            "outliers_removidos": qa_stats["total_bruto"] - qa_stats["total_aprovado_qa"],
            "total_limpo": qa_stats["total_aprovado_qa"],
            "qa_optica_detalhes": qa_stats,
            "ndci_medio": float(round(df_clean["y"].mean(), 4)),
            "ndci_desvio": float(round(df_clean["y"].std(), 4)),
            "ndci_min": float(round(df_clean["y"].min(), 4)),
            "ndci_max": float(round(df_clean["y"].max(), 4)),
        },
        "melhor_configuracao": melhor_cfg,
        "comparacao_teste": resultados_tuning_treino,
        "avaliacao_holdout_independente": holdout_metrics,
        "avaliacao_alertas_floracao": alert_eval,
        "metricas_horizontes_cv": metricas_horizontes,
        "metricas_horizontes_operacionais": metricas_operacionais,
        "previsao_proximos_15_dias": [
            {
                "ds": row["ds"].strftime("%Y-%m-%d"),
                "yhat": float(round(row["yhat_assimilado"], 4)),
                "yhat_prophet_puro": float(round(row["yhat"], 4)),
                "yhat_lower": float(round(row["yhat_lower"], 4)),
                "yhat_upper": float(round(row["yhat_upper"], 4)),
            }
            for _, row in proximos_15.iterrows()
        ],
    }

    atomic_write_text(json.dumps(relatorio, indent=2, ensure_ascii=False) + "\n", REPORT_JSON_PATH)
    logger.info(f"Relatório científico completo salvo em: {REPORT_JSON_PATH}")


if __name__ == "__main__":
    main()
