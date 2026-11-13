import os
import ee
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


def _load_env_file() -> None:
    try:
        from dotenv import load_dotenv
        load_dotenv()
        return
    except ImportError:
        pass
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                s = line.strip()
                if s and not s.startswith("#") and "=" in s:
                    k, v = s.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip())


_load_env_file()

# Coordenadas oficiais unificadas do espelho d'água principal do Reservatório do Funil (Resende/Itatiaia - RJ)
DEFAULT_LAT = -22.530116459790744
DEFAULT_LON = -44.5639148196765
DEFAULT_PROJECT = os.getenv("GEE_PROJECT_ID", "").strip()

# Parâmetros físicos e operacionais da extração espectral Sentinel-2 L2A
BUFFER_RADIUS_METERS = 175          # Círculo de 350m de diâmetro estritamente contido na lâmina d'água
NATIVE_CRS_UTM23S = "EPSG:32723"    # Grade nativa UTM Zona 23S do tile Sentinel-2 (23KNR)
NATIVE_SCALE_METERS = 20            # Resolução espacial nativa das bandas B5 (705 nm), SCL e MSK_CLDPRB
MAX_WATER_PIXELS_20M = 270          # Total de pixels únicos de 20m interceptados pelo buffer de 175m em EPSG:32723
MIN_VALID_PIXELS_20M = 81           # Cobertura mínima exigida por cena: >= 30% (81 de 270 pixels válidos de água)
MAX_SCENE_CLOUDY_PCT = 70.0         # Filtro global máximo de nebulosidade da cena no metadado Sentinel-2
MAX_PIXEL_CLOUD_PROB = 20           # Probabilidade máxima de nuvem por pixel na banda MSK_CLDPRB (0-100%)
MIN_WATER_NDWI = 0.05               # Limiar óptico de água (NDWI = (B3-B8)/(B3+B8)) preservando água eutrófica
MIN_REFLECTANCE_DENOM = 100         # Guarda radiométrica: (B5 + B4) > 100 (reflectância combinada > 0.01)
EXTRACTOR_VERSION = "v2.0-optical-qa-20m"

# Paleta de 5 níveis do painel:
# Baixo (#01042A) -> Moderado (#006A4E) -> Atenção (#7CFA00) -> Alerta (#F1D71B) -> Crítico (#FF0000)
PALETTE_5_LEVELS = ['#01042A', '#006A4E', '#7CFA00', '#F1D71B', '#FF0000']

_ee_initialized = False


def init_gee(project: str = DEFAULT_PROJECT) -> None:
    global _ee_initialized
    if not _ee_initialized:
        try:
            clean_proj = (project or "").strip()
            if clean_proj and clean_proj != "seu-projeto-gee":
                ee.Initialize(project=clean_proj)
            else:
                ee.Initialize()
            _ee_initialized = True
            logger.info("Google Earth Engine initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize Earth Engine: {e}")
            raise e


def get_funil_water_buffer(
    lon: float = DEFAULT_LON,
    lat: float = DEFAULT_LAT,
    radius_meters: float = BUFFER_RADIUS_METERS
) -> ee.Geometry:
    """Retorna a geometria circular de amostragem na lâmina d'água do Reservatório do Funil."""
    return ee.Geometry.Point([lon, lat]).buffer(radius_meters)


