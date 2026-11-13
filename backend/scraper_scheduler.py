import os
import sys
import asyncio
import logging
import threading
import subprocess
from datetime import datetime, timedelta
from typing import Dict, Any

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRAPER_DIR = os.path.join(BASE_DIR, "scraper")
SCRAPER_SCRIPT = os.path.join(SCRAPER_DIR, "scraper.py")
ULTIMO_REGISTRO_TXT = os.path.join(SCRAPER_DIR, "ultimo_registro.txt")

# Intervalo padrão: 2 horas (7200 segundos)
INTERVALO_SEGUNDOS = 7200

_scraper_lock = threading.Lock()

_scheduler_state: Dict[str, Any] = {
    "running": False,
    "last_run": None,
    "last_status": "idle",
    "last_record_cetesb": None,
    "next_run": None,
    "interval_hours": 2,
    "is_in_progress": False,
}


def obter_ultimo_registro_salvo() -> str:
    if os.path.exists(ULTIMO_REGISTRO_TXT):
        try:
            with open(ULTIMO_REGISTRO_TXT, "r", encoding="utf-8") as f:
                return f.read().strip()
        except Exception:
            return ""
    return ""


def executar_scraper_subprocess() -> Dict[str, Any]:
    """
    Executa o scraper CETESB em um subprocesso Python isolado,
    protegido por lock atômico (_scraper_lock) para evitar concorrência entre o loop periódico
    e chamadas manuais em /api/scraper/trigger (API-03).
    """
    global _scheduler_state

    if not _scraper_lock.acquire(blocking=False):
        logger.info("[SCRAPER CETESB] Execução ignorada: outra raspagem já está em andamento.")
        return {
            "status": "in_progress",
            "message": "Uma raspagem já está em andamento no momento.",
        }

    _scheduler_state["is_in_progress"] = True
    start_time = datetime.now()
    logger.info("[SCRAPER CETESB] Iniciando raspagem periódica no SIMQUA...")

    try:
        python_exe = sys.executable
        result = subprocess.run(
            [python_exe, SCRAPER_SCRIPT],
            cwd=SCRAPER_DIR,
            capture_output=True,
            text=True,
            timeout=120,  # Timeout de 2 minutos para navegação do Selenium
        )

        ultimo = obter_ultimo_registro_salvo()
        _scheduler_state["last_run"] = start_time.strftime("%Y-%m-%d %H:%M:%S")
        _scheduler_state["last_record_cetesb"] = ultimo

        if result.returncode == 0:
            _scheduler_state["last_status"] = "success"
            logger.info(f"[SCRAPER CETESB] Sincronização concluída com sucesso. Último registro: {ultimo}")
            return {
                "status": "success",
                "last_record": ultimo,
                "stdout": (result.stdout or "")[:200],
            }
        else:
            _scheduler_state["last_status"] = "error"
            err_msg = (result.stderr or result.stdout or "").strip()[:200]
            logger.error(f"[SCRAPER CETESB] Falha no subprocesso (código {result.returncode}): {err_msg}")
            return {
                "status": "error",
                "returncode": result.returncode,
                "error": err_msg,
            }

    except subprocess.TimeoutExpired:
        logger.error("[SCRAPER CETESB] Tempo limite esgotado ao aguardar o Chrome.")
        _scheduler_state["last_status"] = "timeout"
        return {"status": "timeout", "error": "Timeout de 120s esgotado"}
    except Exception as e:
        logger.error(f"[SCRAPER CETESB] Erro inesperado na execução: {e}")
        _scheduler_state["last_status"] = "error"
        return {"status": "error", "error": str(e)}
    finally:
        _scheduler_state["is_in_progress"] = False
        _scraper_lock.release()


async def scraper_loop(oracle_cache_ref=None):
    """
    Loop assíncrono executado em background a cada 2 horas.
    """
    global _scheduler_state
    _scheduler_state["running"] = True
    _scheduler_state["last_record_cetesb"] = obter_ultimo_registro_salvo()
    logger.info(f"[SCRAPER SCHEDULER] Agendador iniciado com intervalo de {INTERVALO_SEGUNDOS // 3600} horas.")

    try:
        while _scheduler_state["running"]:
            # Executa em thread separada para não bloquear requisições HTTP do FastAPI
            res = await asyncio.to_thread(executar_scraper_subprocess)

            # Atualiza o horário exato da próxima execução usando datetime.timedelta real (API-04)
            _scheduler_state["next_run"] = (
                datetime.now() + timedelta(seconds=INTERVALO_SEGUNDOS)
            ).strftime("%Y-%m-%d %H:%M:%S")

            # Se a sincronização concluiu com sucesso, limpa o cache de telemetria da Oracle
            if oracle_cache_ref is not None and res.get("status") == "success":
                try:
                    oracle_cache_ref.clear()
                    logger.info("[SCRAPER SCHEDULER] Cache da telemetria Oracle invalidado para novos dados.")
                except Exception:
                    pass

            logger.info(
                f"[SCRAPER SCHEDULER] Próxima execução agendada para {_scheduler_state['next_run']} "
                f"({INTERVALO_SEGUNDOS // 3600} horas)."
            )
            await asyncio.sleep(INTERVALO_SEGUNDOS)
    except asyncio.CancelledError:
        logger.info("[SCRAPER SCHEDULER] Tarefa periódica cancelada no encerramento da aplicação.")
        raise
    finally:
        _scheduler_state["running"] = False


def get_scheduler_status() -> Dict[str, Any]:
    current_last = obter_ultimo_registro_salvo()
    _scheduler_state["last_record_cetesb"] = current_last
    _scheduler_state["is_in_progress"] = _scraper_lock.locked()
    return dict(_scheduler_state)
