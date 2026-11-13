import os
import sys
import time
import tempfile
import threading
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
import pandas as pd
import ee

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from gee_service import (
    DEFAULT_PROJECT,
    DEFAULT_LAT as FUNIL_LAT,
    DEFAULT_LON as FUNIL_LON,
    BUFFER_RADIUS_METERS as BUFFER_METERS,
    NATIVE_CRS_UTM23S,
    NATIVE_SCALE_METERS,
    MAX_WATER_PIXELS_20M,
    MIN_VALID_PIXELS_20M,
    MAX_SCENE_CLOUDY_PCT,
    EXTRACTOR_VERSION,
    init_gee,
    get_funil_water_buffer,
    calculate_indices,
)

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(BACKEND_DIR)
CSV_RAW_PATH = os.path.join(BASE_DIR, "prophet", "dados_ndci_funil.csv")
CSV_CLEAN_PATH = os.path.join(BASE_DIR, "prophet", "dados_ndci_limpos.csv")

LOOKBACK_DAYS = 14  # Janela móvel para capturar cenas recém-disponibilizadas ou reprocessadas no GEE

_last_sync_time = 0.0
_cached_data = None
CACHE_TTL = 7200  # 2 horas de cache em memória para não sobrecarregar a cota GEE
_gee_sync_lock = threading.Lock()


def _init_gee(project: str = DEFAULT_PROJECT) -> None:
    init_gee(project)


def deduplicate_daily_scenes(df: pd.DataFrame) -> pd.DataFrame:
    """
    Regra determinística para consolidação diária (1 registro por data 'ds'):
    Quando há sobreposição de órbitas/tiles do Sentinel-2 no mesmo dia sobre o Reservatório do Funil,
    seleciona a passagem de melhor qualidade radiométrica na lâmina d'água:
      1. Maior contagem de pixels válidos de água em 20m ('points_count' decrescente);
      2. Menor percentual global de nuvens da cena ('cloudy_pct' crescente);
      3. Identificador de processamento mais recente ('scene_id' decrescente).
    Evita soma espúria de pixels repetidos (ex.: 44+44=88) e média aritmética incorreta de desvios-padrão.
    """
    if df.empty:
        return df.copy()

    work = df.copy()
    work["ds_str"] = pd.to_datetime(work["ds"]).dt.strftime("%Y-%m-%d")
    if "cloudy_pct" not in work.columns:
        work["cloudy_pct"] = 0.0
    else:
        work["cloudy_pct"] = pd.to_numeric(work["cloudy_pct"], errors="coerce").fillna(0.0)

    if "scene_id" not in work.columns:
        work["scene_id"] = ""
    else:
        work["scene_id"] = work["scene_id"].fillna("").astype(str)

    if "points_count" not in work.columns:
        work["points_count"] = MAX_WATER_PIXELS_20M
    else:
        work["points_count"] = pd.to_numeric(work["points_count"], errors="coerce").fillna(0).astype(int)

    if "pixel_fraction" not in work.columns:
        work["pixel_fraction"] = (work["points_count"] / float(MAX_WATER_PIXELS_20M)).round(4)

    if "extractor_version" not in work.columns:
        work["extractor_version"] = EXTRACTOR_VERSION

    work = work.sort_values(
        by=["ds_str", "points_count", "cloudy_pct", "scene_id"],
        ascending=[True, False, True, False],
        kind="mergesort"
    ).drop_duplicates(subset=["ds_str"], keep="first")

    work["ds"] = pd.to_datetime(work["ds_str"])
    work = work.drop(columns=["ds_str"]).sort_values("ds").reset_index(drop=True)
    return work


