import os
import json
import unittest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class TestFrente4UiContracts(unittest.TestCase):
    def _read(self, rel_path: str) -> str:
        full_path = os.path.join(PROJECT_ROOT, rel_path)
        with open(full_path, "r", encoding="utf-8") as f:
            return f.read()

    def test_ui01_and_ui02_forecast_view_uses_env_url_and_auto_sync_without_manual_button(self):
        """
        UI-01 / UI-02: ForecastView.tsx deve usar import.meta.env.VITE_API_URL,
        AbortController para cancelamento de corrida e sincronização automática sem botão manual.
        """
        src = self._read("views/ForecastView.tsx")
        self.assertIn("import.meta.env.VITE_API_URL", src)
        self.assertIn("AbortController", src)
        self.assertNotIn("Atualizar Dados (GEE)", src)
        self.assertIn("autoSyncAndLoad", src)

    def test_ui03_forecast_view_removes_100_points_card_and_uses_operational_language(self):
        """
        UI-03: O card 'Área Amostrada / 100 pontos' e os jargões técnicos de geoprocessamento/data science
        devem estar ausentes de ForecastView.tsx, mantendo foco operacional para técnicos e gestores de ETA.
        """
        src = self._read("views/ForecastView.tsx")
        self.assertNotIn("100 pontos", src)
        self.assertNotIn("Área Amostrada", src)
        self.assertNotIn("EPSG:32723", src)
        self.assertNotIn("270 pixels", src)
        self.assertNotIn("QA60", src)
        self.assertNotIn("MSK_CLDPRB", src)
        self.assertNotIn("Prophet IA", src)
        self.assertIn("NDCI Estimado:", src)
        self.assertIn("Faixa de Incerteza:", src)
        self.assertIn("Erro Médio:", src)
        self.assertIn("Incerteza:", src)
        self.assertIn("maxPredictedNdci", src)
        self.assertNotIn("maxForecastNdci", src)

    def test_ui04_svg_mouse_coordinates_compensate_padding_left_and_chart_width(self):
        """
        UI-04: handleMouseDown e handleMouseMove em ForecastView.tsx devem compensar padding.left e chartWidth.
        """
        src = self._read("views/ForecastView.tsx")
        self.assertIn("padding.left + ((e.clientX - rect.left) / rect.width) * chartWidth", src)
        self.assertIn("padding.top + ((e.clientY - rect.top) / rect.height) * chartHeight", src)
        self.assertNotIn("((e.clientX - rect.left) / rect.width) * svgWidth", src)

    def test_ui05_ui06_ui07_ui08_app_tsx_fixes(self):
        """
        UI-05 a UI-08: App.tsx verifica pH crítico antes de warning, preserva null em leituras ausentes,
        filtra daily por janela de 48h e remove pontos vermelhos fictícios (CircleMarker/SENSORS) do mapa.
        """
        src = self._read("App.tsx")
        crit_idx = src.find("if (value < 4.5 || value > 8.5) return 'critical';")
        warn_idx = src.find("if (value < 5 || value > 8) return 'warning';")
        self.assertGreater(crit_idx, 0)
        self.assertGreater(warn_idx, crit_idx, "O teste de pH crítico deve vir antes do teste de warning!")

        self.assertIn("toValidNumber", src)
        self.assertNotIn("Number(item.ph) || 0", src)
        self.assertIn("fortyEightHoursAgo", src)
        self.assertNotIn("CircleMarker", src)
        self.assertNotIn("sensor.lat / 10 + mapCenter[0]", src)
        self.assertIn("window.addEventListener('hashchange'", src)

    def test_ui09_and_ui10_feedback_and_brand_fixes(self):
        """
        UI-09 / UI-10: FeedbackView.tsx protege localStorage com try/catch e explicita base demonstrativa,
        e AqualertLogo usa React.useId() para IDs únicos de gradiente SVG.
        """
        fb_src = self._read("views/FeedbackView.tsx")
        self.assertIn("saveSafe", fb_src)
        self.assertIn("Array.isArray(parsed)", fb_src)
        self.assertIn("Base demonstrativa Hackathon", fb_src)

        brand_src = self._read("components/brand.tsx")
        self.assertIn("React.useId()", brand_src)

    def test_dev01_and_dev03_package_json_and_readme_updated(self):
        """
        DEV-01 / DEV-03: package.json possui script typecheck e README.md reflete a arquitetura real.
        """
        pkg = json.loads(self._read("package.json"))
        self.assertEqual(pkg.get("scripts", {}).get("typecheck"), "tsc --noEmit")

        readme = self._read("README.md")
        self.assertNotIn("100 pontos aleatórios", readme)
        self.assertIn("EPSG:32723", readme)
        self.assertIn("270 pixels", readme)


if __name__ == "__main__":
    unittest.main()
