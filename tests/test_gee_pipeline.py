"""Testes de regressão da Frente 1 (Sensoriamento Remoto e Pipeline de Dados GEE: GEO-01 a GEO-05)."""
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import pandas as pd

from backend import gee_service, gee_sync_service

ROOT = Path(__file__).resolve().parents[1]


class GeePipelineFrente1Tests(unittest.TestCase):
    def test_geodesic_and_optical_constants_unified(self):
        """Verifica se o mapa e a série temporal compartilham as mesmas constantes ópticas e geodésicas (GEO-01, GEO-02, GEO-04)."""
        self.assertAlmostEqual(gee_service.DEFAULT_LAT, -22.530116459790744, places=12)
        self.assertAlmostEqual(gee_service.DEFAULT_LON, -44.5639148196765, places=12)
        self.assertEqual(gee_service.BUFFER_RADIUS_METERS, 175)
        self.assertEqual(gee_service.NATIVE_CRS_UTM23S, "EPSG:32723")
        self.assertEqual(gee_service.NATIVE_SCALE_METERS, 20)
        self.assertEqual(gee_service.MAX_WATER_PIXELS_20M, 270)
        self.assertEqual(gee_service.MIN_VALID_PIXELS_20M, 81)
        self.assertEqual(gee_service.MAX_PIXEL_CLOUD_PROB, 20)
        self.assertAlmostEqual(gee_service.MIN_WATER_NDWI, 0.05, places=6)
        self.assertEqual(gee_sync_service.LOOKBACK_DAYS, 14)

    def test_deduplicate_daily_scenes_deterministic(self):
        """Garante deduplicação determinística por data sem somar pixels repetidos (44+44=88) nem promediar desvios-padrão (GEO-02, GEO-03)."""
        raw = pd.DataFrame([
            {
                "ds": "2019-06-16",
                "y": -0.1810,
                "std_dev": 0.0320,
                "points_count": 210,
                "cloudy_pct": 12.5,
                "scene_id": "20190616T131251_20190616T131253_T23KNR",
            },
            {
                "ds": "2019-06-16",
                "y": -0.1750,
                "std_dev": 0.0280,
                "points_count": 265,
                "cloudy_pct": 14.0,
                "scene_id": "20190616T131251_20190616T150000_T23KNR",
            },
            {
                "ds": "2020-08-09",
                "y": -0.0520,
                "std_dev": 0.0340,
                "points_count": 250,
                "cloudy_pct": 8.0,
                "scene_id": "20200809_A",
            },
            {
                "ds": "2020-08-09",
                "y": -0.0510,
                "std_dev": 0.0310,
                "points_count": 250,
                "cloudy_pct": 3.5,
                "scene_id": "20200809_B",
            },
        ])
        dedup = gee_sync_service.deduplicate_daily_scenes(raw)
        self.assertEqual(len(dedup), 2)

        row_2019 = dedup.loc[dedup["ds"] == pd.Timestamp("2019-06-16")].iloc[0]
        # Deve escolher a cena com maior points_count (265 > 210) e jamais somar 210+265=475
        self.assertEqual(int(row_2019["points_count"]), 265)
        self.assertAlmostEqual(float(row_2019["y"]), -0.1750, places=6)
        self.assertAlmostEqual(float(row_2019["std_dev"]), 0.0280, places=6)

        row_2020 = dedup.loc[dedup["ds"] == pd.Timestamp("2020-08-09")].iloc[0]
        # Empate em points_count (250 == 250): desempata por menor cloudy_pct (3.5 < 8.0)
        self.assertEqual(row_2020["scene_id"], "20200809_B")
        self.assertAlmostEqual(float(row_2020["cloudy_pct"]), 3.5, places=4)

    def test_sync_isolates_clean_csv_and_uses_14d_lookback(self):
        """Verifica que sync_ndci_data atualiza apenas CSV_RAW_PATH com lookback de 14 dias e NUNCA sobrescreve CSV_CLEAN_PATH (GEO-03, GEO-05)."""
        with tempfile.TemporaryDirectory(prefix="aqualert-frente1-") as tmp:
            tmp_path = Path(tmp)
            raw_csv = tmp_path / "dados_ndci_funil.csv"
            clean_csv = tmp_path / "dados_ndci_limpos.csv"

            initial_raw = pd.DataFrame([
                {
                    "ds": "2026-10-01",
                    "y": 0.1050,
                    "std_dev": 0.0210,
                    "points_count": 260,
                    "pixel_fraction": 0.9630,
                    "cloudy_pct": 1.2,
                    "scene_id": "S2_20261001",
                    "extractor_version": gee_service.EXTRACTOR_VERSION,
                }
            ])
            initial_raw.to_csv(raw_csv, index=False)

            sentinel_clean_bytes = b"ds,y,std_dev,points_count\n2026-10-01,0.0999,0.01,44\n"
            clean_csv.write_bytes(sentinel_clean_bytes)
            clean_sha_before = hashlib.sha256(clean_csv.read_bytes()).hexdigest()

            mock_recent = pd.DataFrame([
                {
                    "ds": pd.Timestamp("2026-10-01"),
                    "y": 0.1050,
                    "std_dev": 0.0210,
                    "points_count": 260,
                    "pixel_fraction": 0.9630,
                    "cloudy_pct": 1.2,
                    "scene_id": "S2_20261001",
                    "extractor_version": gee_service.EXTRACTOR_VERSION,
                },
                {
                    "ds": pd.Timestamp("2026-10-04"),
                    "y": 0.0725,
                    "std_dev": 0.0115,
                    "points_count": 270,
                    "pixel_fraction": 1.0,
                    "cloudy_pct": 0.0,
                    "scene_id": "S2_20261004",
                    "extractor_version": gee_service.EXTRACTOR_VERSION,
                },
            ])

            with patch.object(gee_sync_service, "CSV_RAW_PATH", str(raw_csv)), \
                 patch.object(gee_sync_service, "CSV_CLEAN_PATH", str(clean_csv)), \
                 patch.object(gee_sync_service, "extract_ndci_series_from_gee", return_value=mock_recent) as mock_extract:
                result = gee_sync_service.sync_ndci_data(force=True)

                self.assertEqual(result["syncStatus"], "updated")
                self.assertEqual(result["newRecords"], 1)
                self.assertEqual(result["total"], 2)

                # Verifica que o lookback de 14 dias foi aplicado (2026-10-01 - 14 dias = 2026-09-17)
                call_kwargs = mock_extract.call_args.kwargs
                self.assertEqual(call_kwargs["start_date"], "2026-09-17")

                # Verifica que CSV_CLEAN_PATH permaneceu 100% intacto (GEO-05)
                clean_sha_after = hashlib.sha256(clean_csv.read_bytes()).hexdigest()
                self.assertEqual(clean_sha_before, clean_sha_after)

    def test_sync_reports_error_status_when_gee_fails(self):
        """Garante que falhas na API do GEE retornem syncStatus='error' em vez de mascarar como 'checked'."""
        with tempfile.TemporaryDirectory(prefix="aqualert-frente1-err-") as tmp:
            raw_csv = Path(tmp) / "dados_ndci_funil.csv"
            pd.DataFrame([
                {
                    "ds": "2026-10-01",
                    "y": 0.1050,
                    "std_dev": 0.0210,
                    "points_count": 260,
                }
            ]).to_csv(raw_csv, index=False)

            with patch.object(gee_sync_service, "CSV_RAW_PATH", str(raw_csv)), \
                 patch.object(gee_sync_service, "extract_ndci_series_from_gee", side_effect=RuntimeError("GEE timeout")):
                result = gee_sync_service.sync_ndci_data(force=True)
                self.assertEqual(result["syncStatus"], "error")
                self.assertIn("GEE timeout", result["message"])

    def test_regenerated_raw_csv_schema_and_spatial_coverage(self):
        """Valida a integridade da base bruta regenerada (prophet/dados_ndci_funil.csv) e do notebook UTF-8."""
        raw_path = ROOT / "prophet" / "dados_ndci_funil.csv"
        df = pd.read_csv(raw_path)

        expected_cols = {
            "ds", "y", "std_dev", "points_count",
            "pixel_fraction", "cloudy_pct", "scene_id", "extractor_version"
        }
        self.assertTrue(expected_cols.issubset(set(df.columns)))
        self.assertGreaterEqual(len(df), 500)
        self.assertTrue(df["ds"].is_monotonic_increasing)
        self.assertFalse(df["ds"].duplicated().any())

        # Cobertura espacial: mínimo 81 pixels (>= 30% de 270) e máximo 270 pixels (grade 20m UTM 23S)
        self.assertGreaterEqual(int(df["points_count"].min()), gee_service.MIN_VALID_PIXELS_20M)
        self.assertLessEqual(int(df["points_count"].max()), gee_service.MAX_WATER_PIXELS_20M)

        # Limites físicos do NDCI [-1, 1]
        self.assertGreaterEqual(float(df["y"].min()), -1.0)
        self.assertLessEqual(float(df["y"].max()), 1.0)

        # Verifica que o notebook gee_sentinel.ipynb é UTF-8 válido sem BOM UTF-16
        nb_bytes = (ROOT / "notebooks" / "gee_sentinel.ipynb").read_bytes()
        self.assertFalse(nb_bytes.startswith(b"\xff\xfe"))
        nb_json = json.loads(nb_bytes.decode("utf-8"))
        self.assertGreaterEqual(len(nb_json.get("cells", [])), 2)


if __name__ == "__main__":
    unittest.main()