def extract_ndci_series_from_gee(
    start_date: str,
    end_date: str,
    project: str = DEFAULT_PROJECT
) -> pd.DataFrame:
    """
    Extrai a série temporal de NDCI diretamente do catálogo COPERNICUS/S2_SR_HARMONIZED no GEE
    entre start_date (inclusivo) e end_date (exclusivo, padrão ee.ImageCollection.filterDate).

    Suporte espacial e QA Óptica:
    - Polígono circular de 175m de raio (350m de diâmetro) centrado em (-22.530116, -44.563914).
    - Redução em grade nativa UTM Zona 23S (EPSG:32723) com resolução de 20m (270 pixels máximos).
    - Máscara por pixel: QA60 (bits 10/11 == 0) + MSK_CLDPRB < 20% + SCL (6 ou 4/5 em água) + NDWI > 0.05 + (B5+B4) > 100.
    - Filtro de cobertura mínima por cena: points_count >= 81 (>= 30% dos 270 pixels de água livres de nuvens).
    """
    _init_gee(project)
    buffer = get_funil_water_buffer()

    def _reduce_scene(image: ee.Image) -> ee.Feature:
        masked_img = calculate_indices(image)
        ndci = masked_img.select("NDCI")
        stats = ndci.reduceRegion(
            reducer=(
                ee.Reducer.mean()
                .combine(ee.Reducer.stdDev(), "", True)
                .combine(ee.Reducer.count(), "", True)
            ),
            geometry=buffer,
            crs=NATIVE_CRS_UTM23S,
            scale=NATIVE_SCALE_METERS,
            maxPixels=1_000_000
        )
        return ee.Feature(None, {
            "date": image.date().format("YYYY-MM-dd"),
            "scene_id": image.get("system:index"),
            "cloudy_pct": image.get("CLOUDY_PIXEL_PERCENTAGE"),
            "ndci_mean": stats.get("NDCI_mean"),
            "ndci_stdDev": stats.get("NDCI_stdDev"),
            "points_count": stats.get("NDCI_count"),
        })

    col = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(buffer)
        .filterDate(start_date, end_date)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", MAX_SCENE_CLOUDY_PCT))
        .map(_reduce_scene)
        .filter(ee.Filter.notNull(["ndci_mean"]))
        .filter(ee.Filter.gte("points_count", MIN_VALID_PIXELS_20M))
    )

    features = col.getInfo().get("features", [])
    rows: List[Dict[str, Any]] = []
    for f in features:
        p = f.get("properties", {})
        mean_val = p.get("ndci_mean")
        count_val = int(p.get("points_count") or 0)
        if mean_val is None or count_val < MIN_VALID_PIXELS_20M:
            continue
        std_val = p.get("ndci_stdDev")
        cloudy_val = p.get("cloudy_pct")
        rows.append({
            "ds": pd.to_datetime(p["date"]),
            "y": float(mean_val),
            "std_dev": float(std_val) if std_val is not None else 0.0,
            "points_count": count_val,
            "pixel_fraction": round(count_val / float(MAX_WATER_PIXELS_20M), 4),
            "cloudy_pct": round(float(cloudy_val), 4) if cloudy_val is not None else 0.0,
            "scene_id": str(p.get("scene_id") or ""),
            "extractor_version": EXTRACTOR_VERSION,
        })

    if not rows:
        return pd.DataFrame(columns=[
            "ds", "y", "std_dev", "points_count",
            "pixel_fraction", "cloudy_pct", "scene_id", "extractor_version"
        ])

    return deduplicate_daily_scenes(pd.DataFrame(rows))


