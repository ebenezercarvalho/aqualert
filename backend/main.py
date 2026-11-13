import os
import sys
import asyncio
import logging
import threading
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, HTTPException, Request, Query, BackgroundTasks, Header
from fastapi.middleware.cors import CORSMiddleware
import httpx
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from cachetools import TTLCache

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from gee_service import get_ndci_tiles, DEFAULT_LON, DEFAULT_LAT, _load_env_file
from forecast_service import (
    get_ndci_forecast,
    MODEL_JSON_PATH,
    DATA_RAW_CSV_PATH,
    METRICS_JSON_PATH,
    MAX_OPERATIONAL_FORECAST_DAYS,
)
from gee_sync_service import sync_ndci_data
from scraper_scheduler import scraper_loop, executar_scraper_subprocess, get_scheduler_status

_load_env_file()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [%(levelname)s] - %(message)s")
logger = logging.getLogger(__name__)

# Rate limiter setup
limiter = Limiter(key_func=get_remote_address)

# Cache setup (TTL 2 horas para Oracle/Painel alinhado ao scraper, 2 horas para GEE map tiles, 1h para forecast)
oracle_cache = TTLCache(maxsize=50, ttl=7200)
map_cache = TTLCache(maxsize=50, ttl=7200)
forecast_cache = TTLCache(maxsize=40, ttl=3600)
_cache_lock = threading.Lock()


def _safe_mtime(path: str) -> int:
    try:
        return int(os.path.getmtime(path))
    except OSError:
        return 0


def _build_forecast_cache_key(history_days: int, forecast_days: int) -> str:
    """
    Constrói chave de cache determinística para o Prophet (API-02):
    Inclui data civil atual (para virada diária do Nowcasting), mtime do CSV bruto e mtime do modelo.
    """
    today_str = datetime.now().strftime("%Y-%m-%d")
    raw_mtime = _safe_mtime(DATA_RAW_CSV_PATH)
    model_mtime = _safe_mtime(MODEL_JSON_PATH)
    return f"forecast_{history_days}_{forecast_days}_{today_str}_{raw_mtime}_{model_mtime}"


