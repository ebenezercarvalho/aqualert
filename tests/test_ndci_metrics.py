"""Regressão do M2. Requer as dependências científicas do treinamento."""
import ast
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import numpy as np
import pandas as pd
from prophet.diagnostics import performance_metrics


ROOT = Path(__file__).resolve().parents[1]


def metric_assignments():
    script = (ROOT / 'prophet/treinamento_ndci_prophet.py').read_text(encoding='utf-8')
    notebook = json.loads((ROOT / 'prophet/treinamento_ndci_prophet.ipynb').read_text(encoding='utf-8'))
    sources = [script, '\n'.join(''.join(c['source']) for c in notebook['cells'] if c['cell_type'] == 'code')]
    for source in sources:
        matches = [node for node in ast.walk(ast.parse(source))
                   if isinstance(node, ast.Assign) and isinstance(node.value, ast.Call)
                   and isinstance(node.value.func, ast.Name)
                   and node.value.func.id == 'performance_metrics']
        if len(matches) != 1:
            raise AssertionError('Esperada uma chamada de métricas em cada pipeline NDCI')
        yield compile(ast.Module(body=matches, type_ignores=[]), '<pipeline-ndci>', 'exec')


class NdciMetricsTests(unittest.TestCase):
    def evaluate(self, observed, predicted):
        cutoffs = pd.date_range('2025-01-01', periods=len(observed))
        cv = pd.DataFrame({'cutoff': cutoffs, 'ds': cutoffs + pd.Timedelta(days=3),
                           'y': observed, 'yhat': predicted,
                           'yhat_lower': np.asarray(predicted) - .1,
                           'yhat_upper': np.asarray(predicted) + .1})
        errors = np.asarray(observed) - np.asarray(predicted)
        expected = {'mse': np.mean(errors ** 2), 'rmse': np.sqrt(np.mean(errors ** 2)),
                    'mae': np.mean(np.abs(errors))}
        for code in metric_assignments():
            namespace = {'df_cv': cv, 'performance_metrics': performance_metrics}
            exec(code, namespace)
            result = namespace['df_p']
            self.assertEqual(set(result.columns), {'horizon', 'mse', 'rmse', 'mae'})
            for metric, value in expected.items():
                self.assertTrue(np.isfinite(result[metric]).all())
                self.assertAlmostEqual(result.iloc[0][metric], value, places=12)
            # A exclusão de métricas percentuais não altera as métricas absolutas.
            legacy = performance_metrics(cv)
            pd.testing.assert_frame_equal(result, legacy[['horizon', 'mse', 'rmse', 'mae']])

    def test_signed_values_and_near_zero(self):
        self.evaluate([0., 1e-12, -1e-12, -.2, .12, .4], [.02, -.03, .01, -.1, .15, .2])

    def test_all_zero_observations(self):
        self.evaluate([0.] * 6, [.01, -.02, .03, -.01, .02, -.03])

    def test_perfect_prediction(self):
        self.evaluate([-.2, 0., .2], [-.2, 0., .2])

    def test_saved_report_and_backend_contract(self):
        report = json.loads((ROOT / 'prophet/relatorio_metricas.json').read_text(encoding='utf-8'))
        self.assertEqual(len(report['metricas_horizontes_cv']), 5)
        spec = importlib.util.spec_from_file_location('ndci_forecast_test', ROOT / 'backend/forecast_service.py')
        backend = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(backend)
        with patch.object(backend, '_cached_metrics', report):
            for row in report['metricas_horizontes_cv']:
                self.assertEqual(set(row), {'horizonte_alvo', 'horizonte_exato', 'MSE', 'RMSE', 'MAE'})
                h = int(row['horizonte_alvo'].split()[0])
                self.assertEqual(backend.get_error_for_horizon(h), {'rmse': row['RMSE'], 'mae': row['MAE']})
        json.dumps(report, allow_nan=False)

    def test_forecast_payload_unchanged_without_mape(self):
        report = json.loads((ROOT / 'prophet/relatorio_metricas.json').read_text(encoding='utf-8'))
        legacy = json.loads(json.dumps(report))
        for row in legacy['metricas_horizontes_cv']:
            row['MAPE (%)'] = 999.0  # Campo legado não deve participar da inferência.
        spec = importlib.util.spec_from_file_location('ndci_forecast_payload_test', ROOT / 'backend/forecast_service.py')
        backend = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(backend)
        with tempfile.TemporaryDirectory(prefix='aqualert-m2-test-') as tmp:
            with patch.object(backend, 'PREDICTIONS_HISTORY_PATH', str(Path(tmp) / 'history.json')):
                for horizon in (1, 7, 30):
                    with self.subTest(horizon=horizon):
                        with patch.object(backend, '_cached_metrics', legacy):
                            np.random.seed(42)
                            before = backend.get_ndci_forecast(forecast_days=horizon)
                        with patch.object(backend, '_cached_metrics', report):
                            np.random.seed(42)
                            after = backend.get_ndci_forecast(forecast_days=horizon)
                        self.assertEqual(before, after)
                        self.assertEqual(sum(p['isFuture'] for p in after['forecastPoints']), horizon)
                        self.assertTrue(after['forecastPoints'][0]['isAnchor'])
                        self.assertTrue({'rmse', 'mae'} <= after['metrics'].keys())
                        json.dumps(after, allow_nan=False)


if __name__ == '__main__':
    unittest.main()
