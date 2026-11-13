import os
import sys
import math
import time
import json
import logging
import tempfile
from datetime import datetime, timezone
from typing import Optional, Tuple, Dict, Any
import requests
from requests.auth import HTTPBasicAuth
import pandas as pd
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select, WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
LOG_FILE = os.path.join(SCRIPT_DIR, "cetesb_etl.log")
ARQUIVO_ESTADO = os.path.join(SCRIPT_DIR, "ultimo_registro.txt")


def _load_env_file() -> None:
    """Carrega variáveis do arquivo .env (via python-dotenv ou parser nativo fallback)."""
    env_candidates = [
        os.path.join(PROJECT_ROOT, ".env"),
        os.path.join(SCRIPT_DIR, ".env"),
    ]
    try:
        from dotenv import load_dotenv
        for candidate in env_candidates:
            if os.path.exists(candidate):
                load_dotenv(candidate, override=False)
        return
    except ImportError:
        pass

    for candidate in env_candidates:
        if os.path.exists(candidate):
            with open(candidate, "r", encoding="utf-8") as f:
                for line in f:
                    s = line.strip()
                    if s and not s.startswith("#") and "=" in s:
                        k, v = s.split("=", 1)
                        os.environ.setdefault(k.strip(), v.strip())


_load_env_file()

# --- CONFIGURACOES DO PROJETO (Via Variaveis de Ambiente - SEC-01) ---
ORACLE_BASE_URL = os.getenv("ORACLE_BASE_URL", "").rstrip("/")
CLIENT_ID = os.getenv("ORACLE_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("ORACLE_CLIENT_SECRET", "")
TABELA_ENDPOINT = os.getenv("ORACLE_TABELA_ENDPOINT", "monitoramento_agua").strip("/")

# Configuracao de Logs com encoding UTF-8
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler()
    ]
)


def iniciar_navegador():
    logging.info("Iniciando navegador Chrome (Headless)...")
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--ignore-certificate-errors")

    try:
        # Utiliza Selenium Manager nativo (Selenium 4.6+) preferencialmente e fallback para ChromeDriverManager
        return webdriver.Chrome(options=chrome_options)
    except Exception:
        service = Service(ChromeDriverManager().install())
        return webdriver.Chrome(service=service, options=chrome_options)


def obter_token_oracle() -> Optional[str]:
    """Autentica via OAuth2 e retorna o Bearer Token."""
    if not ORACLE_BASE_URL or not CLIENT_ID or not CLIENT_SECRET:
        logging.error(
            "Credenciais Oracle ausentes. Configure ORACLE_BASE_URL, ORACLE_CLIENT_ID e ORACLE_CLIENT_SECRET no arquivo .env."
        )
        return None

    logging.info("Solicitando Token de Acesso OAuth2...")
    url = f"{ORACLE_BASE_URL}/oauth/token"
    data = {"grant_type": "client_credentials"}

    try:
        response = requests.post(url, data=data, auth=HTTPBasicAuth(CLIENT_ID, CLIENT_SECRET), timeout=15)
        if response.status_code == 200:
            token = response.json().get("access_token")
            if token:
                logging.info("Token obtido com sucesso.")
                return token
            logging.error("Resposta 200 da Oracle nao continha access_token.")
            return None
        else:
            logging.error(f"Falha na autenticacao: {response.status_code} - {response.text[:200]}")
            return None
    except Exception as e:
        logging.error(f"Erro de conexao na autenticacao: {e}")
        return None


def raspar_dados_cetesb(driver):
    """Executa a navegacao no SIMQUA com esperas explicitas (ETL-04) e extrai o HTML da tabela."""
    logging.info("Acessando site do SIMQUA/CETESB...")
    driver.get("https://simqua.cetesb.sp.gov.br/graficos_tabelas/")

    wait = WebDriverWait(driver, 20)

    # Aguardar e selecionar Estacao
    try:
        estacao_elem = wait.until(EC.presence_of_element_located((By.ID, "estacao")))
        Select(estacao_elem).select_by_visible_text("EF26 - Queluz")
    except Exception as e:
        logging.error(f"Erro ao selecionar estacao: {e}")
        return None

    logging.info("Mantendo periodo padrao do formulario (ultimas 25h).")

    # Selecionar visualizacao em Tabela e clicar em Aplicar
    try:
        tipo_vis_elem = wait.until(EC.presence_of_element_located((By.ID, "tipo_vis")))
        Select(tipo_vis_elem).select_by_value("tab")
        aplicar_btn = wait.until(EC.element_to_be_clickable((By.ID, "aplicar")))
        aplicar_btn.click()
    except Exception as e:
        logging.error(f"Erro ao submeter formulario SIMQUA: {e}")
        return None

    logging.info("Aguardando renderizacao das linhas da tabela SIMQUA...")
    try:
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "#tabela-body tr td")))
    except Exception:
        # Fallback curto caso o seletor demore alem do esperado mas o tbody exista
        time.sleep(3)

    soup = BeautifulSoup(driver.page_source, "html.parser")
    tbody = soup.find("tbody", id="tabela-body")

    if not tbody:
        raise RuntimeError("Tabela nao encontrada no HTML capturado.")

    return tbody


