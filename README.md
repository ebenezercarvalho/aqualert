# Aqualert — Plataforma Inteligente de Monitoramento Hídrico e Previsão Ambiental

> **Synapsis EcoStream / Aqualert** — Solução integrada de sensoriamento remoto via satélite, telemetria em tempo real e inteligência artificial para gestão de recursos hídricos e alerta precoce de floração de algas (cianobactérias).

---

## 🚀 Guia Rápido: Como Rodar o Projeto no seu Computador (Passo a Passo Simplificado)

Este guia foi pensado para que **qualquer membro do time** consiga abrir e testar o **Aqualert** no próprio computador, mesmo sem experiência avançada em programação.

> 💡 **Importante (Modo Demonstração / MVP pronto para uso):**
> Você **NÃO precisa** ter conta na Oracle Cloud nem no Google Earth Engine para rodar o projeto! O repositório já inclui a base histórica de satélite e o modelo de Inteligência Artificial treinado. Se você não configurar chaves externas, o sistema carrega automaticamente os dados locais de demonstração para que todas as telas e gráficos funcionem perfeitamente.

---

### Passo 1 — Instalar os 2 programas necessários (apenas na primeira vez)

Antes de começar, verifique se você tem estes dois programas gratuitos instalados no seu computador:

1. **Node.js (versão LTS — 18 ou superior)**
   - 🔗 Baixe em: [https://nodejs.org/](https://nodejs.org/) (clique no botão verde **LTS**).
   - Durante a instalação no Windows, basta clicar em *Next* (Avançar) até concluir.
2. **Python (versão 3.10 a 3.13)**
   - 🔗 Baixe em: [https://www.python.org/downloads/](https://www.python.org/downloads/)
   - ⚠️ **MUITO IMPORTANTE na instalação do Python no Windows:** Na primeira tela do instalador, **marque a caixinha `"Add python.exe to PATH"`** (Adicionar Python ao PATH) na parte inferior da janela antes de clicar em *Install Now*.

---

### Passo 2 — Baixar o projeto

Se você usa o **Git**, abra o terminal (PowerShell ou Prompt de Comando) na pasta onde deseja salvar o projeto e digite:

```powershell
git clone <URL_DO_REPOSITORIO>
cd aqualert
```

*(Dica: Se preferir não usar o Git, você pode clicar no botão verde **`<> Code`** no topo da página do GitHub, escolher **`Download ZIP`**, extrair a pasta no seu computador e abrir essa pasta).*

---

### Passo 3 — Ligar o Servidor de Inteligência Artificial (Backend)

O projeto é dividido em duas partes que rodam juntas: o **Backend** (cérebro em Python que gera as previsões de algas) e o **Frontend** (a tela visual do site).

1. Abra um terminal (**PowerShell** ou **Prompt de Comando**) dentro da pasta `aqualert`.
2. Digite os comandos abaixo, um por vez, apertando **Enter** após cada linha:

```powershell
# 1. Entra na pasta do servidor Python
cd backend

# 2. Instala as bibliotecas necessárias (pode levar de 1 a 3 minutos na primeira vez)
python -m pip install -r requirements.txt

# 3. Inicia o servidor na porta 8000
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

✅ **Como saber se deu certo?**
Quando aparecer a mensagem `Application startup complete.` e `Uvicorn running on http://0.0.0.0:8000`, o servidor está ligado! **Deixe essa janela do terminal aberta** (não feche enquanto estiver usando o sistema).

---

### Passo 4 — Ligar a Interface Visual (Frontend) e Abrir no Navegador

Agora vamos abrir a tela do aplicativo:

1. Abra uma **segunda janela de terminal** (mantenha a primeira aberta!) na pasta principal `aqualert`.
2. Digite os dois comandos abaixo, apertando **Enter** após cada um:

```powershell
# 1. Instala os pacotes visuais do site (apenas na primeira vez)
npm install

# 2. Liga a interface web
npm run dev
```

3. Pronto! Agora abra o seu navegador (Chrome, Edge, etc.) e acesse:
   👉 **[http://localhost:3000](http://localhost:3000)**

---

### 🛠️ Solução Rápida de Problemas Comuns

- **O navegador abriu, mas o gráfico de Alerta NDCI diz "Servidor Offline" ou não carrega a previsão:**
  - Verifique se a **primeira janela do terminal (Passo 3)** continua aberta e rodando na porta `8000`.
- **O comando `python` não foi reconhecido no Windows:**
  - Tente usar `py` no lugar de `python` (por exemplo: `py -m pip install -r requirements.txt` e `py -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload`).
- **Erro de permissão no PowerShell ao rodar `npm`:**
  - Caso o Windows bloqueie scripts no PowerShell, abra o **Prompt de Comando (cmd)** tradicional e rode `npm install` e `npm run dev` por lá.

---

## 1. Visão Geral da Solução

O **Aqualert** é uma plataforma analítica desenvolvida para monitorar a qualidade da água em corpos hídricos estratégicos, com foco na bacia do Rio Paraíba do Sul e no Reservatório do Funil (RJ/SP).

A plataforma combina três frentes complementares:
1. **Sensoriamento Remoto Orbital (Sentinel-2)**: Processamento de imagens multiespectrais do satélite **Copernicus Sentinel-2** via **Google Earth Engine (GEE)**, calculando o índice **NDCI** (*Normalized Difference Chlorophyll Index*) para detectar a presença de clorofila-*a* e florações de algas.
2. **Telemetria Contínua de Qualidade da Água**: Coleta periódica (a cada 2 horas) dos sensores da estação telemétrica de Queluz (**CETESB / SIMQUA**), integrando pH, turbidez, oxigênio dissolvido, condutividade, temperatura e precipitação com persistência em nuvem (**Oracle Autonomous Database / ORDS**) e fallback local automático para demonstração.
3. **Previsão de Floração de Algas (Meta Prophet + AR(1))**: Modelo preditivo de séries temporais que:
   - **Estima o Estado Hoje (*Nowcasting*)**: Preenche a lacuna dos dias recentes em que o reservatório esteve coberto por nuvens desde a última passagem limpa do satélite.
   - **Projeta Horizontes Futuros (*Forecasting*)**: Estima a tendência do índice de clorofila para os próximos **7, 15, 30 ou 45 dias**, classificando o risco operacional em 5 patamares (**Baixo**, **Moderado**, **Atenção**, **Alerta** e **Crítico**).

---

## 2. Arquitetura Técnica

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                           FONTES DE DADOS                              │
 ├──────────────────────────────────┬─────────────────────────────────────┤
 │     Satélite Sentinel-2          │       Estação Telemétrica           │
 │   Copernicus MSI Harmonized      │         CETESB (Queluz)             │
 └─────────────────┬────────────────┴──────────────────┬──────────────────┘
                   │                                   │
                   ▼                                   ▼
 ┌──────────────────────────────────┐ ┌───────────────────────────────────┐
 │       Google Earth Engine        │ │   Scraper Selenium (Headless)     │
 │  Cálculo NDCI/NDWI & XYZ Tiles   │ │    Agendador Periódico (2h)       │
 └─────────────────┬────────────────┘ └────────────────┬──────────────────┘
                   │                                   │
                   │                                   ▼
                   │                  ┌───────────────────────────────────┐
                   │                  │   Oracle Autonomous Database      │
                   │                  │   (ORDS REST API / Fallback Demo) │
                   │                  └────────────────┬──────────────────┘
                   ▼                                   ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                       BACKEND FASTAPI (Porta 8000)                     │
 │  ├── main.py                (Rotas REST, Rate Limit, CORS, TTLCache)   │
 │  ├── gee_service.py         (Rasterização de Camadas de Calor NDCI)    │
 │  ├── gee_sync_service.py    (Sincronização Incremental 270 px / 20m)   │
 │  ├── forecast_service.py    (Inferência Prophet + AR(1), Nowcasting)   │
 │  └── scraper_scheduler.py   (Loop em Background assíncrono de 2 horas) │
 └────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                    FRONTEND REACT 19 + VITE + TAILWIND                 │
 │  ├── Painel (Dashboard): Telemetria, Z-Scores e Estatística In-Situ    │
 │  ├── Reservatório: Mapa Leaflet com Camada Raster Sentinel-2           │
 │  ├── Alerta NDCI: Monitoramento de Floração, Previsão e Risco          │
 │  ├── Equipe: Perfis e informações do time de desenvolvimento          │
 │  └── Avaliação NPS: Coleta de métricas e feedback de usabilidade       │
 └────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Patamares Operacionais de Alerta NDCI

Na aba **Alerta NDCI**, o diagnóstico do horizonte selecionado segue cinco faixas operacionais:

| Patamar | Faixa de NDCI | Significado Operacional para a ETA |
|---|---|---|
| 🔴 **Crítico** | `>= +0.30` | Alta concentração de algas. Priorizar coleta imediata na captação, análise de cianobactérias/cianotoxinas e ajuste de coagulação/carvão ativado. |
| 🟠 **Alerta** | `+0.12 a < +0.30` | Proliferação moderada a alta de algas. Intensificar monitoramento na captação e preparar ajuste de dosagem na ETA. |
| 🟡 **Atenção** | `+0.04 a < +0.12` | Subida inicial da concentração de algas acima da faixa basal. Acompanhar pH e oxigênio dissolvido no reservatório. |
| 🔵 **Moderado** | `-0.05 a < +0.04` | Condição basal típica do reservatório. Manter rotina padrão de monitoramento. |
| 🟢 **Baixo** | `< -0.05` | Baixa atividade de algas na superfície. Operação normal da ETA. |

---

## 4. Especificações Científicas e Módulos

### 4.1. Sensoriamento Remoto e Grade Nativa (`backend/gee_service.py` e `backend/gee_sync_service.py`)
- **Índice NDCI**: $\text{NDCI} = (\text{B5} - \text{B4}) / (\text{B5} + \text{B4})$, utilizando as bandas *Red Edge 1* (`705 nm`) e *Red* (`665 nm`) do Sentinel-2.
- **Suporte Espacial**: Círculo de `350 metros` de diâmetro (`raio = 175 m`) centrado no espelho d'água do Reservatório do Funil (`-22.530116, -44.563914`), projetado na grade nativa **UTM Zona 23S (`EPSG:32723`)** com resolução de **20 metros** (`scale=20`), abrangendo até **270 pixels** únicos de água sem sobreposição amostral (mínimo de 81 pixels limpos por passagem).

### 4.2. Modelo Preditivo (`prophet/` e `backend/forecast_service.py`)
- Combina a decomposição sazonal regularizada do **Meta Prophet** com assimilação causal de estado observado **AR(1)** ($\tau = 6.5\text{ dias}$), ancorando a projeção na última passagem limpa do satélite e calibrando empiricamente os intervalos de incerteza de 80% via validação cruzada temporal em 81 *cutoffs* observacionais.

---

## 5. Configuração Avançada Opcional (`.env`)

Para rodar localmente como demonstração (MVP), **não é necessário criar o arquivo `.env`**.
Caso deseje conectar o projeto à sua própria instância do **Oracle Cloud (ORDS)** ou à sua conta do **Google Earth Engine (GEE)** para baixar novas passagens de satélite ao vivo:

1. Copie o arquivo de exemplo `.env.example` para `.env` na raiz do projeto:
   ```powershell
   Copy-Item .env.example .env
   ```
2. Preencha apenas as variáveis que desejar utilizar no seu `.env` (o arquivo `.env` é ignorado pelo Git para proteger suas credenciais):

```ini
# Oracle Cloud Autonomous Database / ORDS (Opcional — se vazio, usa dados locais de demonstração)
ORACLE_BASE_URL=https://sua-instancia.adb.sa-saopaulo-1.oraclecloudapps.com/ords/admin
ORACLE_TABELA_ENDPOINT=monitoramento_agua
ORACLE_CLIENT_ID=seu_client_id_oauth2_aqui
ORACLE_CLIENT_SECRET=seu_client_secret_oauth2_aqui
ORDS_READ_URL=https://sua-instancia.adb.sa-saopaulo-1.oraclecloudapps.com/ords/admin/publico/agua/

# Google Earth Engine (Opcional — necessário apenas para gerar tiles ao vivo ou novas sincronizações GEE)
GEE_PROJECT_ID=seu-projeto-gee

# Segurança e CORS da API FastAPI
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173
ADMIN_API_TOKEN=

# Frontend Vite
VITE_API_URL=http://localhost:8000
```

---

## 6. Testes Automatizados (Para Desenvolvedores)

Para validar a tipagem TypeScript e executar os 28 testes automatizados do projeto:

```powershell
npm run typecheck
python -m unittest discover -s tests -v
```
