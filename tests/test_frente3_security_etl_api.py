import os
import sys
import json
import math
import tempfile
import unittest
from unittest.mock import patch, MagicMock

import pandas as pd
from bs4 import BeautifulSoup

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
SCRAPER_DIR = os.path.join(PROJECT_ROOT, "scraper")

for d in (PROJECT_ROOT, BACKEND_DIR, SCRAPER_DIR):
    if d not in sys.path:
        sys.path.insert(0, d)

import scraper as cetesb_scraper
import scraper_scheduler


class TestFrente3SecurityEtlApi(unittest.TestCase):
    def test_sec01_no_hardcoded_oracle_secrets_in_scraper(self):
        """SEC-01: O código-fonte de scraper/scraper.py não deve conter CLIENT_ID ou CLIENT_SECRET literais."""
        import ast
        scraper_path = os.path.join(SCRAPER_DIR, "scraper.py")
        with open(scraper_path, "r", encoding="utf-8") as f:
            source = f.read()

        tree = ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id in ("CLIENT_ID", "CLIENT_SECRET", "ORACLE_BASE_URL"):
                        self.assertFalse(
                            isinstance(node.value, ast.Constant) and bool(node.value.value),
                            f"{target.id} não pode receber string literal codificada no código-fonte!",
                        )

        self.assertIn('os.getenv("ORACLE_CLIENT_ID"', source)
        self.assertIn('os.getenv("ORACLE_CLIENT_SECRET"', source)
        self.assertIn('os.getenv("ORACLE_BASE_URL"', source)

        env_example_path = os.path.join(PROJECT_ROOT, ".env.example")
        self.assertTrue(os.path.exists(env_example_path))

    def test_sec03_vite_config_has_no_gemini_api_key_injection(self):
        """SEC-03: vite.config.ts não deve injetar GEMINI_API_KEY no bundle cliente."""
        vite_path = os.path.join(PROJECT_ROOT, "vite.config.ts")
        with open(vite_path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertNotIn("GEMINI_API_KEY", content)
        self.assertNotIn("process.env.API_KEY", content)

    def test_etl02_processar_html_handles_empty_and_malformed_cells(self):
        """ETL-02: Células vazias, '--', 'ND' ou linhas curtas não devem causar IndexError nem gerar NaN inválido."""
        html = """
        <tbody id="tabela-body">
            <tr><td>Linha incompleta</td><td>7,2</td></tr>
            <tr>
                <td>18/10/2026 10:00</td>
                <td>7,35 mg/L</td>
                <td></td>
                <td>--</td>
                <td>ND</td>
                <td>24,8 C</td>
                <td>0,0 mm</td>
            </tr>
        </tbody>
        """
        soup = BeautifulSoup(html, "html.parser")
        tbody = soup.find("tbody", id="tabela-body")
        df = cetesb_scraper.processar_html(tbody)

        self.assertEqual(len(df), 1)
        row = df.iloc[0].to_dict()
        self.assertAlmostEqual(row["ph"], 7.35)
        self.assertIsNone(row["oxigenio_dissolvido"])
        self.assertIsNone(row["condutividade"])
        self.assertIsNone(row["turbidez"])
        self.assertAlmostEqual(row["temperatura"], 24.8)
        self.assertAlmostEqual(row["precipitacao"], 0.0)

        sanitized = cetesb_scraper.sanitize_record_for_json({
            **row,
            "oxigenio_dissolvido": float("nan"),
            "condutividade": float("inf"),
        })
        # Deve serializar com allow_nan=False sem levantar ValueError
        serialized = json.dumps(sanitized, allow_nan=False)
        parsed = json.loads(serialized)
        self.assertIsNone(parsed["oxigenio_dissolvido"])
        self.assertIsNone(parsed["condutividade"])

    def test_etl01_cursor_updates_only_after_confirmed_oracle_post(self):
        """
        ETL-01: verificar_novo_registro NÃO deve alterar ultimo_registro.txt antes do upload,
        e carregar_no_oracle deve avançar o cursor apenas até o último registro com HTTP 200/201.
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            estado_file = os.path.join(tmpdir, "ultimo_registro.txt")
            with open(estado_file, "w", encoding="utf-8") as f:
                f.write("18/10/2026 08:00")

            df_input = pd.DataFrame([
                {"data_coleta_txt": "18/10/2026 11:00", "ph": 7.4},
                {"data_coleta_txt": "18/10/2026 09:00", "ph": 7.1},
                {"data_coleta_txt": "18/10/2026 10:00", "ph": 7.2},
                {"data_coleta_txt": "18/10/2026 08:00", "ph": 7.0},
            ])

            pode_enviar, df_filtrado = cetesb_scraper.verificar_novo_registro(df_input, arquivo_estado=estado_file)
            self.assertTrue(pode_enviar)
            self.assertEqual(len(df_filtrado), 3)

            # Ordem deve ser cronológica ascendente (09:00 -> 10:00 -> 11:00)
            self.assertEqual(
                list(df_filtrado["data_coleta_txt"]),
                ["18/10/2026 09:00", "18/10/2026 10:00", "18/10/2026 11:00"],
            )

            # Cursor NÃO pode ter sido alterado antes do upload!
            with open(estado_file, "r", encoding="utf-8") as f:
                self.assertEqual(f.read().strip(), "18/10/2026 08:00")

            # Simula: 1º POST (09:00) -> 201, 2º POST (10:00) -> 200, 3º POST (11:00) -> 500 (falha!)
            r1, r2, r3 = MagicMock(status_code=201), MagicMock(status_code=200), MagicMock(status_code=500, text="Internal Error")
            with patch.object(cetesb_scraper.requests, "post", side_effect=[r1, r2, r3]):
                res = cetesb_scraper.carregar_no_oracle(df_filtrado, token="fake_token", arquivo_estado=estado_file)

            self.assertEqual(res["total"], 3)
            self.assertEqual(res["sucessos"], 2)
            self.assertEqual(res["falhas"], 1)
            self.assertEqual(res["ultimo_confirmado"], "18/10/2026 10:00")

            # O cursor em disco deve ter avançado apenas até 10:00 (preservando 11:00 para a próxima tentativa)
            with open(estado_file, "r", encoding="utf-8") as f:
                self.assertEqual(f.read().strip(), "18/10/2026 10:00")

    def test_etl03_main_returns_nonzero_on_auth_or_upload_failure(self):
        """ETL-03: main() deve retornar código != 0 quando OAuth falha ou quando upload falha parcialmente."""
        with patch.object(cetesb_scraper, "obter_token_oracle", return_value=None):
            self.assertEqual(cetesb_scraper.main(), 1)

    def test_api03_and_api04_scheduler_lock_and_timedelta(self):
        """API-03 / API-04: _scraper_lock impede execução concorrente e scraper_scheduler usa timedelta real."""
        with open(os.path.join(BACKEND_DIR, "scraper_scheduler.py"), "r", encoding="utf-8") as f:
            sched_src = f.read()
        self.assertNotIn("asyncio.to_timedelta", sched_src)
        self.assertIn("timedelta(seconds=INTERVALO_SEGUNDOS)", sched_src)

        # Se o lock já estiver adquirido, executar_scraper_subprocess deve retornar 'in_progress' imediatamente
        acquired = scraper_scheduler._scraper_lock.acquire(blocking=False)
        self.assertTrue(acquired)
        try:
            res = scraper_scheduler.executar_scraper_subprocess()
            self.assertEqual(res["status"], "in_progress")
        finally:
            scraper_scheduler._scraper_lock.release()


if __name__ == "__main__":
    unittest.main()