def _verify_optional_admin_token(x_admin_token: Optional[str]) -> None:
    """
    Verifica token administrativo opcional (SEC-02).
    No MVP local do Hackathon, se ADMIN_API_TOKEN estiver vazio no .env, permite execução direta
    sem bloquear testes ou automações do frontend.
    """
    expected_token = os.getenv("ADMIN_API_TOKEN", "").strip()
    if expected_token and x_admin_token != expected_token:
        raise HTTPException(
            status_code=403,
            detail="Token administrativo inválido ou ausente para esta operação.",
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[STARTUP] Inicializando agendador periódico do Scraper CETESB (intervalo: 2 horas)...")
    scraper_task = asyncio.create_task(scraper_loop(oracle_cache_ref=oracle_cache))
    yield
    scraper_task.cancel()
    await asyncio.gather(scraper_task, return_exceptions=True)
    logger.info("[SHUTDOWN] Agendador periódico encerrado com sucesso.")


app = FastAPI(
    title="Synapsis EcoStream API",
    description="API para monitoramento de qualidade da água (CETESB/ORDS) e sensoriamento remoto (Sentinel-2/GEE)",
    version="1.2.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Configuração CORS segura e compatível com a especificação W3C (SEC-02)
_raw_cors = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173",
)
CORS_ORIGINS = [o.strip() for o in _raw_cors.split(",") if o.strip()] or ["*"]
ALLOW_CREDENTIALS = "*" not in CORS_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=ALLOW_CREDENTIALS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

ORDS_READ_URL = os.getenv("ORDS_READ_URL", "").strip()


def _get_local_demo_telemetry(offset: int = 0, limit: int = 100) -> dict:
    """
    Retorna conjunto de telemetria demonstrativa local da Estação CETESB EF26 - Queluz
    quando ORDS_READ_URL não está configurado no .env (modo MVP offline para o time).
    """
    sample_rows = [
        {"data_coleta_txt": "18/10/2026 22:00", "ph": 7.18, "oxigenio_dissolvido": 7.42, "condutividade": 92.0, "turbidez": 14.2, "temperatura": 23.4, "precipitacao": 0.0},
        {"data_coleta_txt": "18/10/2026 20:00", "ph": 7.21, "oxigenio_dissolvido": 7.55, "condutividade": 91.5, "turbidez": 13.8, "temperatura": 23.9, "precipitacao": 0.0},
        {"data_coleta_txt": "18/10/2026 18:00", "ph": 7.26, "oxigenio_dissolvido": 7.70, "condutividade": 91.0, "turbidez": 14.5, "temperatura": 24.6, "precipitacao": 0.2},
        {"data_coleta_txt": "18/10/2026 16:00", "ph": 7.30, "oxigenio_dissolvido": 7.85, "condutividade": 90.4, "turbidez": 15.1, "temperatura": 25.3, "precipitacao": 0.4},
        {"data_coleta_txt": "18/10/2026 14:00", "ph": 7.28, "oxigenio_dissolvido": 7.80, "condutividade": 90.8, "turbidez": 14.9, "temperatura": 25.5, "precipitacao": 0.0},
        {"data_coleta_txt": "18/10/2026 12:00", "ph": 7.22, "oxigenio_dissolvido": 7.62, "condutividade": 91.2, "turbidez": 13.6, "temperatura": 24.8, "precipitacao": 0.0},
        {"data_coleta_txt": "18/10/2026 10:00", "ph": 7.16, "oxigenio_dissolvido": 7.48, "condutividade": 92.1, "turbidez": 13.2, "temperatura": 23.7, "precipitacao": 0.0},
        {"data_coleta_txt": "18/10/2026 08:00", "ph": 7.12, "oxigenio_dissolvido": 7.35, "condutividade": 92.6, "turbidez": 12.9, "temperatura": 22.8, "precipitacao": 0.0},
        {"data_coleta_txt": "18/10/2026 06:00", "ph": 7.09, "oxigenio_dissolvido": 7.28, "condutividade": 93.0, "turbidez": 12.7, "temperatura": 22.3, "precipitacao": 0.0},
        {"data_coleta_txt": "18/10/2026 04:00", "ph": 7.10, "oxigenio_dissolvido": 7.31, "condutividade": 92.8, "turbidez": 13.0, "temperatura": 22.5, "precipitacao": 0.0},
        {"data_coleta_txt": "18/10/2026 02:00", "ph": 7.13, "oxigenio_dissolvido": 7.38, "condutividade": 92.4, "turbidez": 13.4, "temperatura": 22.9, "precipitacao": 0.0},
        {"data_coleta_txt": "18/10/2026 00:00", "ph": 7.15, "oxigenio_dissolvido": 7.40, "condutividade": 92.2, "turbidez": 13.7, "temperatura": 23.1, "precipitacao": 0.0},
    ]
    sliced = sample_rows[offset : offset + limit]
    return {"items": sliced, "hasMore": False, "count": len(sliced)}


@app.get("/health")
def health_check():
    """Retorna saúde operacional do backend e prontidão dos artefatos de IA e ETL (API-04)."""
    model_ready = os.path.exists(MODEL_JSON_PATH)
    raw_csv_ready = os.path.exists(DATA_RAW_CSV_PATH)
    metrics_ready = os.path.exists(METRICS_JSON_PATH)
    return {
        "status": "ok" if (model_ready and raw_csv_ready) else "degraded",
        "service": "Synapsis Backend",
        "artifacts": {
            "prophet_model_ready": model_ready,
            "ndci_raw_csv_ready": raw_csv_ready,
            "ndci_metrics_ready": metrics_ready,
        },
        "scraper_status": get_scheduler_status(),
    }


@app.get("/")
@app.get("/api/water-data")
@limiter.limit("300/minute")
async def get_water_quality(
    request: Request,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
):
    """
    Retorna os dados coletados de qualidade da água da estação CETESB (Queluz),
    armazenados no Oracle Autonomous Database via ORDS.
    """
    cache_key = f"ords_{offset}_{limit}"
    with _cache_lock:
        if cache_key in oracle_cache:
            logger.info(f"[CACHE] Hit para {cache_key}")
            return oracle_cache[cache_key]

    if not ORDS_READ_URL or "sua-instancia" in ORDS_READ_URL:
        logger.info("[ORACLE] ORDS_READ_URL não configurada no .env — retornando telemetria demonstrativa local.")
        demo_data = _get_local_demo_telemetry(offset=offset, limit=limit)
        with _cache_lock:
            oracle_cache[cache_key] = demo_data
        return demo_data

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            target_url = f"{ORDS_READ_URL}?offset={offset}&limit={limit}"
            logger.info(f"[ORACLE] Consultando {target_url}...")
            response = await client.get(target_url)
            response.raise_for_status()
            data = response.json()
            with _cache_lock:
                oracle_cache[cache_key] = data
            return data
        except httpx.HTTPStatusError as e:
            logger.error(f"Erro HTTP Oracle ORDS: {e}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Serviço Oracle ORDS retornou status {e.response.status_code}.",
            )
        except Exception as e:
            logger.error(f"Erro ao buscar dados na Oracle: {e}")
            raise HTTPException(
                status_code=502,
                detail="Não foi possível consultar a telemetria no Oracle Cloud ORDS no momento.",
            )


@app.get("/api/map/ndci")
@limiter.limit("30/minute")
async def get_ndci_map(
    request: Request,
    start_date: str = Query(default="2025-09-01"),
    end_date: str = Query(default="2025-09-25"),
    max: float = Query(default=0.15, alias="max"),
    lon: Optional[float] = Query(default=None),
    lat: Optional[float] = Query(default=None),
):
    """
    Gera o mapa de índice de clorofila (NDCI) com máscara de água (NDWI)
    usando Sentinel-2 via Google Earth Engine em worker thread (API-01) e retorna a URL de tiles XYZ.
    """
    target_lon = lon if lon is not None else DEFAULT_LON
    target_lat = lat if lat is not None else DEFAULT_LAT

    cache_key = f"ndci_{start_date}_{end_date}_{max}_{target_lon}_{target_lat}"
    with _cache_lock:
        if cache_key in map_cache:
            logger.info(f"[CACHE] Hit para mapa {cache_key}")
            return map_cache[cache_key]

    try:
        logger.info(f"[GEE] Gerando camada NDCI para {start_date} a {end_date} (max={max})...")
        tile_data = await asyncio.to_thread(
            get_ndci_tiles,
            start_date=start_date,
            end_date=end_date,
            max_sens=max,
            lon=target_lon,
            lat=target_lat,
        )
        with _cache_lock:
            map_cache[cache_key] = tile_data
        return tile_data
    except ValueError as ve:
        logger.warning(f"Aviso no processamento GEE: {ve}")
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"Erro no processamento do Google Earth Engine: {e}")
        raise HTTPException(
            status_code=502,
            detail="Falha ao processar camada espectral no Google Earth Engine.",
        )


