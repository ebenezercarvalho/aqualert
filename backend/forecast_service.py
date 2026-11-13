import json
import logging
import os
import tempfile
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from prophet.serialize import model_from_json

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_JSON_PATH = os.path.join(BASE_DIR, "prophet", "modelo_ndci_prophet.json")
DATA_RAW_CSV_PATH = os.path.join(BASE_DIR, "prophet", "dados_ndci_funil.csv")
DATA_CLEAN_CSV_PATH = os.path.join(BASE_DIR, "prophet", "dados_ndci_limpos.csv")
METRICS_JSON_PATH = os.path.join(BASE_DIR, "prophet", "relatorio_metricas.json")
PREDICTIONS_HISTORY_PATH = os.path.join(BASE_DIR, "prophet", "historico_previsoes.json")
MAX_OPERATIONAL_FORECAST_DAYS = 45

_cached_model = None
_cached_model_mtime: Optional[float] = None
_cached_metrics = None
_cached_metrics_mtime: Optional[float] = None


def _atomic_write_json(data: Any, target_path: str) -> None:
    target_dir = os.path.dirname(os.path.abspath(target_path))
    os.makedirs(target_dir, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(prefix=".forecast_hist_", suffix=".json.tmp", dir=target_dir)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as f:
            json.dump(data, f, indent=2, ensure_ascii=False, allow_nan=False)
            f.write("\n")
        os.replace(tmp_path, target_path)
    except Exception:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass
        raise


def load_metrics_report(force_reload: bool = False) -> Dict[str, Any]:
    global _cached_metrics, _cached_metrics_mtime
    if not force_reload and _cached_metrics is not None:
        # Preserva compatibilidade com mocks unitários (quando _cached_metrics é injetado via patch.object)
        if _cached_metrics_mtime is None:
            return _cached_metrics
        if os.path.exists(METRICS_JSON_PATH) and os.path.getmtime(METRICS_JSON_PATH) == _cached_metrics_mtime:
            return _cached_metrics

    if os.path.exists(METRICS_JSON_PATH):
        try:
            mtime = os.path.getmtime(METRICS_JSON_PATH)
            with open(METRICS_JSON_PATH, "r", encoding="utf-8") as f:
                _cached_metrics = json.load(f)
            _cached_metrics_mtime = mtime
        except Exception as e:
            logger.warning(f"Erro ao ler relatorio_metricas.json: {e}")
            _cached_metrics = {}
            _cached_metrics_mtime = None
    else:
        _cached_metrics = {}
        _cached_metrics_mtime = None
    return _cached_metrics


def get_error_for_horizon(horizon_days: int) -> Dict[str, float]:
    """
    Retorna o RMSE e MAE obtidos na validação cruzada para a distância em dias da previsão.
    Utiliza a tabela operacional expandida (até 45 dias) e a tabela canônica de CV, mantendo
    compatibilidade estrita de contrato {'rmse', 'mae'}.
    """
    metrics = load_metrics_report()
    cv_list = metrics.get("metricas_horizontes_cv", [])
    op_list = metrics.get("metricas_horizontes_operacionais", [])

    cv_map: Dict[int, Dict[str, float]] = {}

    if op_list:
        for item in op_list:
            try:
                h_int = int(str(item.get("horizonte_alvo", "")).split()[0])
                cv_map[h_int] = {
                    "rmse": float(item["RMSE"]),
                    "mae": float(item["MAE"]),
                }
            except Exception:
                pass

    if cv_list:
        for item in cv_list:
            try:
                h_int = int(str(item.get("horizonte_alvo", "")).split()[0])
                cv_map[h_int] = {
                    "rmse": float(item["RMSE"]),
                    "mae": float(item["MAE"]),
                }
            except Exception:
                pass

    if not cv_map:
        return {"rmse": float("nan"), "mae": float("nan")}

    sorted_keys = sorted(cv_map.keys())
    covering_keys = [k for k in sorted_keys if k >= horizon_days]
    selected_h = covering_keys[0] if covering_keys else sorted_keys[-1]
    return cv_map[selected_h]


def get_horizon_diagnostics(horizon_days: int) -> Dict[str, Any]:
    """
    Retorna metadados completos de validação para o horizonte (em dias desde a última observação),
    incluindo quantil empírico de 80% (q80_abs_err) e flag explícita de extrapolação além do domínio CV (ML-05, ML-07).
    """
    metrics = load_metrics_report()
    max_val_h = int(metrics.get("horizonte_maximo_validado_dias", 45))
    op_list = metrics.get("metricas_horizontes_operacionais", [])
    base_err = get_error_for_horizon(horizon_days)

    q80_map: Dict[int, float] = {}
    n_pairs_map: Dict[int, int] = {}
    for item in op_list:
        try:
            h_int = int(str(item.get("horizonte_alvo", "")).split()[0])
            if "q80_abs_err" in item:
                q80_map[h_int] = float(item["q80_abs_err"])
            if "n_pares" in item:
                n_pairs_map[h_int] = int(item["n_pares"])
        except Exception:
            pass

    if q80_map:
        sorted_keys = sorted(q80_map.keys())
        covering_keys = [k for k in sorted_keys if k >= horizon_days]
        selected_h = covering_keys[0] if covering_keys else sorted_keys[-1]
        q80_val = q80_map[selected_h]
        n_pairs = n_pairs_map.get(selected_h, 0)
    else:
        selected_h = horizon_days
        q80_val = None
        n_pairs = 0

    return {
        "rmse": base_err["rmse"],
        "mae": base_err["mae"],
        "validatedHorizonDays": int(selected_h),
        "maxValidatedHorizonDays": max_val_h,
        "isExtrapolated": bool(horizon_days > max_val_h),
        "q80AbsErr": q80_val,
        "nValidationPairs": n_pairs,
    }


def load_prophet_model(force_reload: bool = False):
    global _cached_model, _cached_model_mtime
    if not force_reload and _cached_model is not None:
        if _cached_model_mtime is not None and os.path.exists(MODEL_JSON_PATH):
            if os.path.getmtime(MODEL_JSON_PATH) == _cached_model_mtime:
                return _cached_model
        elif _cached_model_mtime is None:
            return _cached_model

    if not os.path.exists(MODEL_JSON_PATH):
        raise FileNotFoundError(f"Modelo Prophet não encontrado em: {MODEL_JSON_PATH}")
    mtime = os.path.getmtime(MODEL_JSON_PATH)
    with open(MODEL_JSON_PATH, "r", encoding="utf-8") as f:
        _cached_model = model_from_json(json.load(f))
        _cached_model_mtime = mtime
        logger.info("Modelo Prophet NDCI carregado com sucesso da memória persistente.")
    return _cached_model


def record_predictions_for_calibration(
    predictions: List[Dict[str, Any]],
    model_version: str = "v2.0-prophet-ar1-qa20m",
    trained_through: str = "",
) -> None:
    """
    Registra as previsões geradas em arquivo local de forma transacional/atômica para monitoramento
    contínuo de resíduos (ML-08), preservando registros anteriores em caso de falha de leitura.
    """
    try:
        history: Dict[str, Any] = {}
        if os.path.exists(PREDICTIONS_HISTORY_PATH):
            try:
                with open(PREDICTIONS_HISTORY_PATH, "r", encoding="utf-8") as f:
                    loaded = json.load(f)
                    if isinstance(loaded, dict):
                        history = loaded
            except Exception as read_err:
                logger.warning(f"Histórico de previsões ilegível; abortando sobrescrita para evitar perda: {read_err}")
                return

        now_str = datetime.now(timezone.utc).isoformat()
        changed = False
        for p in predictions:
            date_key = p["date"]
            if date_key not in history:
                history[date_key] = {
                    "date": date_key,
                    "first_predicted_at": now_str,
                    "model_version": model_version,
                    "trained_through": trained_through,
                    "days_from_obs": p.get("daysFromObs", 0),
                    "yhat": p["yhat"],
                    "yhat_lower": p["yhat_lower"],
                    "yhat_upper": p["yhat_upper"],
                    "type": p.get("type", "forecast"),
                    "actual_y": None,
                    "error": None,
                }
                changed = True

        if changed:
            _atomic_write_json(history, PREDICTIONS_HISTORY_PATH)
    except Exception as e:
        logger.warning(f"Erro ao salvar histórico de monitoramento de previsões: {e}")


def evaluate_calibration_residuals() -> Dict[str, Any]:
    """
    Compara o histórico de previsões gravadas com os novos dados de satélite observados no CSV,
    separando estimativas retrospectivas (nowcast) de previsões prospectivas (forecast) (ML-08).
    """
    if not os.path.exists(PREDICTIONS_HISTORY_PATH) or not os.path.exists(DATA_RAW_CSV_PATH):
        return {"calibrated_points": 0, "status": "Monitoramento de resíduos ativo (aguardando novas cenas limpas)"}

    try:
        with open(PREDICTIONS_HISTORY_PATH, "r", encoding="utf-8") as f:
            history = json.load(f)

        df_obs = pd.read_csv(DATA_RAW_CSV_PATH)
        df_obs["ds"] = pd.to_datetime(df_obs["ds"]).dt.strftime("%Y-%m-%d")
        obs_map = dict(zip(df_obs["ds"], df_obs["y"]))

        residuals_all: List[float] = []
        residuals_forecast: List[float] = []
        residuals_nowcast: List[float] = []
        updated = False

        for date_str, item in history.items():
            if not isinstance(item, dict):
                continue
            if date_str in obs_map and item.get("actual_y") is None:
                actual = float(obs_map[date_str])
                item["actual_y"] = round(actual, 5)
                res = abs(actual - float(item["yhat"]))
                item["error"] = round(res, 4)
                updated = True

            if item.get("actual_y") is not None:
                res_val = abs(float(item["actual_y"]) - float(item["yhat"]))
                residuals_all.append(res_val)
                if item.get("type") == "forecast":
                    residuals_forecast.append(res_val)
                else:
                    residuals_nowcast.append(res_val)

        if updated:
            _atomic_write_json(history, PREDICTIONS_HISTORY_PATH)

        if residuals_all:
            return {
                "calibrated_points": len(residuals_all),
                "forecast_points_confronted": len(residuals_forecast),
                "nowcast_points_confronted": len(residuals_nowcast),
                "live_mae": round(float(np.mean(residuals_all)), 4),
                "live_rmse": round(float(np.sqrt(np.mean(np.square(residuals_all)))), 4),
                "status": "Monitoramento de resíduos atualizado com passagens Sentinel-2",
            }
        return {
            "calibrated_points": 0,
            "forecast_points_confronted": 0,
            "nowcast_points_confronted": 0,
            "status": "Aguardando passagens limpas posteriores às datas previstas para confronto",
        }
    except Exception as e:
        logger.error(f"Erro ao avaliar resíduos de monitoramento: {e}")
        return {"calibrated_points": 0, "status": "Erro ao ler histórico de monitoramento"}


def _classify_ndci_level(
    val: float,
    low_thr: float = -0.05,
    attention_thr: float = 0.04,
    alert_thr: float = 0.12,
    crit_thr: float = 0.30,
) -> str:
    if val >= crit_thr:
        return "critical"
    if val >= alert_thr:
        return "alert"
    if val >= attention_thr:
        return "attention"
    if val >= low_thr:
        return "moderate"
    return "low"


def get_ndci_forecast(history_days: int = 90, forecast_days: int = 7) -> Dict[str, Any]:
    """
    Gera a previsão de NDCI com:
      - Assimilação causal AR(1) da última observação satelital (ML-06), garantindo continuidade física
        entre o último ponto medido pelo Sentinel-2 e a projeção de curto prazo (nowcasting + forecasting).
      - Bandas de incerteza de 80% calibradas empiricamente pelos quantis dos resíduos da validação cruzada
        por horizonte (ML-07).
      - Metadados explícitos de domínio temporal validado (até 45 dias) e separação entre risco observado,
        nowcast atual e risco futuro projetado (ML-05, ML-09).
    """
    model = load_prophet_model()
    metrics_report = load_metrics_report()

    csv_to_use = DATA_RAW_CSV_PATH if os.path.exists(DATA_RAW_CSV_PATH) else DATA_CLEAN_CSV_PATH
    if not os.path.exists(csv_to_use):
        raise FileNotFoundError(f"Dados históricos de NDCI não encontrados em: {csv_to_use}")

    df_obs = pd.read_csv(csv_to_use)
    df_obs["ds"] = pd.to_datetime(df_obs["ds"])
    df_obs = df_obs.sort_values("ds").reset_index(drop=True)

    last_record_date = df_obs["ds"].max()
    today_date = pd.to_datetime(datetime.now().strftime("%Y-%m-%d"))

    model_trained_through = str(metrics_report.get("trained_through") or last_record_date.strftime("%Y-%m-%d"))
    model_version = str(metrics_report.get("versao_modelo") or "v2.0-prophet-ar1-qa20m")
    tau_days = float(metrics_report.get("assimilacao_ar1_tau_dias", 0.0))
    max_validated_horizon = int(metrics_report.get("horizonte_maximo_validado_dias", 45))

    has_gap = last_record_date < today_date
    gap_days = int((today_date - last_record_date).days) if has_gap else 0

    start_pred_date = last_record_date + pd.Timedelta(days=1)
    end_pred_date = today_date + pd.Timedelta(days=forecast_days)

    pred_dates = pd.date_range(start=start_pred_date, end=end_pred_date, freq="D")
    pred_df = pd.DataFrame({"ds": pred_dates})

    pred_res = model.predict(pred_df)

    meses_pt = {
        1: "Janeiro", 2: "Fevereiro", 3: "Março", 4: "Abril",
        5: "Maio", 6: "Junho", 7: "Julho", 8: "Agosto",
        9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro",
    }

    forecast_points: List[Dict[str, Any]] = []
    future_values: List[float] = []
    future_upper_values: List[float] = []
    nowcast_values: List[float] = []

    last_obs_row = df_obs.iloc[-1]
    last_obs_val = float(round(last_obs_row["y"], 4))

    forecast_points.append({
        "date": last_record_date.strftime("%Y-%m-%d"),
        "displayDate": last_record_date.strftime("%d/%m"),
        "fullDate": f"{last_record_date.day:02d} de {meses_pt[last_record_date.month]} de {last_record_date.year}",
        "timestamp": int(last_record_date.timestamp() * 1000),
        "isAnchor": True,
        "isGapFill": False,
        "isToday": bool(last_record_date == today_date),
        "isFuture": False,
        "type": "anchor",
        "yhat": last_obs_val,
        "yhat_lower": last_obs_val,
        "yhat_upper": last_obs_val,
        "rmse": 0.0,
        "mae": 0.0,
        "daysFromObs": 0,
        "statusLabel": "Última medição do satélite",
    })

    for _, row in pred_res.iterrows():
        d = row["ds"]
        is_today = d == today_date
        is_gap = d <= today_date
        is_future = d > today_date

        days_from_obs = int((d - last_record_date).days)
        h_diag = get_horizon_diagnostics(days_from_obs)
        error_metrics = {"rmse": h_diag["rmse"], "mae": h_diag["mae"]}

        raw_yhat = float(row["yhat"])
        if tau_days > 0.0:
            w_assim = float(np.exp(-days_from_obs / tau_days))
            assim_val = float(np.clip(w_assim * float(last_obs_row["y"]) + (1.0 - w_assim) * raw_yhat, -1.0, 1.0))
        else:
            assim_val = raw_yhat

        yhat = float(round(assim_val, 4))

        # Se houver quantil empírico de 80% validado na CV para o horizonte, calibra a banda em torno de yhat (ML-07)
        if h_diag["q80AbsErr"] is not None:
            half_width = float(h_diag["q80AbsErr"])
            yhat_lower = float(round(max(-1.0, assim_val - half_width), 4))
            yhat_upper = float(round(min(1.0, assim_val + half_width), 4))
        else:
            yhat_lower = float(round(row["yhat_lower"], 4))
            yhat_upper = float(round(row["yhat_upper"], 4))

        if is_future:
            future_values.append(yhat)
            future_upper_values.append(yhat_upper)
        else:
            nowcast_values.append(yhat)

        if is_today:
            status_label = "Estimativa para hoje"
            point_type = "today"
        elif is_gap:
            status_label = "Estimativa em período nublado"
            point_type = "nowcast"
        else:
            status_label = "Previsão futura"
            point_type = "forecast"

        full_str = f"{d.day:02d} de {meses_pt[d.month]} de {d.year}"

        forecast_points.append({
            "date": d.strftime("%Y-%m-%d"),
            "displayDate": d.strftime("%d/%m"),
            "fullDate": full_str,
            "timestamp": int(d.timestamp() * 1000),
            "isAnchor": False,
            "isGapFill": bool(is_gap),
            "isToday": bool(is_today),
            "isFuture": bool(is_future),
            "type": point_type,
            "yhat": yhat,
            "yhat_lower": yhat_lower,
            "yhat_upper": yhat_upper,
            "rmse": error_metrics["rmse"],
            "mae": error_metrics["mae"],
            "daysFromObs": days_from_obs,
            "statusLabel": status_label,
        })

    record_predictions_for_calibration(
        forecast_points[1:],
        model_version=model_version,
        trained_through=model_trained_through,
    )
    calibration_status = evaluate_calibration_residuals()

    max_forecast_yhat = max(future_values) if future_values else (forecast_points[-1]["yhat"] if forecast_points else 0.0)
    max_forecast_upper = max(future_upper_values) if future_upper_values else max_forecast_yhat
    current_nowcast_yhat = nowcast_values[-1] if nowcast_values else last_obs_val

    LOW_THRESHOLD = -0.05
    ATTENTION_THRESHOLD = 0.04
    ALERT_THRESHOLD = 0.12
    CRITICAL_THRESHOLD = 0.30

    observed_level = _classify_ndci_level(
        last_obs_val, LOW_THRESHOLD, ATTENTION_THRESHOLD, ALERT_THRESHOLD, CRITICAL_THRESHOLD
    )
    nowcast_level = _classify_ndci_level(
        current_nowcast_yhat, LOW_THRESHOLD, ATTENTION_THRESHOLD, ALERT_THRESHOLD, CRITICAL_THRESHOLD
    )

    if max_forecast_yhat >= CRITICAL_THRESHOLD:
        risk_level = "critical"
        risk_label = "Crítico (≥ +0.30)"
        risk_color = "#EF4444"
        recommendation = (
            f"No horizonte de +{forecast_days} dias, a previsão atinge o patamar Crítico (≥ +0.30 NDCI), "
            "indicando alta probabilidade de floração intensa de algas ou pico de eutrofização. "
            "Recomenda-se inspeção imediata na captação, coleta para análise laboratorial de clorofila-a e "
            "contagem de cianobactérias, além de ajuste preventivo nas etapas de tratamento da ETA."
        )
        alert_triggered = True
    elif max_forecast_yhat >= ALERT_THRESHOLD:
        risk_level = "alert"
        risk_label = "Alerta (+0.12 a +0.30)"
        risk_color = "#EE7A3B"
        recommendation = (
            f"No horizonte de +{forecast_days} dias, a previsão atinge o patamar de Alerta (+0.12 a +0.30 NDCI), "
            "indicando crescimento acentuado de algas no reservatório. Recomenda-se reforçar a amostragem na "
            "captação, monitorar turbidez e preparar ajustes operacionais na ETA."
        )
        alert_triggered = True
    elif max_forecast_yhat >= ATTENTION_THRESHOLD:
        risk_level = "attention"
        risk_label = "Atenção (+0.04 a +0.12)"
        risk_color = "#D97706"
        recommendation = (
            f"No horizonte de +{forecast_days} dias, a previsão encontra-se no patamar de Atenção (+0.04 a +0.12 NDCI), "
            "sinalizando presença moderada a crescente de algas. Recomenda-se acompanhamento preventivo nas "
            "coletas de rotina da água bruta."
        )
        alert_triggered = True
    elif max_forecast_yhat >= LOW_THRESHOLD:
        risk_level = "moderate"
        risk_label = "Moderado (-0.05 a +0.04)"
        risk_color = "#0D9488"
        recommendation = (
            f"No horizonte de +{forecast_days} dias, os níveis previstos permanecem no patamar Moderado (-0.05 a +0.04 NDCI), "
            "dentro da faixa normal do reservatório e sem indícios de floração de algas. Manter rotina normal de monitoramento."
        )
        alert_triggered = False
    else:
        risk_level = "low"
        risk_label = "Baixo (< -0.05)"
        risk_color = "#5C9234"
        recommendation = (
            f"No horizonte de +{forecast_days} dias, os níveis previstos permanecem no patamar Baixo (< -0.05 NDCI), "
            "indicando baixa presença de algas na superfície. Manter a operação normal da ETA."
        )
        alert_triggered = False

    effective_max_horizon = gap_days + int(forecast_days)
    # Métricas do resumo refletem o horizonte solicitado na validação cruzada
    metrics_cv = get_error_for_horizon(forecast_days)
    effective_horizon_diag = get_horizon_diagnostics(effective_max_horizon)

    return {
        "summary": {
            "latestObservedDate": last_record_date.strftime("%Y-%m-%d"),
            "latestObservedDisplayDate": last_record_date.strftime("%d/%m/%Y"),
            "trainedThrough": model_trained_through,
            "todayDate": today_date.strftime("%Y-%m-%d"),
            "todayDisplayDate": today_date.strftime("%d/%m/%Y"),
            "gapDays": gap_days,
            "hasGap": has_gap,
            "latestNdci": last_obs_val,
            "observedAlertLevel": observed_level,
            "nowcastNdci": float(round(current_nowcast_yhat, 4)),
            "nowcastAlertLevel": nowcast_level,
            "forecastHorizonDays": forecast_days,
            "effectiveHorizonFromObsDays": effective_max_horizon,
            "maxValidatedHorizonDays": max_validated_horizon,
            "isHorizonExtrapolated": bool(effective_max_horizon > max_validated_horizon),
            "targetForecastDate": end_pred_date.strftime("%Y-%m-%d"),
            "targetForecastDisplayDate": end_pred_date.strftime("%d/%m/%Y"),
            "maxPredictedNdci": float(round(max_forecast_yhat, 4)),
            "maxPredictedUpperNdci": float(round(max_forecast_upper, 4)),
            "alertLevel": risk_level,
            "alertLabel": risk_label,
            "alertColor": risk_color,
            "alertTriggered": alert_triggered,
            "thresholdAlert": ALERT_THRESHOLD,
            "thresholdCritical": CRITICAL_THRESHOLD,
            "recommendation": recommendation,
        },
        "metrics": {
            "model": "Meta Prophet (Fourier Anual Ordem 8 + Assimilação Causal AR(1))",
            "modelVersion": model_version,
            "trainedThrough": model_trained_through,
            "validationHorizon": f"{forecast_days} dias",
            "effectiveValidationHorizon": f"{effective_horizon_diag['validatedHorizonDays']} dias",
            "maxValidatedHorizonDays": max_validated_horizon,
            "isExtrapolated": effective_horizon_diag["isExtrapolated"],
            "rmse": metrics_cv["rmse"],
            "mae": metrics_cv["mae"],
            "effectiveRmse": effective_horizon_diag["rmse"],
            "effectiveMae": effective_horizon_diag["mae"],
            "samplingPoints": 270,
            "minValidPixels": 81,
            "samplingCrs": "EPSG:32723",
            "samplingScaleMeters": 20,
            "samplingDiameterMeters": 350,
            "samplingRadiusMeters": 175,
            "centerCoordinates": [-22.530116459790744, -44.5639148196765],
            "satellite": "Sentinel-2 MSI Harmonized SR",
            "calibration": calibration_status,
        },
        "forecastPoints": forecast_points,
        "timeline": forecast_points,
    }