def limpar_celula_numerica(celula) -> Optional[float]:
    """
    Extrai com seguranca o valor numerico de uma celula <td> da tabela SIMQUA (ETL-02).
    Trata celulas vazias, '--', 'ND' ou nao-numericas retornando None sem disparar IndexError.
    """
    if celula is None:
        return None
    try:
        texto = celula.get_text(strip=True)
        if not texto:
            return None
        tokens = texto.split()
        if not tokens:
            return None
        valor = float(tokens[0].replace(",", "."))
        return valor if math.isfinite(valor) else None
    except (ValueError, TypeError, IndexError):
        return None


def processar_html(tbody) -> pd.DataFrame:
    """Transforma HTML em DataFrame Pandas limpo e resiliente a linhas incompletas (ETL-02)."""
    dados = []
    data_registro_atual = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    if tbody is None:
        return pd.DataFrame()

    for tr in tbody.find_all("tr"):
        cols = tr.find_all("td")
        if len(cols) < 7:
            continue

        data_coleta_txt = cols[0].get_text(strip=True)
        if not data_coleta_txt:
            continue

        registro = {
            "data_coleta_txt": data_coleta_txt,
            "data_registro": data_registro_atual,
            "ph": limpar_celula_numerica(cols[1]),
            "oxigenio_dissolvido": limpar_celula_numerica(cols[2]),
            "condutividade": limpar_celula_numerica(cols[3]),
            "turbidez": limpar_celula_numerica(cols[4]),
            "temperatura": limpar_celula_numerica(cols[5]),
            "precipitacao": limpar_celula_numerica(cols[6]),
        }
        dados.append(registro)

    return pd.DataFrame(dados)