@app.get("/api/forecast/ndci")
@limiter.limit("60/minute")
async def get_forecast(
    request: Request,
    history_days: int = Query(default=90, ge=5, le=3650),
    forecast_days: int = Query(default=15, ge=1, le=MAX_OPERATIONAL_FORECAST_DAYS, alias="days"),
):
    """
    Sincroniza incrementalmente novas passagens Sentinel-2 (se necessário) e retorna a série temporal
    com Nowcasting e Forecasting (Prophet + assimilação AR(1)) sem bloquear o event loop (API-01, API-02).
    """
    try:
        # Sincroniza incrementalmente com o catálogo GEE (respeita TTL de 2h em memória e lock em gee_sync_service)
        sync_res = await asyncio.to_thread(sync_ndci_data, False)
        if sync_res.get("syncStatus") == "updated":
            with _cache_lock:
                forecast_cache.clear()

        cache_key = _build_forecast_cache_key(history_days, forecast_days)
        with _cache_lock:
            if cache_key in forecast_cache:
                logger.info(f"[CACHE] Hit para previsão {cache_key}")
                return forecast_cache[cache_key]

        data = await asyncio.to_thread(
            get_ndci_forecast,
            history_days=history_days,
            forecast_days=forecast_days,
        )
        with _cache_lock:
            forecast_cache[cache_key] = data
        return data
    except ValueError as ve:
        logger.warning(f"Parâmetro inválido na previsão do Prophet: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Erro ao gerar previsão do Prophet: {e}")
        raise HTTPException(
            status_code=500,
            detail="Não foi possível processar a previsão NDCI no momento.",
        )


@app.get("/api/ndci/raw")
@limiter.limit("30/minute")
async def get_raw_ndci(
    request: Request,
    force: bool = Query(default=False, description="Forçar consulta imediata ao Google Earth Engine"),
    x_admin_token: Optional[str] = Header(default=None),
):
    """
    Retorna os pontos observados da série temporal do Sentinel-2 no Reservatório do Funil.
    Executa sincronização incremental em worker thread (API-01) e invalida o forecast_cache
    sempre que novas passagens ou revisões forem detectadas no GEE (API-02).
    """
    if force:
        _verify_optional_admin_token(x_admin_token)

    try:
        data = await asyncio.to_thread(sync_ndci_data, force)
        if data.get("syncStatus") == "updated":
            with _cache_lock:
                forecast_cache.clear()
                logger.info("[CACHE] forecast_cache invalidado após novas passagens do GEE em /api/ndci/raw.")
        return data
    except Exception as e:
        logger.error(f"Erro na sincronização do NDCI com GEE: {e}")
        raise HTTPException(
            status_code=500,
            detail="Não foi possível sincronizar a série bruta de NDCI com o Google Earth Engine.",
        )


@app.get("/api/scraper/status")
@limiter.limit("60/minute")
def scraper_status(request: Request):
    """
    Retorna o status atual do agendador automático da CETESB (ciclo de 2 horas)
    e o timestamp do último registro sincronizado no banco Oracle.
    """
    return get_scheduler_status()


@app.post("/api/scraper/trigger")
@limiter.limit("6/minute")
async def trigger_scraper(
    request: Request,
    background_tasks: BackgroundTasks,
    x_admin_token: Optional[str] = Header(default=None),
):
    """
    Dispara a raspagem da CETESB sob demanda em segundo plano com trava de exclusão mútua (API-03, SEC-02)
    e invalida o cache de telemetria quando concluída com sucesso.
    """
    _verify_optional_admin_token(x_admin_token)

    status = get_scheduler_status()
    if status.get("is_in_progress"):
        return {
            "status": "in_progress",
            "message": "Uma raspagem já está em andamento no momento.",
        }

    def _run_and_clear_cache():
        res = executar_scraper_subprocess()
        if res.get("status") == "success":
            with _cache_lock:
                oracle_cache.clear()

    background_tasks.add_task(_run_and_clear_cache)
    return {
        "status": "triggered",
        "message": "Raspagem CETESB iniciada em background. O cache será atualizado assim que concluir.",
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True, app_dir=BACKEND_DIR)