def calculate_indices(image: ee.Image) -> ee.Image:
    """
    Calcula NDCI, NDWI e aplica a máscara radiométrica estrita de nuvens, sombra e água
    para imagens Sentinel-2 MSI Level-2A (COPERNICUS/S2_SR_HARMONIZED).

    Regras de QA Óptica por pixel (compatíveis com todo o histórico 2019-2026, incluindo PB 04.00):
    1. QA60: bits 10 (nuvens opacas) e 11 (cirrus) iguais a 0.
    2. MSK_CLDPRB < 20%: máscara probabilística de nuvens em 20m do Sen2Cor (ativa mesmo no hiato de QA60 em 2022-2024).
    3. SCL (Scene Classification Layer em 20m): admite apenas classe 6 (Água) ou classes 4/5 quando NDWI > 0.05
       (floração algal superficial densa), excluindo explicitamente 0 (Sem dados), 1 (Saturado/Defeituoso),
       2 (Sombra escura), 3 (Sombra de nuvem), 7 (Não classificado/Borda de nuvem), 8/9 (Nuvens), 10 (Cirrus) e 11 (Neve).
    4. NDWI = (B3 - B8) / (B3 + B8) > 0.05: garante suporte exclusivamente hídrico livre de margem exposta.
    5. Guarda de denominador: (B5 + B4) > 100 para evitar instabilidade numérica em pixels de baixíssima radiância.
    """
    qa = image.select('QA60')
    qa_clear = qa.bitwiseAnd(1 << 10).eq(0).And(qa.bitwiseAnd(1 << 11).eq(0))

    scl = image.select('SCL')
    scl_valid_water = scl.eq(6).Or(scl.eq(4)).Or(scl.eq(5))

    cloud_prob_clear = image.select('MSK_CLDPRB').lt(MAX_PIXEL_CLOUD_PROB)

    ndwi = image.normalizedDifference(['B3', 'B8']).rename('NDWI')
    water_mask = ndwi.gt(MIN_WATER_NDWI)

    b4 = image.select('B4')
    b5 = image.select('B5')
    denom = b5.add(b4)
    valid_denom = denom.gt(MIN_REFLECTANCE_DENOM)

    optical_water_mask = (
        qa_clear
        .And(scl_valid_water)
        .And(cloud_prob_clear)
        .And(water_mask)
        .And(valid_denom)
    )

    ndci = (
        b5.subtract(b4)
        .divide(denom)
        .clamp(-1.0, 1.0)
        .updateMask(optical_water_mask)
        .rename('NDCI')
    )

    ndwi_masked = ndwi.updateMask(optical_water_mask)
    return image.addBands(ndci, overwrite=True).addBands(ndwi_masked, overwrite=True)


def get_ndci_tiles(
    start_date: str = '2025-09-01',
    end_date: str = '2025-09-25',
    max_sens: float = 0.15,
    lon: float = DEFAULT_LON,
    lat: float = DEFAULT_LAT,
    project: str = DEFAULT_PROJECT
) -> Dict[str, Any]:
    """
    Consulta a coleção Sentinel-2 Harmonized SR, aplica a máscara combinada de nuvens/sombra/água
    por cena (QA60 + MSK_CLDPRB + SCL + NDWI) e gera a URL de tiles XYZ da média de NDCI para o Leaflet.
    """
    init_gee(project)

    poi = ee.Geometry.Point([lon, lat])

    s2_collection = (
        ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        .filterBounds(poi)
        .filterDate(start_date, end_date)
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', MAX_SCENE_CLOUDY_PCT))
    )

    image_count = s2_collection.size().getInfo()
    logger.info(f"Cloud-filtered images found in period [{start_date} to {end_date}]: {image_count}")

    if image_count == 0:
        raise ValueError(
            f"Nenhuma imagem de satélite com cobertura de nuvens aceitável (<{int(MAX_SCENE_CLOUDY_PCT)}%) "
            f"encontrada para o período {start_date} a {end_date}."
        )

    # Aplica máscara óptica de nuvens/sombra e água por cena antes da redução temporal
    masked_collection = s2_collection.map(calculate_indices)
    mean_masked_image = masked_collection.select('NDCI').mean()

    vis_params = {
        'min': 0.003,
        'max': float(max_sens),
        'palette': PALETTE_5_LEVELS
    }

    map_id_dict = ee.Image(mean_masked_image).getMapId(vis_params)
    tile_url = map_id_dict['tile_fetcher'].url_format

    return {
        "url": tile_url,
        "image_count": image_count,
        "start_date": start_date,
        "end_date": end_date,
        "sensitivity": max_sens,
        "center": [lat, lon],
        "mask_pipeline": EXTRACTOR_VERSION,
        "water_ndwi_threshold": MIN_WATER_NDWI,
        "max_cloud_probability": MAX_PIXEL_CLOUD_PROB
    }