def atomic_write_csv(df: pd.DataFrame, target_path: str) -> None:
    """
    Salva DataFrame de forma atômica usando arquivo temporário no mesmo diretório e os.replace,
    evitando corrupção por leitura concorrente ou interrupção no meio da escrita.
    """
    target_dir = os.path.dirname(os.path.abspath(target_path))
    os.makedirs(target_dir, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(prefix=".ndci_sync_", suffix=".csv.tmp", dir=target_dir)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as f:
            df.to_csv(f, index=False)
        os.replace(tmp_path, target_path)
    except Exception:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass
        raise


def sync_ndci_data(force: bool = False) -> Dict[str, Any]:
    """
    Sincroniza incrementalmente a série temporal bruta de NDCI do Reservatório do Funil com o GEE.
    Protegida por lock (_gee_sync_lock) para evitar corrida entre chamadas concorrentes (API-03).
    """
    with _gee_sync_lock:
        return _sync_ndci_data_unlocked(force=force)


def _sync_ndci_data_unlocked(force: bool = False) -> Dict[str, Any]:
    """
    Implementação interna de sync_ndci_data:
    - Reprocessa uma janela móvel de LOOKBACK_DAYS (14 dias) até hoje + 1 dia (data final exclusiva).
    - Aplica a mesma regra determinística de deduplicação diária da extração histórica offline.
    - NUNCA sobrescreve CSV_CLEAN_PATH (dados_ndci_limpos.csv), mantendo a separação estrita entre
      base bruta observada e base processada pelo pipeline do modelo (GEO-05).
    """
    global _last_sync_time, _cached_data

    now = time.time()
    if not force and _cached_data is not None and (now - _last_sync_time) < CACHE_TTL:
        logger.info("[GEE SYNC] Retornando dados em cache da memória (TTL 2 horas ativo).")
        return _cached_data

    if not os.path.exists(CSV_RAW_PATH):
        raise FileNotFoundError(f"Arquivo base não encontrado: {CSV_RAW_PATH}")

    df = pd.read_csv(CSV_RAW_PATH)
    df = deduplicate_daily_scenes(df)

    latest_date_in_db = df["ds"].max()
    today = datetime.now()

    new_records_added = 0
    updated_records_count = 0
    sync_status = "checked"
    message = "Base histórica carregada."

    if force or (today - latest_date_in_db).days >= 1:
        try:
            start_query = (latest_date_in_db - timedelta(days=LOOKBACK_DAYS)).strftime("%Y-%m-%d")
            end_query = (today + timedelta(days=1)).strftime("%Y-%m-%d")

            logger.info(
                f"[GEE SYNC] Consultando passagens Sentinel-2 entre {start_query} e {end_query} (fim exclusivo)..."
            )

            df_recent = extract_ndci_series_from_gee(start_date=start_query, end_date=end_query)
            logger.info(
                f"[GEE SYNC] Datas diárias válidas (>= {MIN_VALID_PIXELS_20M} px) obtidas na janela: {len(df_recent)}"
            )

            if not df_recent.empty:
                before_map = {
                    row["ds"].strftime("%Y-%m-%d"): (
                        round(float(row["y"]), 6),
                        int(row["points_count"]),
                        str(row.get("scene_id", ""))
                    )
                    for _, row in df.iterrows()
                }
                existing_dates = set(before_map.keys())

                df_combined = deduplicate_daily_scenes(pd.concat([df, df_recent], ignore_index=True))

                after_map = {
                    row["ds"].strftime("%Y-%m-%d"): (
                        round(float(row["y"]), 6),
                        int(row["points_count"]),
                        str(row.get("scene_id", ""))
                    )
                    for _, row in df_combined.iterrows()
                }

                new_dates = set(after_map.keys()) - existing_dates
                new_records_added = len(new_dates)
                updated_records_count = sum(
                    1 for d_key in (set(after_map.keys()) & existing_dates)
                    if after_map[d_key] != before_map[d_key]
                )

                if new_records_added > 0 or updated_records_count > 0:
                    df = df_combined
                    df_save = df.copy()
                    df_save["ds"] = df_save["ds"].dt.strftime("%Y-%m-%d")
                    # Persistência atômica EXCLUSIVA na base bruta (GEO-05: não sobrescreve CSV_CLEAN_PATH)
                    atomic_write_csv(df_save, CSV_RAW_PATH)
                    sync_status = "updated"
                    message = (
                        f"Dados de satélite atualizados: {new_records_added} nova(s) leitura(s) incorporada(s)!"
                    )
                    logger.info(f"[GEE SYNC] {message}")
                else:
                    sync_status = "checked"
                    message = (
                        f"Satélite verificado até {today.strftime('%d/%m/%Y')}. "
                        f"Última imagem sem nuvens em {latest_date_in_db.strftime('%d/%m/%Y')}."
                    )
                    logger.info(f"[GEE SYNC] {message}")
            else:
                sync_status = "checked"
                message = (
                    f"Satélite verificado até {today.strftime('%d/%m/%Y')}. "
                    f"Última imagem sem nuvens em {latest_date_in_db.strftime('%d/%m/%Y')}."
                )
                logger.info(f"[GEE SYNC] {message}")

        except Exception as e:
            sync_status = "error"
            logger.error(f"[GEE SYNC] Erro ao sincronizar com Google Earth Engine: {e}")
            message = f"Sincronização em nuvem indisponível no momento ({str(e)}). Exibindo dados salvos localmente."

    records = []
    for _, row in df.iterrows():
        d_val = row["ds"]
        date_str = d_val.strftime("%Y-%m-%d") if hasattr(d_val, "strftime") else str(d_val)[:10]
        year_val = int(date_str[:4]) if len(date_str) >= 4 and date_str[:4].isdigit() else 2026
        pts_cnt = int(row["points_count"]) if pd.notnull(row.get("points_count")) else MAX_WATER_PIXELS_20M
        px_frac = (
            round(float(row["pixel_fraction"]), 4)
            if pd.notnull(row.get("pixel_fraction"))
            else round(pts_cnt / float(MAX_WATER_PIXELS_20M), 4)
        )
        records.append({
            "date": date_str,
            "year": year_val,
            "ndci": round(float(row["y"]), 5),
            "stdDev": round(float(row["std_dev"]), 5) if pd.notnull(row.get("std_dev")) else 0.02,
            "pointsCount": pts_cnt,
            "pixelFraction": px_frac,
            "cloudyPct": round(float(row["cloudy_pct"]), 2) if pd.notnull(row.get("cloudy_pct")) else 0.0,
            "sceneId": str(row["scene_id"]) if pd.notnull(row.get("scene_id")) else "",
        })

    last_record_date = records[-1]["date"] if records else ""

    result = {
        "total": len(records),
        "latestObservedDate": last_record_date,
        "lastSyncTime": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "syncStatus": sync_status,
        "newRecords": new_records_added,
        "updatedRecords": updated_records_count,
        "extractorVersion": EXTRACTOR_VERSION,
        "spatialSupport": {
            "centerLat": FUNIL_LAT,
            "centerLon": FUNIL_LON,
            "radiusMeters": BUFFER_METERS,
            "crs": NATIVE_CRS_UTM23S,
            "scaleMeters": NATIVE_SCALE_METERS,
            "maxWaterPixels": MAX_WATER_PIXELS_20M,
            "minValidPixels": MIN_VALID_PIXELS_20M,
        },
        "message": message,
        "items": records,
    }

    if sync_status != "error":
        _last_sync_time = now
        _cached_data = result
    return result