def salvar_ultimo_registro_atomico(valor: str, arquivo_estado: str = ARQUIVO_ESTADO) -> None:
    """Persiste atomicamente o cursor ultimo_registro.txt (ETL-01)."""
    diretorio = os.path.dirname(os.path.abspath(arquivo_estado))
    os.makedirs(diretorio, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(prefix=".ultimo_reg_", suffix=".tmp", dir=diretorio)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(valor.strip())
        os.replace(tmp_path, arquivo_estado)
    except Exception:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass
        raise


def verificar_novo_registro(df: pd.DataFrame, arquivo_estado: str = ARQUIVO_ESTADO) -> Tuple[bool, pd.DataFrame]:
    """
    Filtra apenas registros mais recentes que o cursor salvo em ultimo_registro.txt (ETL-01).
    IMPORTANTE: NAO atualiza ultimo_registro.txt antes do envio para a Oracle Cloud.
    Retorna os registros novos ordenados cronologicamente (do mais antigo ao mais recente)
    para que o cursor avance de forma transacional conforme cada POST sucede.
    """
    if df is None or df.empty:
        return False, pd.DataFrame()

    work = df.copy()
    try:
        work["dt_obj"] = pd.to_datetime(work["data_coleta_txt"], format="%d/%m/%Y %H:%M", errors="coerce")
        work = work.dropna(subset=["dt_obj"]).sort_values(by="dt_obj", ascending=False)
    except Exception as e:
        logging.error(f"Erro ao processar datas para ordenacao: {e}")
        return False, pd.DataFrame()

    if work.empty:
        return False, pd.DataFrame()

    ultimo_lote = str(work.iloc[0]["data_coleta_txt"]).strip()

    try:
        with open(arquivo_estado, "r", encoding="utf-8") as f:
            ultimo_salvo = f.read().strip()
    except FileNotFoundError:
        ultimo_salvo = ""

    if ultimo_lote == ultimo_salvo:
        logging.info(f"DADOS JA SINCRONIZADOS: O registro mais recente ({ultimo_lote}) ja foi processado.")
        return False, pd.DataFrame()

    if ultimo_salvo:
        try:
            dt_ultimo_salvo = pd.to_datetime(ultimo_salvo, format="%d/%m/%Y %H:%M")
            work = work[work["dt_obj"] > dt_ultimo_salvo]
        except Exception:
            work = work.head(5)
    else:
        work = work.head(25)

    if work.empty:
        logging.info("Nenhum registro com timestamp estritamente superior ao ultimo salvo.")
        return False, pd.DataFrame()

    # Ordena do mais antigo para o mais recente para avanco monotônico seguro do cursor
    work = work.sort_values(by="dt_obj", ascending=True).reset_index(drop=True)
    return True, work


def sanitize_record_for_json(reg: Dict[str, Any]) -> Dict[str, Any]:
    """Substitui NaN/Infinity/pd.NA por None para garantir JSON RFC 8259 estrito aceito pelo Oracle ORDS (ETL-02)."""
    limpo: Dict[str, Any] = {}
    for k, v in reg.items():
        if k == "dt_obj":
            continue
        if v is None:
            limpo[k] = None
        elif isinstance(v, float):
            limpo[k] = v if math.isfinite(v) else None
        elif pd.isna(v):
            limpo[k] = None
        else:
            limpo[k] = v
    return limpo


def carregar_no_oracle(
    df: pd.DataFrame,
    token: str,
    arquivo_estado: str = ARQUIVO_ESTADO
) -> Dict[str, Any]:
    """
    Envia dados para a API REST da Oracle Cloud e avanca ultimo_registro.txt
    SOMENTE para os registros confirmados com HTTP 200/201 (ETL-01, ETL-02, ETL-03).
    """
    if df is None or df.empty:
        logging.warning("DataFrame vazio. Nada a enviar.")
        return {"total": 0, "sucessos": 0, "falhas": 0, "ultimo_confirmado": None}

    work = df.copy()
    if "dt_obj" in work.columns:
        work = work.sort_values(by="dt_obj", ascending=True)
        work = work.drop(columns=["dt_obj"])

    url = f"{ORACLE_BASE_URL}/{TABELA_ENDPOINT}/"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    registros = [sanitize_record_for_json(r) for r in work.to_dict(orient="records")]
    logging.info(f"Iniciando upload de {len(registros)} registros para a Oracle Cloud...")

    sucessos = 0
    falhas = 0
    ultimo_confirmado: Optional[str] = None

    for reg in registros:
        try:
            payload = json.dumps(reg, allow_nan=False)
            response = requests.post(url, data=payload, headers=headers, allow_redirects=False, timeout=10)
            if response.status_code in (200, 201):
                sucessos += 1
                ultimo_confirmado = str(reg.get("data_coleta_txt", "")).strip()
                if ultimo_confirmado:
                    salvar_ultimo_registro_atomico(ultimo_confirmado, arquivo_estado=arquivo_estado)
            else:
                falhas += 1
                logging.error(
                    f"Erro no envio do registro {reg.get('data_coleta_txt')}: "
                    f"Status {response.status_code} | Msg: {response.text[:200]}"
                )
                # Interrompe avanço subsequente para preservar ordem cronológica do cursor sem lacunas
                break
        except Exception as e:
            falhas += 1
            logging.error(f"Excecao no envio do registro {reg.get('data_coleta_txt')}: {e}")
            break

    logging.info(
        f"Sincronizacao Finalizada: {sucessos}/{len(registros)} enviados com sucesso "
        f"(ultimo confirmado: {ultimo_confirmado})."
    )
    return {
        "total": len(registros),
        "sucessos": sucessos,
        "falhas": len(registros) - sucessos,
        "ultimo_confirmado": ultimo_confirmado,
    }


def main() -> int:
    """
    Executa o pipeline ETL completo da CETESB para a Oracle Cloud.
    Retorna codigo de saida 0 em caso de sucesso e != 0 em falhas operacionais (ETL-03).
    """
    driver = None
    try:
        token = obter_token_oracle()
        if not token:
            return 1

        driver = iniciar_navegador()
        tbody_html = raspar_dados_cetesb(driver)

        if not tbody_html:
            logging.error("Falha ao extrair HTML da tabela SIMQUA.")
            return 1

        df_dados = processar_html(tbody_html)
        if df_dados.empty:
            logging.error("Nenhuma linha valida extraida da tabela SIMQUA.")
            return 1

        pode_enviar, df_filtrado = verificar_novo_registro(df_dados)

        if pode_enviar:
            logging.info(f"Dados novos identificados ({len(df_filtrado)} registros). Enviando...")
            resultado = carregar_no_oracle(df_filtrado, token)
            if resultado["sucessos"] < resultado["total"]:
                logging.error(
                    f"Sincronizacao incompleta: {resultado['sucessos']}/{resultado['total']} enviados."
                )
                return 1

        return 0

    except Exception as e:
        logging.critical(f"Erro Fatal no Pipeline: {e}")
        return 1
    finally:
        if driver:
            try:
                driver.quit()
                logging.info("Navegador encerrado.")
            except Exception:
                pass


if __name__ == "__main__":
    sys.exit(main())
