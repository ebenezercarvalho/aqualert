"""Testes unitários e de integração da Frente 2 (Ciência de Dados e Modelo Prophet: ML-01 a ML-10)."""

import json
from pathlib import Path
import sys
import unittest

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[1]
PROPHET_DIR = REPO_ROOT / "prophet"
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(PROPHET_DIR) not in sys.path:
    sys.path.insert(0, str(PROPHET_DIR))

from backend import forecast_service
import treinamento_ndci_prophet as tnp


class ProphetFrente2AuditTests(unittest.TestCase):
    """Valida a integridade científica e operacional das correções ML-01 a ML-10."""

    @classmethod
    def setUpClass(cls):
        cls.raw_df = pd.read_csv(PROPHET_DIR / "dados_ndci_funil.csv")
        cls.clean_df = pd.read_csv(PROPHET_DIR / "dados_ndci_limpos.csv")
        cls.report = json.loads(
            (PROPHET_DIR / "relatorio_metricas.json").read_text(encoding="utf-8")
        )

    def test_ml01_preserves_real_algal_blooms_without_circular_prophet_pruning(self):
        """ML-01: O QA óptico não deve amputar florações reais (NDCI >= 0.20) por intervalo do Prophet."""
        df_clean, qa_report = tnp.apply_causal_optical_qa(self.raw_df)
        self.assertEqual(len(df_clean), 519)
        self.assertEqual(len(self.clean_df), 519)
        self.assertEqual(qa_report["total_aprovado_qa"], 519)
        self.assertEqual(self.report["resumo_dados"]["outliers_removidos"], 0)
        self.assertGreaterEqual(qa_report["eventos_criticos_gte_020"], 49)
        self.assertGreaterEqual(qa_report["eventos_atencao_gte_012"], 82)

    def test_ml02_ml07_hyperparameter_selection_uses_train_cv_only_without_weekly_seasonality(self):
        """ML-02 e ML-07: Seleção causal nos cutoffs de treino e remoção de weekly_seasonality espúria."""
        best = self.report["melhor_configuracao"]
        self.assertFalse(best["weekly_seasonality"])
        self.assertEqual(best["yearly_seasonality"], 8)
        self.assertAlmostEqual(best["changepoint_prior_scale"], 0.03, places=4)
        self.assertEqual(best["cutoffs_treino"], 61)
        self.assertEqual(best["pares_avaliados"], 507)

        holdout = self.report["avaliacao_holdout_independente"]
        self.assertEqual(holdout["observacoes_holdout"], 104)
        self.assertLess(
            holdout["rolling_operacional_1_15d"]["RMSE_assimilado"],
            holdout["rolling_operacional_1_15d"]["RMSE_persistencia"],
        )
        self.assertLess(
            holdout["rolling_operacional_1_15d"]["RMSE_assimilado"],
            holdout["rolling_operacional_1_15d"]["RMSE_climatologia"],
        )

    def test_ml03_ml08_observational_cutoffs_populate_all_horizons_and_beat_baselines(self):
        """ML-03 e ML-08: Cutoffs observacionais populam todas as faixas (incluindo 6-7d) e comparam baselines."""
        op_metrics = self.report["metricas_horizontes_operacionais"]
        self.assertEqual(len(op_metrics), 8)

        by_label = {item["horizonte_alvo"]: item for item in op_metrics}
        for label in ("3 dias", "5 dias", "7 dias", "10 dias", "15 dias", "21 dias", "30 dias", "45 dias"):
            self.assertIn(label, by_label)
            self.assertGreaterEqual(by_label[label]["n_pares"], 20)
            self.assertGreater(by_label[label]["cobertura_calibrada_80"], 0.75)

        # Nas janelas táticas (1-3d e 4-5d), o modelo assimilado deve superar Persistência e Climatologia
        for short_label in ("3 dias", "5 dias"):
            self.assertGreater(by_label[short_label]["skill_vs_persistencia_pct"], 10.0)
            self.assertGreater(by_label[short_label]["skill_vs_climatologia_pct"], 0.0)
            self.assertLess(by_label[short_label]["RMSE"], 0.095)
            self.assertLess(by_label[short_label]["MAE"], 0.072)

    def test_ml04_ml05_ml06_operational_forecast_anchors_on_latest_observation_and_validates_horizon(self):
        """ML-04, ML-05 e ML-06: ForecastService ancora na última observação e sinaliza extrapolação > 45d."""
        import tempfile
        from unittest import mock

        with tempfile.TemporaryDirectory() as tmp_dir:
            temp_history = str(Path(tmp_dir) / "historico_previsoes.json")
            with mock.patch.object(forecast_service, "PREDICTIONS_HISTORY_PATH", temp_history):
                payload = forecast_service.get_ndci_forecast(history_days=90, forecast_days=7)

        self.assertIn("summary", payload)
        self.assertIn("metrics", payload)
        self.assertIn("forecastPoints", payload)

        summary = payload["summary"]
        self.assertEqual(summary["latestObservedDate"], "2026-10-04")
        self.assertEqual(summary["trainedThrough"], "2026-10-04")
        self.assertEqual(summary["maxValidatedHorizonDays"], 45)
        self.assertEqual(summary["effectiveHorizonFromObsDays"], summary["gapDays"] + 7)
        self.assertEqual(
            summary["isHorizonExtrapolated"],
            summary["effectiveHorizonFromObsDays"] > 45,
        )

        expected_last_y = round(float(self.raw_df.iloc[-1]["y"]), 4)
        anchor = payload["forecastPoints"][0]
        self.assertTrue(anchor["isAnchor"])
        self.assertEqual(anchor["date"], "2026-10-04")
        self.assertAlmostEqual(anchor["yhat"], expected_last_y, places=4)

        # No primeiro dia previsto após a âncora (2026-10-05, h=1), yhat assimilado deve estar entre y_obs (0.0747) e yhat_prophet_puro (0.0843)
        day1 = payload["forecastPoints"][1]
        self.assertEqual(day1["date"], "2026-10-05")
        self.assertGreater(day1["yhat"], expected_last_y)
        self.assertLess(day1["yhat"], 0.0843)
        self.assertLessEqual(day1["yhat_lower"], day1["yhat"])
        self.assertGreaterEqual(day1["yhat_upper"], day1["yhat"])

        # Verifica sinalização de extrapolação acima de 45 dias
        diag_30 = forecast_service.get_horizon_diagnostics(30)
        self.assertFalse(diag_30["isExtrapolated"])
        self.assertEqual(diag_30["validatedHorizonDays"], 30)

        diag_60 = forecast_service.get_horizon_diagnostics(60)
        self.assertTrue(diag_60["isExtrapolated"])
        self.assertEqual(diag_60["maxValidatedHorizonDays"], 45)

    def test_ml09_normative_disclaimer_and_proxy_recommendations(self):
        """ML-09: Recomendações operacionais tratam NDCI como proxy óptico e não declaram conformidade normativa."""
        import tempfile
        from unittest import mock

        with tempfile.TemporaryDirectory() as tmp_dir:
            temp_history = str(Path(tmp_dir) / "historico_previsoes.json")
            with mock.patch.object(forecast_service, "PREDICTIONS_HISTORY_PATH", temp_history):
                payload = forecast_service.get_ndci_forecast(history_days=90, forecast_days=7)
        rec = payload["summary"]["recommendation"]
        self.assertNotIn("Conforme normas", rec)
        self.assertNotIn("potabilidade garantida", rec.lower())

        forecast_view_tsx = (REPO_ROOT / "views" / "ForecastView.tsx").read_text(encoding="utf-8")
        self.assertNotIn("Conforme normas CONAMA 357", forecast_view_tsx)
        self.assertIn("Indicador por satélite para triagem operacional", forecast_view_tsx)
        self.assertIn("CONAMA 357/2005", forecast_view_tsx)
        self.assertIn("Portaria GM/MS 888/2021", forecast_view_tsx)

    def test_ml10_pipeline_artifacts_and_hashes_are_synchronized(self):
        """ML-10: Hashes SHA-256 no relatório conferem com os artefatos no disco."""
        hashes = self.report["hashes_artefatos"]
        self.assertEqual(
            hashes["dados_ndci_funil_csv_sha256"],
            tnp.file_sha256(str(PROPHET_DIR / "dados_ndci_funil.csv")),
        )
        self.assertEqual(
            hashes["dados_ndci_limpos_csv_sha256"],
            tnp.file_sha256(str(PROPHET_DIR / "dados_ndci_limpos.csv")),
        )
        self.assertEqual(
            hashes["modelo_ndci_prophet_json_sha256"],
            tnp.file_sha256(str(PROPHET_DIR / "modelo_ndci_prophet.json")),
        )


if __name__ == "__main__":
    unittest.main()
