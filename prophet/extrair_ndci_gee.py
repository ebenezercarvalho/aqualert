import os
import sys
import time

# Garante que a raiz do projeto esteja no sys.path para reutilizar o pipeline oficial do backend
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.gee_service import (
    BUFFER_RADIUS_METERS,
    DEFAULT_LAT,
    DEFAULT_LON,
    DEFAULT_PROJECT,
    EXTRACTOR_VERSION,
    MAX_WATER_PIXELS_20M,
    MIN_VALID_PIXELS_20M,
    NATIVE_CRS_UTM23S,
    NATIVE_SCALE_METERS,
)
from backend.gee_sync_service import (
    CSV_RAW_PATH,
    atomic_write_csv,
    extract_ndci_series_from_gee,
)


def main(start_date: str = "2019-01-01", end_date: str = "2026-10-19") -> None:
    print(f"Iniciando extração histórica GEE ({EXTRACTOR_VERSION})...")
    print(
        f"ROI: ({DEFAULT_LAT}, {DEFAULT_LON}) | Raio: {BUFFER_RADIUS_METERS}m | "
        f"Grade: {NATIVE_CRS_UTM23S} @ {NATIVE_SCALE_METERS}m "
        f"(mínimo {MIN_VALID_PIXELS_20M}/{MAX_WATER_PIXELS_20M} pixels de água limpa)"
    )
    print(f"Buscando imagens entre {start_date} e {end_date} (projeto: {DEFAULT_PROJECT})...")

    t0 = time.time()
    df = extract_ndci_series_from_gee(
        start_date=start_date,
        end_date=end_date,
        project=DEFAULT_PROJECT,
    )
    elapsed = time.time() - t0
    print(f"Sucesso! {len(df)} datas diárias únicas obtidas em {elapsed:.2f}s")

    out_df = df.copy()
    out_df["ds"] = out_df["ds"].dt.strftime("%Y-%m-%d")
    atomic_write_csv(out_df, CSV_RAW_PATH)

    print(f"Dados salvos atomicamente em {CSV_RAW_PATH}")
    print(out_df.head(10))
    print(f"Total de registros diários únicos: {len(out_df)}")


if __name__ == "__main__":
    main()


