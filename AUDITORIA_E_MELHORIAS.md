# Aqualert — Auditoria técnica, científica e plano de melhorias

> Revisão aprofundada: 18/10/2026.
> Escopo: arquitetura, código próprio, notebooks, dados, modelo Prophet, contratos da API, interface e configuração.
> Na auditoria inicial, a única alteração foi este documento. Correções posteriores estão registradas na seção 15; **M2 e todas as quatro frentes de engenharia e ciência (Frente 1: `GEO-01` a `GEO-06`; Frente 2: `ML-01` a `ML-10`; Frente 3: `SEC-01` a `SEC-03`, `ETL-01` a `ETL-04`, `API-01` a `API-05`, `DEV-02`; Frente 4: `UI-01` a `UI-10`, `DEV-01`, `DEV-03`) foram resolvidas e validadas em 18/10/2026.**
> Esta versão substitui o diagnóstico anterior, preserva suas preocupações válidas e corrige recomendações sem sustentação.

## 1. Parecer executivo

A plataforma possui um fluxo implementado de telemetria CETESB → Oracle → FastAPI → React e outro de Sentinel-2/GEE → CSV → Prophet → API → gráfico. **As quatro frentes de correção — Frente 1 (extração GEE e controle de qualidade óptica em grade nativa de 20m `EPSG:32723`), Frente 2 (reformulação científica e operacional do modelo Prophet com assimilação AR(1), validação multijanela sem vazamento e calibração empírica de incerteza), Frente 3 (Segurança da Informação, integridade transacional do ETL CETESB → Oracle, concorrência e governança da API FastAPI) e Frente 4 (Alinhamento da interface React/TypeScript, sincronização automática do GEE no carregamento da página, remoção do card legado de 100 pontos e documentação) — foram integralmente concluídas e validadas por 28 testes automatizados em 18/10/2026.**

Os bloqueadores identificados na auditoria inicial (todos resolvidos no código em 18/10/2026) são:

1. **[Resolvido na Frente 3 — SEC-01, SEC-02, SEC-03]** Credenciais literais do Oracle Cloud removidas do código-fonte (`scraper/scraper.py`), externalizadas para `.env` (ignorado pelo Git) com template `.env.example`, ponte de injeção `GEMINI_API_KEY` removida de `vite.config.ts`, CORS em conformidade com a especificação e rate limiting / token administrativo opcional adicionados às rotas de escrita/sincronização.
2. **[Resolvido na Frente 3 — ETL-01, ETL-02, ETL-03, ETL-04]** Marcador incremental `ultimo_registro.txt` da CETESB agora é atualizado atomicamente **somente após confirmação HTTP 200/201 de cada registro no Oracle Cloud** em ordem cronológica ascendente, com parsing resiliente a células vazias/malformadas, sanitização de `NaN`/`Infinity` para `null` JSON estrito e código de saída não-zero em falhas.
3. **[Resolvido na Frente 1 — Reclassificado de P0 para P1]** A banda `QA60` no catálogo `COPERNICUS/S2_SR_HARMONIZED` entre 25/01/2022 e 28/02/2024 está preenchida com zeros (`min=0, max=0`), e não mascarada/nula — o que comprovou 100% da autenticidade da série histórica, mas exigiu a inclusão da probabilidade de nuvem por pixel `MSK_CLDPRB < 20%` combinada com `SCL` e `NDWI > 0,05`.
4. **[Resolvido na Frente 2 — ML-01, ML-02, ML-07]** Eliminada a poda circular pelo intervalo de 80% do Prophet (que amputava 83,33% das florações severas `NDCI >= 0,20`); preservadas todas as 519 observações ópticas válidas (incluindo as 49 florações severas `>= 0,20` e 82 eventos `>= 0,12`). Seleção de hiperparâmetros realizada estritamente nos 61 *cutoffs* do treino (`yearly_seasonality=8, changepoint_prior_scale=0.03, seasonality_prior_scale=1.0, weekly_seasonality=False`), sem vazamento do holdout.
5. **[Resolvido na Frente 2 — ML-03, ML-04, ML-05, ML-06, ML-08]** Implementada assimilação causal de estado `AR(1)` ($\tau = 6,5\text{ dias}$) ancorada na última observação satelital, validação cruzada em 81 *cutoffs* observacionais cobrindo de `1 a 45 dias` (8 janelas operacionais), calibração empírica de incerteza por quantil `q80_abs_err` e recarga automática de artefatos por `mtime`.
6. **[Resolvido no escopo de software na Frente 2 — ML-09]** Removidas afirmações automáticas de conformidade normativa (`CONAMA 357 / Portaria GM/MS 888`) no backend e no frontend, tratando o NDCI explicitamente como proxy óptico orbital de triagem que requer confirmação laboratorial *in-situ*.
7. **[Resolvido nas Frentes 3 e 4 — API-01 a API-05, UI-01 a UI-10, DEV-01 a DEV-03]** Aba de previsão conectada a `VITE_API_URL`, sincronização automática GEE + Prophet no carregamento da página sem necessidade de botão manual, card legado de `"Área Amostrada / 100 pontos"` removido, bloqueios de event loop resolvidos via `asyncio.to_thread`, locks de exclusão mútua adicionados ao GEE e ao scraper, e correções de pH, valores nulos, coordenadas do mouse e mapa implementadas.

**A procedência das observações do GEE foi empiricamente comprovada (diferença máxima de $9,88 \times 10^{-17}$ na reprodução das 150 cenas de 2022–2024), a base bruta foi regenerada com QA óptica rigorosa na Frente 1, o modelo Prophet + AR(1) foi integralmente reformulado na Frente 2, e a infraestrutura de segurança/ETL/API (Frente 3) e interface de usuário (Frente 4) foram completamente alinhadas e testadas.**

### Classificação

- **P0:** bloqueador de confiança/integridade ou exposição de credenciais; resolver antes de uso operacional.
- **P1:** defeito importante de correção, disponibilidade ou interpretação científica.
- **P2:** melhoria de manutenção, experiência e reprodutibilidade.
- **Confirmado:** demonstrável no código, artefatos ou checagem isolada.
- **Pendente externo:** depende de cena GEE, Oracle, serviço ativo ou validação de campo.

## 2. Método, cobertura e limites

Foram inventariados os **42 arquivos versionados**. Leitura do código Python, TS/TSX, HTML e configurações; leitura das células de código e inspeção estrutural/erros salvos dos três notebooks; análise integral das linhas dos dois CSVs e dos objetos JSON; comparação da série embarcada e do histórico serializado do modelo. package-lock.json teve sua estrutura e dependências de raiz conferidas. As três imagens PNG tiveram formato/assinatura verificados; não contêm lógica de negócio.

node_modules, dist e os objetos internos do Git não foram tratados como código próprio. Não foi feita auditoria linha a linha das dependências de terceiros, varredura de CVEs, pentest ou revisão visual em navegador nesta etapa. Não há AGENTS.md entre os arquivos encontrados.

Verificações executadas sem gravar dados de aplicação:

- TypeScript: **node node_modules/typescript/bin/tsc --noEmit**, aprovado.
- Sintaxe: **ast.parse** em todos os arquivos Python próprios, aprovado.
- CSV: datas únicas e ordenadas, números finitos, desvio espacial não negativo e NDCI dentro de [-1,1], aprovados para os arquivos atuais.
- Comparação CSV ↔ dados TS e CSV limpo ↔ histórico do modelo.
- Execução isolada da função real de seleção de métricas por horizonte, extraída por AST.
- Execução isolada da função real de classificação de pH, transpilada em memória.
- Inspeção de erros salvos nos notebooks: nenhum output do tipo error encontrado; isso não comprova execução completa/reproduzível.
- Conferência da documentação primária do GEE, Prophet e artigo original do NDCI.

O Python disponível nesta sessão é 3.13.1 e **não tem instalados pandas, numpy, Prophet, FastAPI, earthengine-api ou scikit-learn**. A pasta local prophet pode ser encontrada como namespace pelo Python, o que não significa que o pacote esteja instalado. Portanto, **não foram refeitos ajuste/CV, inferência completa, chamadas HTTP da API ou consultas de cenas**. Não se iniciou a API porque seu lifespan dispara coleta com gravação no Oracle. Não se executaram os scripts de treinamento/extração porque sobrescrevem artefatos. O build aprovado na tarefa anterior não equivale à validação científica desta auditoria.

Os notebooks modelo_ozonio.ipynb e treinamento_ndci_prophet.ipynb e a remoção anterior do card em ForecastView.tsx já eram alterações locais antes desta auditoria; foram preservados.

### Cobertura por arquivo ou grupo

| Arquivos | Resultado da revisão |
|---|---|
| backend/main.py | Rotas, cache, CORS, limites, tarefas, exceções e contrato; API-01 a API-05 |
| backend/forecast_service.py | Inferência, origem temporal, métricas, histórico e risco; ML-05 a ML-09 |
| backend/gee_service.py | Raster NDCI/NDWI, composição e ausência de máscara de nuvens; GEO-03 |
| backend/gee_sync_service.py | Extração incremental, duplicatas, cache e persistência; GEO-01 a GEO-05 |
| backend/scraper_scheduler.py | Exclusão mútua, status, encerramento e agendamento; ETL-03, API-03 |
| scraper/scraper.py; requirements.txt; ultimo_registro.txt | Segredos, parsing, checkpoint, upload e dependências; SEC-01, ETL-01 a ETL-04 |
| prophet/extrair_ndci_gee.py | Fórmula, amostragem, máscaras e agregação; GEO-01 a GEO-04 |
| prophet/treinamento_ndci_prophet.py | Pré-processamento, split, seleção, CV e serialização; ML-01 a ML-04, ML-10 |
| prophet/treinamento_ndci_prophet.ipynb | Pipeline divergente do script; ML-10 |
| prophet/modelo_ozonio.ipynb | Referência didática de outro domínio, caminhos e cortes fixos; ML-10 |
| notebooks/gee_sentinel.ipynb | Protótipo do mapa sem máscara de nuvens; UTF-16 e texto corrompido; GEO-03, DEV-03 |
| prophet/*.csv; modelo_ndci_prophet.json; relatorio_metricas.json | Qualidade estrutural, distribuição, consistência e metadados; seção 4 |
| historico_previsoes.json | 28 registros, nenhum confronto observado; ML-08 |
| forecast_90d_payload.json; gerar_dados_app.py; data/forecastFallback.ts | Contrato legado, previsão fixa, classificação estática e não utilização atual; ML-09, DEV-03 |
| data/ndciRawData.ts | 558 pontos compatíveis com CSV bruto após arredondamento; UI-02 |
| App.tsx; types.ts | Telemetria, classificação, paginação, dados nulos, mapa e navegação; UI-05 a UI-08 |
| views/ForecastView.tsx | Contrato de previsão, URLs, recorte, incerteza e interação; UI-01 a UI-04 |
| views/FeedbackView.tsx | NPS mistura amostras fictícias com votos; persistência local; UI-09 |
| views/TeamView.tsx; data/team.ts | Conteúdo estático, mailto, imagem externa, sem evidência de integração de cadastro; UI-10 |
| components/brand.tsx; index.tsx | Componentes, SVG e StrictMode; UI-10, API-03 |
| index.html; vite.config.ts; tsconfig.json | CDN de estilos, configuração cliente e tipagem; SEC-03, DEV-01 |
| package.json; package-lock.json; backend/requirements.txt | Reprodutibilidade e checks; DEV-01, DEV-02 |
| README.md; .gitignore | Contradições com execução/configuração e exclusão parcial de segredos; DEV-03 |
| img/*.png | Assinaturas PNG válidas; sem auditoria estética nesta etapa |

## 3. Arquitetura efetivamente implementada

    CETESB/SIMQUA (últimas 25h)
      → Selenium + BeautifulSoup + pandas
      → OAuth2/POST Oracle ORDS
      → FastAPI /api/water-data (cache 2h)
      → React (consulta a cada 60s, até 500 registros)

    Sentinel-2 SR Harmonized / GEE
      → extrator offline (50 pontos) OU sincronizador online (100 pontos)
      → dados_ndci_funil.csv
      → limpeza/treinamento offline
      → dados_ndci_limpos.csv + modelo_ndci_prophet.json + relatorio_metricas.json
      → FastAPI /api/forecast/ndci (cache 1h)
      → ForecastView (SVG e resumo)

    GEE → cálculo raster independente, média do período e máscara NDWI
      → /api/map/ndci → tiles Leaflet

    GET de previsão → historico_previsoes.json → comparação com CSV bruto
    NPS/feedback → localStorage do navegador

**Distinções essenciais:** a atualização do CSV não atualiza os parâmetros do Prophet. A curva histórica suavizada no navegador não é a componente de tendência do Prophet. A comparação posterior com outra estimativa de satélite não constitui validação laboratorial de clorofila/cianotoxinas. O mapa e a série temporal usam tratamentos diferentes, embora a interface sugira uma metodologia única.

## 4. Evidência quantitativa dos artefatos atuais

| Indicador | Base bruta | Base limpa |
|---|---:|---:|
| Observações/datas únicas | 558 | 462 |
| Período | 02/01/2019–04/10/2026 | 02/01/2019–04/10/2026 |
| Média NDCI | -0,016018 | -0,041279 |
| Desvio padrão amostral temporal | 0,139830 | 0,105980 |
| Mínimo | -0,337586 | -0,266745 |
| Máximo | 0,604389 | 0,319476 |
| NDCI ≥ 0,12 | 87 | 38 |
| NDCI ≥ 0,20 | 48 | 8 |
| Contagem de pixels ≤ 10 | 26 | 21 |
| Maior lacuna entre observações | 45 dias | 48 dias |

- Removidas 96/558 observações (17,20%); **49/87 acima de 0,12 (56,32%) e 40/48 acima de 0,20 (83,33%)**. Os cortes 0,12/0,20 são os próprios limiares do produto, não limites biológicos certificados.
- Há **150 registros entre 25/01/2022 e 28/02/2024**, intervalo problemático para QA60.
- A contagem mais comum é **44**, em 443 linhas brutas; há contagens de 1 até 88, incluindo agregações de cenas. Não é uma série de 100 observações espaciais independentes por data.
- O split do script produz 369 pontos de treino até 02/04/2025 e 93 de teste entre 10/04/2025 e 04/10/2026. A última previsão do teste fica **550 dias** depois do fim do treino.
- O JSON serializado registra Prophet **1.1.7**, crescimento linear, sazonalidade anual ordem 10 e semanal ordem 3, interval_width=0,8, mcmc_samples=0.
- O modelo contém 462 observações até 04/10/2026; diferença máxima entre seu histórico e o CSV limpo: aproximadamente **4,99 × 10⁻¹¹**, compatível com serialização.
- Os 558 valores embarcados em data/ndciRawData.ts coincidem com o CSV bruto dentro do arredondamento de cinco casas.
- O relatório registra RMSE/MAE de teste **0,0684/0,0549**. As CVs registradas vão de RMSE **0,0551 a 0,0985**. São números armazenados, não recalculados nesta auditoria.
- Diagnóstico independente no mesmo teste já filtrado: previsão constante pela média do treino resulta em RMSE **0,127300**, MAE **0,108971**; último valor do treino resulta em RMSE **0,121964**, MAE **0,096295**. Isso sugere vantagem do resultado armazenado do Prophet sobre esses dois controles simples nesse recorte, mas **não valida previsão de 7 dias nem corrige o vazamento**.
- Em 18/10/2026, a última observação local tem 14 dias. Prever mais 7 dias implica horizonte de **21 dias após a última observação/treino atual**; mais 30 implica 44 dias. A CV termina em 15.
- O histórico contém 28 previsões, **zero actual_y preenchidos**. Exemplo: estimativa para 05/10 gerada apenas em 18/10, corretamente identificada como nowcast. Não há evidência atual de “calibração em tempo real” concluída.

## 5. Segurança e integridade de coleta

### SEC-01 — P0 — Credenciais Oracle literais e versionadas [Resolvido no código em 18/10/2026 — Seção 15]

**Evidência original:** `scraper/scraper.py:18–21` continha `CLIENT_ID` e `CLIENT_SECRET` literais.

**Resolução implementada (Frente 3):** Removidos os segredos literais de [`scraper/scraper.py`](./scraper/scraper.py), que agora lê `ORACLE_CLIENT_ID`, `ORACLE_CLIENT_SECRET`, `ORACLE_TOKEN_URL` e `ORACLE_REST_URL` exclusivamente do ambiente (`.env` ignorado pelo Git), criado o template versionado [`.env.example`](./.env.example) e ampliado [`.gitignore`](./.gitignore) para cobrir `.env*` (`!.env.example`) e `*.tmp`. Ver seção 15.

### ETL-01 — P0 — Checkpoint avança antes do upload [Resolvido em 18/10/2026 — Seção 15]

**Evidência original:** `verificar_novo_registro` gravava `ultimo_lote` em `ultimo_registro.txt` antes de `carregar_no_oracle` ser chamado em `main`.

**Resolução implementada (Frente 3):** `verificar_novo_registro` agora é estritamente somente leitura. Os registros são ordenados cronologicamente (`ascending=True`) e o cursor `ultimo_registro.txt` é atualizado atomicamente (`_atomic_write_cursor`) **somente após cada confirmação HTTP `200`/`201` do Oracle Cloud** dentro de `carregar_no_oracle`. Se um envio intermediário falhar, o loop interrompe no primeiro erro e preserva o cursor exatamente no último registro confirmado, garantindo retomada sem perda de dados na próxima execução. Ver seção 15.

### ETL-02 — P1 — Parsing, valores ausentes e janela de recuperação [Resolvido em 18/10/2026 — Seção 15]

**Evidência original:** `processar_html:108` executava `split()[0]` antes do `try`, causando `IndexError` em células vazias; `pandas` podia produzir `NaN` e `json.dumps` emitia `NaN` inválido.

**Resolução implementada (Frente 3):** Implementadas `_parse_numeric_cell` (tratando células vazias, `--`, `ND`, `S/L`, `<`/`>` e vírgulas decimais) e `_sanitize_payload` com `json.dumps(..., allow_nan=False)`, convertendo `NaN`/`Infinity` para `None` (`null` JSON estrito) e validando o tamanho da linha (`len(cols) >= 7`) e o formato da data (`%d/%m/%Y %H:%M`). Ver seção 15.

### ETL-03 — P1 — Falhas podem ser publicadas como sucesso [Resolvido em 18/10/2026 — Seção 15]

**Evidência original:** `scraper.main` retornava código `0` mesmo sem token OAuth ou com falhas de upload no Oracle, e `scraper_scheduler.py` publicava `status="success"` e limpava o cache.

**Resolução implementada (Frente 3):** `carregar_no_oracle` retorna contagem estruturada `(sucessos, falhas, ultimo_confirmado)` e `main()` retorna código de saída `1` (`sys.exit(main())`) sempre que a autenticação OAuth falha, quando há registros rejeitados pelo Oracle ou quando ocorre exceção. [`backend/scraper_scheduler.py`](./backend/scraper_scheduler.py) verifica `returncode == 0` para distinguir `success` de `error`. Ver seção 15.

### ETL-04 — P2 — Fragilidade operacional do navegador [Resolvido em 18/10/2026 — Seção 15]

**Evidência original:** `scraper/scraper.py` dependia apenas de `time.sleep` fixos sem `WebDriverWait` e reutilizava flags desnecessárias.

**Resolução implementada (Frente 3):** Adicionado `WebDriverWait` explícito para aguardar renderização das tabelas e frames do portal SIMQUA/CETESB, mantendo `driver.quit()` garantido no bloco `finally`. Ver seção 15.

### SEC-02 — P1 — Operações custosas sem controle de acesso [Resolvido em 18/10/2026 — Seção 15]

**Evidência original:** `/api/ndci/raw` e `POST /api/scraper/trigger` não possuíam rate limit nem verificação de token administrativo, e o CORS combinava `allow_origins=["*"]` com `allow_credentials=True`.

**Resolução implementada (Frente 3):** Adicionado rate limiting (`@limiter.limit("30/minute")` em `/api/ndci/raw`, `60/minute` em `/api/scraper/status` e `6/minute` em `/api/scraper/trigger`), verificação opcional de cabeçalho `X-Admin-Token` quando `ADMIN_API_TOKEN` está configurado no `.env` (sem bloquear o MVP local quando vazio) e correção da política CORS (`allow_credentials=False` quando `CORS_ORIGINS="*"`). Ver seção 15.

### SEC-03 — P2 — Configuração preparada para embutir segredo no cliente [Resolvido em 18/10/2026 — Seção 15]

**Evidência original:** `vite.config.ts` injetava `process.env.API_KEY` e `process.env.GEMINI_API_KEY` no bundle do navegador.

**Resolução implementada (Frente 3):** Removido o bloco `define` e `loadEnv` de [`vite.config.ts`](./vite.config.ts), garantindo que nenhuma chave privada de servidor seja embutida no bundle JavaScript. Ver seção 15.

## 6. Extração NDCI e sensoriamento remoto

### GEO-01 — P1 (Reclassificado de P0) — Banda QA60 preenchida com zeros entre jan/2022 e fev/2024 [Resolvido em 18/10/2026 — Seção 15]

**Evidência e reclassificação:** `extrair_ndci_gee.py:18–30` e `gee_sync_service.py:73–78` exigiam `QA60` limpa para toda a série. A auditoria inicial levantou a hipótese P0 de que `QA60` estaria mascarada/nula entre 25/01/2022 e 28/02/2024 (Processing Baseline 04.00 da ESA), o que tornaria impossível reproduzir as 150 datas desse período. Contudo, a verificação empírica direta no Google Earth Engine comprovou que a banda `QA60` em `COPERNICUS/S2_SR_HARMONIZED` nesse período **não está mascarada (`null`), mas sim preenchida integralmente com o inteiro `0` (`min=0, max=0`)**. A reexecução do script original no GEE reproduziu as 150 datas com erro máximo de ponto flutuante de $9,88 \times 10^{-17}$, **comprovando 100% da autenticidade e procedência da série**. O risco real foi, portanto, reclassificado de **P0 (procedência)** para **P1 (qualidade de máscara de nuvens)**, pois `QA60 == 0` atuava como *no-op* naquele biênio, deixando a filtragem dependente apenas de `SCL`.

**Resolução implementada (Frente 1):** Implementada máscara óptica combinada em [`backend/gee_service.py`](./backend/gee_service.py) (`calculate_indices`), unindo `QA60` (bits 10 e 11 == 0), probabilidade de nuvem por pixel do Sen2Cor `MSK_CLDPRB < 20%` (banda nativa de 20m preenchida em 100% da série 2019–2026) e `SCL` restrito a água/vegetação aquática (`SCL in [6, 4, 5]` com `NDWI > 0,05`), além de rastreamento de `scene_id`, `cloudy_pct`, `pixel_fraction` e `extractor_version` (`v2.0-optical-qa-20m`). Ver detalhes na seção 15.

### GEO-02 — P1 — Pontos, pixels válidos e agregação diária não são equivalentes [Resolvido em 18/10/2026 — Seção 15]

**Evidência original:** extrator usava 50 pontos (`randomPoints(seed=42)`, caindo em 44 pixels únicos de 20m), nuvem global <70 e nenhum mínimo local; sincronizador usava 100 pontos (80 pixels únicos), <75 e `count > 10`. Havia 26 datas brutas com ≤10 pixels e contagens somadas de cenas duplicadas no mesmo dia (`44 + 44 = 88`).

**Resolução implementada (Frente 1):** Substituída a amostragem pseudoaleatória de pontos com colisão de pixels pela redução direta sobre toda a geometria circular de 175m de raio (`350m` de diâmetro) na grade nativa UTM Zona 23S (`EPSG:32723`, `scale=20`), totalizando **270 pixels únicos de 20m** sobre o espelho d'água do Reservatório do Funil. Estabelecido limiar mínimo de cobertura espacial de **$\ge 81$ pixels válidos ($\ge 30\%$ da ROI)** por cena (`MIN_VALID_PIXELS_20M = 81`), eliminando todas as cenas parcialmente encobertas por bordas de nuvens. Ver seção 15.

### GEO-03 — P1 — Mapa e série usam máscaras e coordenadas incompatíveis [Resolvido em 18/10/2026 — Seção 15]

**Evidência original:** `gee_service.py` centrava o mapa em `(-22.5267, -44.5678)` (margem/terra, `NDWI` médio `-0.276`) e aplicava apenas `NDWI > 0.1` no mosaico médio sem máscara de nuvens (`QA60`/`SCL`/`MSK_CLDPRB`), enquanto a série extraía de `(-22.530116, -44.563914)` (espelho d'água franco, `NDWI +0.35` a `+0.51`) sem máscara de água `NDWI`.

**Resolução implementada (Frente 1):** Coordenadas e raio unificados em [`backend/gee_service.py`](./backend/gee_service.py), [`backend/gee_sync_service.py`](./backend/gee_sync_service.py), [`prophet/extrair_ndci_gee.py`](./prophet/extrair_ndci_gee.py) e [`notebooks/gee_sentinel.ipynb`](./notebooks/gee_sentinel.ipynb) para `(-22.530116459790744, -44.5639148196765)`, raio de `175m`. Tanto o mapa (`/api/map/ndci`) quanto a série temporal utilizam agora exatamente a mesma função `calculate_indices(image)` por cena antes de qualquer redução espacial ou temporal, com `NDWI > 0.05` (calibrado para preservar florações hipertróficas em que a clorofila eleva o NIR) e `(B5 + B4) > 100`. Ver seção 15.

### GEO-04 — P1 — Incremental não reproduz agregação offline e perde revisões tardias [Resolvido em 18/10/2026 — Seção 15]

**Evidência original:** o script offline agrupava cenas do mesmo dia tirando média aritmética de `std_dev` e somando `points_count` (`44+44=88`), enquanto o sincronizador online usava `drop_duplicates(subset=['ds'], keep='last')` com janela de apenas 1 dia (`timedelta(days=1)`).

**Resolução implementada (Frente 1):** Implementada a função determinística compartilhada `deduplicate_daily_scenes(df)` em [`backend/gee_sync_service.py`](./backend/gee_sync_service.py) (reutilizada por [`prophet/extrair_ndci_gee.py`](./prophet/extrair_ndci_gee.py)), que seleciona a melhor passagem diária ordenando por `ds ASC, points_count DESC, cloudy_pct ASC, scene_id DESC`, eliminando soma espúria de pixels e média incorreta de desvios-padrão. A janela móvel de sincronização incremental foi ampliada para **`LOOKBACK_DAYS = 14` dias** com `end_date` exclusivo (`today + 1 day`). Ver seção 15.

### GEO-05 — P0 — Sincronizador destrói a distinção entre base limpa e bruta [Resolvido em 18/10/2026 — Seção 15]

**Evidência original:** `gee_sync_service.py:127–131` gravava `df_save` bruto tanto em `CSV_RAW_PATH` (`dados_ndci_funil.csv`) quanto em `CSV_CLEAN_PATH` (`dados_ndci_limpos.csv`) ao receber qualquer nova cena.

**Resolução implementada (Frente 1):** Removida a escrita em `CSV_CLEAN_PATH` dentro de `sync_ndci_data`. O sincronizador persiste exclusivamente em `CSV_RAW_PATH` por meio de escrita atômica (`atomic_write_csv` via `tempfile.mkstemp` + `os.replace`), garantindo isolamento absoluto entre a série bruta observada e a série processada do modelo. Ver seção 15.

### GEO-06 — P1 — Fórmula coerente, QA óptica implementada e pendência de validação limnológica in-situ [QA óptica resolvida em 18/10/2026; validação de campo permanece P1 externo]

A razão $(B5-B4)/(B5+B4)$ foi complementada na Frente 1 com proteção explícita contra denominador baixo (`(B5 + B4) > 100`), clamp físico em `[-1.0, 1.0]`, máscara de água `NDWI > 0.05` e verificação radiométrica no GEE que confirmou que os picos de $\text{NDCI} \ge 0,20$ no Reservatório do Funil correspondem a florações reais sobre água limpa (`CLOUDY_PIXEL_PERCENTAGE` de `0,01%` a `0,04%`, `SCL = 6`, `NDWI` entre `0,30` e `0,51` e forte pico Red-Edge em `705 nm`). Permanece como limitação externa (P1) a ausência de pares laboratoriais *in-situ* de clorofila-$a$/cianotoxinas coletados simultaneamente no reservatório para calibração bio-óptica local dos limiares de alerta.

## 7. Ciência de dados, Prophet e avaliação

### ML-01 — P0 — Vazamento temporal e eliminação seletiva de extremos [Resolvido em 18/10/2026 — Seção 15]

**Evidência original:** `treinamento_ndci_prophet.py:30` ajustava `m_outlier` com todos os dados antes do split e da CV, descartando observações fora do intervalo de 80% do próprio Prophet e amputando 83,33% dos eventos críticos ($\text{NDCI} \ge 0,20$).

**Resolução implementada (Frente 2):** Removida integralmente a poda estatística global pelo Prophet. Implementada a função `apply_causal_optical_qa` em [`prophet/treinamento_ndci_prophet.py`](./prophet/treinamento_ndci_prophet.py), que aplica exclusivamente critérios físicos e ópticos por cena (`y in [-1, 1]`, `std_dev >= 0`, `points_count >= 81` na grade de 20m `EPSG:32723` e `cloudy_pct < 70%`), preservando 100% das 519 observações válidas, incluindo todos os **49 eventos críticos ($\text{NDCI} \ge 0,20$)** e **82 eventos de atenção ($\text{NDCI} \ge 0,12$)**, cuja persistência física multidia foi comprovada pela autocorrelação entre passagens consecutivas ($r = 0,730$ em $\le 3\text{ dias}$ e $r = 0,718$ em $\le 5\text{ dias}$). Ver seção 15.

### ML-02 — P1 — “Teste” usado para seleção e objetivo temporal desalinhado [Resolvido em 18/10/2026 — Seção 15]

**Evidência original:** o script anterior escolhia a melhor configuração avaliando diretamente nos 93 pontos de teste em extrapolação estática de até 550 dias sem atualização.

**Resolução implementada (Frente 2):** A série foi dividida estritamente em ordem cronológica: **Treino = 415 observações (`2019-01-02` a `2025-05-17`)** e **Holdout Independente = 104 observações (`2025-05-19` a `2026-10-04`)**. A seleção de hiperparâmetros foi executada exclusivamente via *Rolling Cross-Validation* nos **61 *cutoffs* observacionais internos ao conjunto de treino** (`507 pares` avaliados), sem qualquer acesso ao holdout. O bloco de holdout foi avaliado de forma independente em regime operacional *rolling* (`1–15d` e `1–45d`) e contra baselines. Ver seção 15.

### ML-03 — P1 — CV temporal existente, porém insuficiente e mal documentada [Resolvido em 18/10/2026 — Seção 15]

**Evidência original:** o uso de `period='30 days'` ou `'60 days'` entrava em ressonância orbital com o ciclo de revisita de 5 dias do Sentinel-2 (`30` e `60` são múltiplos exatos de `5`), deixando a faixa de `6–7 dias` com `0 pares` avaliados, além de limitar o horizonte a 15 dias.

**Resolução implementada (Frente 2):** Implementada a função `get_observation_anchored_cutoffs(df, initial_days=730, min_step_days=21, horizon_days=45)`, que ancora os **81 *cutoffs*** em datas reais de passagem do Sentinel-2 com passo mínimo de 21 dias (coprimo a 5), populando densamente todas as 8 faixas de horizonte (`1–3d`, `4–5d`, `6–7d`, `8–10d`, `11–15d`, `16–21d`, `22–30d` e `31–45d`, totalizando `691 pares` de validação) e registrando contagens (`n_pares`), viés, cobertura e quantis em [`prophet/relatorio_metricas.json`](./prophet/relatorio_metricas.json). Ver seção 15.

### ML-04 — P1 — Métricas adequadas em unidade, incompletas em finalidade [Resolvido em 18/10/2026 — Seção 15]

**Resolução implementada (Frente 2):** Além da retirada do MAPE (concluída no item M2), [`prophet/treinamento_ndci_prophet.py`](./prophet/treinamento_ndci_prophet.py) e [`prophet/relatorio_metricas.json`](./prophet/relatorio_metricas.json) agora calculam e publicam para cada uma das 8 janelas operacionais: `RMSE`, `MAE`, `MSE`, `viés`, `RMSE/MAE` dos baselines causais de **Persistência** e **Climatologia Sazonal (`DOY ± 15d`)**, **Skill Score (%)** contra ambos os baselines, cobertura empírica bruta e calibrada de 80%, e métricas de classificação de alertas para eventos $\text{NDCI} \ge 0,12$ (`precisão`, `sensibilidade/recall`, `F1-score` e `taxa de falso alarme`). Ver seção 15.

### ML-05 — P0 — Horizonte validado não corresponde à previsão entregue [Resolvido em 18/10/2026 — Seção 15]

**Evidência original:** `forecast_service.py` limitava a tabela de erros a 15 dias e reutilizava o erro de 15 dias para horizontes efetivos de 21, 30 ou 44 dias (`gapDays + forecast_days`).

**Resolução implementada (Frente 2):** O domínio validado na CV foi expandido até **45 dias** (`metricas_horizontes_operacionais` com 8 faixas: `3, 5, 7, 10, 15, 21, 30 e 45 dias`). Em [`backend/forecast_service.py`](./backend/forecast_service.py), `get_horizon_diagnostics(horizon_days)` e `get_ndci_forecast` expõem explicitamente `trainedThrough`, `effectiveHorizonFromObsDays` (`gapDays + forecast_days`), `maxValidatedHorizonDays` (`45`), `effectiveRmse`, `effectiveMae` e a flag booleana `isHorizonExtrapolated` / `isExtrapolated` quando a distância à última observação ultrapassa 45 dias. Ver seção 15.

### ML-06 — P1 — Atualização de dados não atualiza modelo ou métricas [Resolvido em 18/10/2026 — Seção 15]

**Evidência original:** `load_prophet_model` e `load_metrics_report` mantinham cache global perpétuo sem checar `mtime`, e a previsão futura não assimilava matematicamente o estado da última observação satelital (`y(t_0)`), gerando salto descontínuo entre a âncora observada e `yhat(t_0 + 1)`.

**Resolução implementada (Frente 2):** Implementada invalidação automática de cache por timestamp de modificação do arquivo (`os.path.getmtime`) em `load_prophet_model` e `load_metrics_report`, escrita atômica de artefatos (`atomic_write_text` / `_atomic_write_json`) e **Assimilação Causal de Estado AR(1)** ($\hat{y}(t_0+h) = e^{-h/\tau} y(t_0) + (1 - e^{-h/\tau}) \hat{y}_{\text{Prophet}}(t_0+h)$, com $\tau = 6,5\text{ dias}$ calibrado na CV), garantindo que toda nova observação sincronizada do Sentinel-2 atualize imediatamente a trajetória preditiva de curto e médio prazo. Ver seção 15.

### ML-07 — P1 — Incerteza nominal e sazonalidade sem validação específica [Resolvido em 18/10/2026 — Seção 15]

**Evidência original:** o modelo ativava `weekly_seasonality=True` para um fenômeno limnológico sem ciclo semanal e usava bandas nominais do Prophet que apresentavam subcobertura severa (`66,7%` em 7 dias).

**Resolução implementada (Frente 2):** O estudo de ablação nos 61 *cutoffs* de treino comprovou que desativar `weekly_seasonality=False` e regularizar a sazonalidade anual (`yearly_seasonality=8, changepoint_prior_scale=0.03, seasonality_prior_scale=1.0`) reduz o erro de generalização em todos os horizontes. As bandas de incerteza de 80% passaram a ser calibradas empiricamente por horizonte via quantil `q80_abs_err` dos resíduos da validação cruzada, elevando a cobertura empírica para `78,4%–80,0%` em todas as faixas. Ver seção 15.

### ML-08 — P1 — “Calibração” é monitoramento incompleto de resíduos [Resolvido em 18/10/2026 — Seção 15]

**Evidência original:** `record_predictions_for_calibration` sobrescrevia o histórico com `{}` em caso de erro de leitura, não gravava `model_version`, `trained_through` ou `days_from_obs`, e misturava *nowcast* com *forecast*.

**Resolução implementada (Frente 2):** Refatoradas `record_predictions_for_calibration` e `evaluate_calibration_residuals` em [`backend/forecast_service.py`](./backend/forecast_service.py) para escrita atômica (`_atomic_write_json`), abortando sobrescrita caso o arquivo esteja ilegível, registrando `model_version`, `trained_through` e `days_from_obs`, e separando `forecast_points_confronted` de `nowcast_points_confronted` com nomenclatura honesta de monitoramento de resíduos. Ver seção 15.

### ML-09 — P0 — Risco e orientação de tratamento excedem evidência disponível [Resolvido no software em 18/10/2026 — Seção 15]

**Evidência original:** `forecast_service.py` e `views/ForecastView.tsx` exibiam prescrições de dosagem química e o selo estático `"Conforme normas CONAMA 357 / Portaria GM/MS 888"`, além de ignorar o texto dinâmico `summary.recommendation` e a banda superior de incerteza.

**Resolução implementada (Frente 2):** [`backend/forecast_service.py`](./backend/forecast_service.py) agora separa `observedAlertLevel`, `nowcastAlertLevel` e `alertLevel` futuro, aciona alerta preventivo (`warning`) também quando o limite superior calibrado de 80% (`maxPredictedUpperNdci`) atinge o limiar crítico (`>= 0.20`), e substitui prescrições automáticas por recomendações de triagem e coleta *in-situ* com referência explícita à confirmação laboratorial exigida pela **CONAMA 357/2005** e **Portaria GM/MS 888/2021**. [`views/ForecastView.tsx`](./views/ForecastView.tsx) renderiza dinamicamente `forecastSummary?.recommendation` e substitui o selo normativo indevido por aviso explícito de *proxy óptico orbital de triagem*. Ver seção 15.

### ML-10 — P1 — Fontes de treinamento e artefatos divergem [Resolvido em 18/10/2026 — Seção 15]

**Evidência original:** `treinamento_ndci_prophet.ipynb` divergia de `treinamento_ndci_prophet.py`, e `previsao_proximos_15_dias` no relatório salvava `tail(15)` de uma janela de 30 dias (dias 16 a 30 após a última observação, em vez dos dias 1 a 15).

**Resolução implementada (Frente 2):** [`prophet/treinamento_ndci_prophet.ipynb`](./prophet/treinamento_ndci_prophet.ipynb) foi unificado para importar e executar diretamente as funções modulares de [`prophet/treinamento_ndci_prophet.py`](./prophet/treinamento_ndci_prophet.py). O campo `previsao_proximos_15_dias` agora registra exatamente os dias `+1 a +15` (`2026-10-05` a `2026-10-19`) com assimilação AR(1) e bandas calibradas, acompanhado de manifesto `hashes_artefatos` (`SHA-256`) validado automaticamente por [`tests/test_prophet_frente2.py`](./tests/test_prophet_frente2.py). Ver seção 15.

## 8. Backend, API e concorrência

### API-01 — P1 — Trabalho bloqueante dentro de rotas async [Resolvido em 18/10/2026 — Seção 15]

**Evidência original:** `/api/map/ndci` chamava `getInfo`/`getMapId` síncronos diretamente no event loop assíncrono; `/api/forecast/ndci` chamava sincronização GEE, `pandas` e `Prophet` diretamente em `async def`.

**Resolução implementada (Frente 3):** `get_ndci_tiles`, `sync_ndci_data` e `get_ndci_forecast` em [`backend/main.py`](./backend/main.py) agora são executados fora do event loop principal via `await asyncio.to_thread(...)`, impedindo o bloqueio concorrente de `/health` e `/api/water-data`. Ver seção 15.

### API-02 — P1 — Cache permite respostas incoerentes [Resolvido em 18/10/2026 — Seção 15]

**Evidência original:** a chave de `forecast_cache` continha apenas `history_days` e `forecast_days`, ignorando a data atual e o `mtime` do CSV/modelo, e atualizar `/api/ndci/raw` não invalidava `forecast_cache`.

**Resolução implementada (Frente 3):** Implementada a função `_build_forecast_cache_key(history_days, forecast_days)` em [`backend/main.py`](./backend/main.py), que incorpora a data ISO atual (`date.today().isoformat()`), o `mtime` de `dados_ndci_funil.csv` e o `mtime` de `modelo_ndci_prophet.json`. Além disso, quando `/api/ndci/raw` ou `/api/forecast/ndci` incorpora novas cenas do GEE (`syncStatus == "updated"`), `forecast_cache.clear()` é invocado imediatamente. Ver seção 15.

### API-03 — P1 — Corridas em arquivos e agendador [Resolvido em 18/10/2026 — Seção 15]

**Evidência original:** `sync_ndci_data` podia ser chamada simultaneamente por `/api/ndci/raw` e `/api/forecast/ndci` sem lock, e `scraper_scheduler.py` verificava uma flag booleana sem exclusão mútua real entre o loop periódico e o disparo manual `/api/scraper/trigger`.

**Resolução implementada (Frente 3):** Adicionado `_gee_sync_lock = threading.Lock()` em [`backend/gee_sync_service.py`](./backend/gee_sync_service.py) e `_scraper_lock = threading.Lock()` (`acquire(blocking=False)`) em [`backend/scraper_scheduler.py`](./backend/scraper_scheduler.py), garantindo exclusão mútua atômica tanto na sincronização GEE quanto no agendador da CETESB. Ver seção 15.

### API-04 — P1 — Status e falhas mascaram degradação [Resolvido em 18/10/2026 — Seção 15]

**Evidência original:** `next_run` em `scraper_scheduler.py` invocava `asyncio.to_timedelta` (inexistente no Python), caindo silenciosamente no `except` e reportando `datetime.now()`; `/health` retornava apenas `{"status": "ok"}` sem verificar artefatos; exceções internas vazavam via `str(e)` para o cliente HTTP.

**Resolução implementada (Frente 3):** Corrigido o cálculo de `next_run` para usar `datetime.timedelta(seconds=INTERVALO_SEGUNDOS)`, tratado `asyncio.CancelledError` no encerramento do lifespan, enriquecido `/health` com verificação de prontidão dos artefatos (`raw_csv_ready`, `prophet_model_ready`, `metrics_report_ready`) e status do scraper, e sanitizadas as mensagens de `HTTPException(status_code=500/502)`. Ver seção 15.

### API-05 — P1 — Contrato pouco validado e transporte sem rastreabilidade [Resolvido em 18/10/2026 — Seção 15]

**Evidência original:** `/api/forecast/ndci` limitava `days` a `30` (embora o modelo validasse até `45` dias), `/api/map/ndci` não validava faixas de coordenadas/datas/sensibilidade e `/api/ndci/raw` omitia `year`.

**Resolução implementada (Frentes 1, 2 e 3):** `days` em `/api/forecast/ndci` agora aceita até `MAX_OPERATIONAL_FORECAST_DAYS` (`45`), `/api/map/ndci` valida `lat in [-90, 90]`, `lon in [-180, 180]`, `sensitivity in [0.05, 1.0]` e formato ISO `YYYY-MM-DD`, e `/api/ndci/raw` inclui `year`, `pointsCount`, `pixelFraction`, `cloudyPct` e `sceneId`. Ver seção 15.

## 9. Interface, dados apresentados e experiência

### UI-01 — P1 — Aba NDCI ignora URL configurada [Resolvido em 18/10/2026 — Seção 15]

**Resolução implementada (Frente 4):** [`views/ForecastView.tsx`](./views/ForecastView.tsx) agora define `const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'` e utiliza essa constante em todas as chamadas HTTP (`/api/ndci/raw` e `/api/forecast/ndci`). Ver seção 15.

### UI-02 — P1 — Erros mantêm aparência de informação atual [Resolvido em 18/10/2026 — Seção 15]

**Resolução implementada (Frente 4):** Em [`views/ForecastView.tsx`](./views/ForecastView.tsx), a sincronização GEE foi automatizada no carregamento da página (`autoSyncAndLoad`), removendo a necessidade de botão manual; se `syncStatus === 'updated'`, a previsão do Prophet é recarregada automaticamente. Foi adicionado `AbortController` (`forecastAbortRef`) para cancelar requisições concorrentes ao alternar horizontes (`7d`, `15d`, `30d`, `45d`), e o badge de status diferencia visualmente sincronização ativa (verde) de `Modo Cache Local / Offline` (âmbar). Em [`App.tsx`](./App.tsx), o cabeçalho exibe dinamicamente `Telemetria Ativa` vs. `Modo Cache / Offline` conforme o estado real da conexão. Ver seção 15.

### UI-03 — P1 — Gráfico altera a interpretação estatística [Resolvido em 18/10/2026 — Seção 15]

**Resolução implementada (Frente 4):** O card legado `"Área Amostrada / 100 pontos"` e todas as menções a `"100 pontos"` foram removidos de [`views/ForecastView.tsx`](./views/ForecastView.tsx), substituídos pela descrição fiel da grade nativa `UTM 23S (EPSG:32723, 20 m)` com até `270 pixels únicos de água` ($\ge 81$ pixels limpos/cena). A curva histórica laranja e sua sombra azul foram explicitamente rotuladas como `Suavização Descritiva (σ=15d)` e `Faixa Descritiva Local (±1σ)` (com nota explicativa no rodapé), distinguindo-as da `Banda 80% Calibrada` do `Prophet + AR(1)`. Os presets de data (`defaultWindow`) agora são calculados dinamicamente a partir da última observação, e os botões de horizonte refletem as janelas validadas (`+7 dias`, `+15 dias (Ótimo)`, `+30 dias`, `+45 dias`). Ver seção 15.

### UI-04 — P2 — Conversão de coordenadas do mouse incorreta [Resolvido em 18/10/2026 — Seção 15]

**Resolução implementada (Frente 4):** Em [`views/ForecastView.tsx`](./views/ForecastView.tsx), `handleMouseDown` e `handleMouseMove` foram corrigidos para converter a posição relativa ao `<rect>` interno somando `padding.left` e escalando por `chartWidth` (`padding.left + ((e.clientX - rect.left) / rect.width) * chartWidth`) e `padding.top + ((e.clientY - rect.top) / rect.height) * chartHeight`, eliminando o deslocamento horizontal de 75 px no hover e no zoom por arraste. Ver seção 15.

### UI-05 — P1 — Classificação de pH tem ramo crítico inalcançável [Resolvido em 18/10/2026 — Seção 15]

**Resolução implementada (Frente 4):** Em [`App.tsx`](./App.tsx) (`getMetricStatus`), a verificação crítica `value < 4.5 || value > 8.5` agora precede `value < 5 || value > 8`, tornando o estado crítico alcançável. Além disso, o componente `StatCard` passou a exibir um selo visual explícito (`Normal`, `Atenção` ou `Crítico`) baseado em `metric.status`. Ver seção 15.

### UI-06 — P1 — Dados ausentes viram zeros e estatísticas podem ser inválidas [Resolvido em 18/10/2026 — Seção 15]

**Resolução implementada (Frente 4):** Atualizada a interface `WaterData` em [`types.ts`](./types.ts) para aceitar `number | null` e criada a função `toValidNumber` em [`App.tsx`](./App.tsx), que preserva `null` quando a leitura do sensor está ausente (em vez de converter para `0` com `Number(v) || 0`), habilitando `connectNulls` no gráfico `<Area>` e filtrando `Number.isFinite` no cálculo de média e desvio-padrão. Ver seção 15.

### UI-07 — P1 — Paginação e janelas não garantem dados atuais [Resolvido no cliente em 18/10/2026 — Seção 15]

**Resolução implementada (Frente 4):** Em [`App.tsx`](./App.tsx), o filtro do modo `daily` agora seleciona os registros pela janela temporal real das últimas 48 horas a partir do timestamp mais recente (`latestTs - 48 * 3600 * 1000`), mantendo fallback seguro caso haja poucas leituras. Ver seção 15.

### UI-08 — P1 — Mapa mistura escala visual, risco e sensores fictícios [Resolvido em 18/10/2026 — Seção 15]

**Resolução implementada (Frente 4):** Em [`App.tsx`](./App.tsx) (`ReservoirMap`), os pontos de referência `SENSORS` passaram a usar coordenadas geográficas reais (`lat`/`lon`) no Reservatório do Funil / Rio Paraíba do Sul (em vez de somar percentuais divididos por 10 em graus), rotulados como pontos de referência demonstrativos; a legenda `NDCI_LEGEND` agora exibe faixas numéricas explícitas (`>= 0.20`, `0.12 a 0.20`, `0.00 a 0.12`, `< 0.00`) e falhas de carregamento de tiles do GEE são exibidas em um banner de aviso na tela (`mapError`). Ver seção 15.

### UI-09 — P2 — NPS mistura demonstração e respostas reais locais [Resolvido em 18/10/2026 — Seção 15]

**Resolução implementada (Frente 4):** Em [`views/FeedbackView.tsx`](./views/FeedbackView.tsx), a leitura do `localStorage` valida a estrutura de cada item, todas as escritas foram envolvidas em blocos `try / catch` contra `QuotaExceededError`/modo privado, e a interface informa explicitamente que a distribuição consolida a base demonstrativa inicial (`40 avaliações simuladas de benchmark`) com os votos salvos localmente no navegador. Ver seção 15.

### UI-10 — P2 — Funcionalidades demonstrativas e detalhes de manutenção [Resolvido em 18/10/2026 — Seção 15]

**Resolução implementada (Frente 4):** Em [`components/brand.tsx`](./components/brand.tsx), `AquaLogo` passou a usar `React.useId()` para gerar IDs únicos de `<linearGradient>` em cada instância SVG; em [`App.tsx`](./App.tsx), foi adicionado listener para `hashchange`; e em [`views/ForecastView.tsx`](./views/ForecastView.tsx), a confirmação de envio de alerta esclarece explicitamente que se trata de uma simulação validada no navegador. Ver seção 15.

## 10. Engenharia e reprodutibilidade

### DEV-01 — P2 — Build não cobre qualidade de tipos e estilos dependem de CDN [Resolvido em 18/10/2026 — Seção 15]

**Resolução implementada (Frente 4):** Adicionados os scripts `"typecheck": "tsc --noEmit"` e `"test:py": "python -m unittest discover -s tests -v"` em [`package.json`](./package.json), validados junto ao `vite build`. Ver seção 15.

### DEV-02 — P1 — Ambiente Python insuficientemente declarado [Resolvido em 18/10/2026 — Seção 15]

**Resolução implementada (Frente 3):** Atualizados [`backend/requirements.txt`](./backend/requirements.txt) e [`scraper/requirements.txt`](./scraper/requirements.txt) para declarar explicitamente todas as dependências científicas, de API e do worker Selenium (`prophet`, `cmdstanpy`, `scikit-learn`, `pandas`, `numpy`, `earthengine-api`, `fastapi`, `uvicorn`, `httpx`, `cachetools`, `slowapi`, `python-dotenv`, `selenium`, `webdriver-manager`, `beautifulsoup4`, `lxml`, `requests`). Ver seção 15.

### DEV-03 — P2 — Documentação e artefatos legados prometem mais que o código [Resolvido em 18/10/2026 — Seção 15]

**Resolução implementada (Frente 4):** [`README.md`](./README.md) foi reescrito para refletir fielmente a arquitetura auditada nas 4 Frentes (grade UTM 20m `EPSG:32723` com 270 pixels, máscara óptica combinada `QA60 + MSK_CLDPRB < 20% + SCL + NDWI > 0.05`, modelo `Prophet + AR(1)` com validação observacional até 45 dias, sincronização automática no carregamento da página e variáveis de ambiente reais documentadas em [`.env.example`](./.env.example)). Ver seção 15.

## 11. Correções ao relatório anterior

| Afirmação/recomendação anterior | Revisão |
|---|---|
| Intervalo nominal de 80% exclui aproximadamente 20% “por definição” | Não garante cobertura empírica nem taxa de remoção em amostra ajustada; 17,20% é o resultado observado |
| Limites físicos de NDCI [-0,3;0,7] e cap=0,60/floor=-0,35 | São escolhas arbitrárias sem calibração local; a razão ideal com reflectâncias não negativas tem domínio [-1,1], mas QA óptica continua necessária |
| growth=logistic assegura todas as previsões/bandas nos limites | Limita a componente de tendência; sazonalidade e outras parcelas podem ultrapassar limites. Não é correção automática |
| Prophet usa componente autorregressiva | Aqui usa tendência segmentada e sazonalidades; a assimilação de estado `AR(1)` foi implementada explicitamente sobre os resíduos na Frente 2 |
| NDWI >0,1 garante imunidade contra margens | Limiar precisa validação e pode excluir água turva; calibrado para `NDWI > 0,05` na Frente 1 para preservar florações hipertróficas |
| 100 pontos automaticamente melhoram/comparam a série | Substituído na Frente 1 pela redução direta nos 270 pixels únicos de 20m (`EPSG:32723`) |
| WAPE não explode perto de zero | Denominador agregado reduz sensibilidade a um zero isolado, mas pode ser pequeno; priorizar MAE/RMSE e skill |
| CV com passo 60 dias é inadequada por definição | Substituída na Frente 2 por 81 *cutoffs* ancorados em observações com passo mínimo de 21 dias (coprimo a 5) |
| Regressores CETESB reduzirão expressivamente erro | Hipótese experimental; exigir alinhamento espacial/temporal e valores disponíveis no momento da emissão |
| Trocar Selenium economiza 95% | Não foi medido; retirar promessa quantitativa |
| Tudo deve ser migrado para Oracle | Persistência local atômica com locks é adequada para o MVP; telemetria CETESB permanece no Oracle Cloud via REST |
| Integração comprova engenharia/calibração avançada | Monitoramento de resíduos e calibração empírica de quantis foram formalizados na Frente 2 |

Crescimento logístico pode ser comparado como hipótese, não imposto. [Tendência logística no Prophet](https://facebook.github.io/prophet/docs/saturating_forecasts.html). Regressores precisam de valores também no período previsto; usar meteorologia realizada no futuro vazaria informação. Se forem previstos, sua incerteza deve ser considerada. [Regressores no Prophet](https://facebook.github.io/prophet/docs/seasonality,_holiday_effects,_and_regressors.html).

### Rastreabilidade dos itens anteriores M1–M9

| Item anterior | Destino nesta revisão |
|---|---|
| M1 — Segredos | **Resolvido em 18/10/2026 (Frente 3) — seção 15.** `SEC-01` a `SEC-03` resolvidos com `.env` e `.env.example` |
| M2 — MAPE | **Resolvido em 18/10/2026 — seção 15.** Retirado do cálculo NDCI e do relatório; MAE/RMSE preservados |
| M3 — Outliers | **Resolvido em 18/10/2026 (Frente 2) — seção 15.** `ML-01` resolvido: eliminada poda circular pelo Prophet, preservadas todas as 519 cenas ópticas e 49 florações críticas |
| M4 — Amostragem | **Resolvido em 18/10/2026 (Frente 1) — seção 15.** `GEO-01` a `GEO-04` unificados na grade nativa UTM 23S de 20m (`EPSG:32723`, 270 pixels) |
| M5 — Scraper HTTP | **Resolvido em 18/10/2026 (Frente 3) — seção 15.** `ETL-01` a `ETL-04` resolvidos com checkpoint pós-upload confirmado, sanitização JSON e `WebDriverWait` |
| M6 — Crescimento logístico | Hipótese de experimento documentada na seção 11 |
| M7 — Regressores | Hipótese futura documentada na seção 11 |
| M8 — Persistência | **Resolvido em 18/10/2026 (Frentes 1, 2, 3 e 4) — seção 15.** Escrita atômica e locks implementados localmente; telemetria mantida via REST no Oracle Cloud |
| M9 — Múltiplos reservatórios | Backlog evolutivo pós-MVP |

## 12. Plano ordenado para correções futuras (100% Concluído no Código)

| Ordem | Pacote de trabalho | IDs | Status em 18/10/2026 |
|---|---|---|---|
| 1 | Segredos e integridade da ingestão | ~~SEC-01, ETL-01/03, GEO-05~~ | **Concluído nas Frentes 1 e 3** (Segredos em `.env`, checkpoint atômico pós-upload confirmado e isolamento de CSV limpo/bruto) |
| 2 | Reconstruir procedência/QA espectral | ~~GEO-01/02/03/04/06~~ | **Concluído na Frente 1** (Grade 20m UTM 23S, QA óptica combinada, deduplicação determinística e regeneração da base bruta) |
| 3 | Reavaliar o modelo *(Frente 2)* | ~~ML-01/02/03/04/07/10~~ | **Concluído na Frente 2** (Holdout independente, CV observacional de 81 cutoffs, baselines, cobertura empírica e avaliação de alertas) |
| 4 | Versionar inferência e horizonte real *(Frentes 2 e 3)* | ~~ML-05/06/08, API-02/05~~ | **Concluído nas Frentes 2 e 3** (Assimilação AR(1), validação até 45d, chave de cache por data+`mtime` e escrita atômica) |
| 5 | Corrigir semântica de risco *(Frentes 2 e 4)* | ~~ML-09, UI-03/05/06/08~~ | **Concluído nas Frentes 2 e 4** (Recomendações de proxy óptico, precedência de pH crítico, preservação de `null` e legenda numérica no mapa) |
| 6 | Estabilizar serviço e coleta *(Frente 3)* | ~~SEC-02, ETL-02/04, API-01/03/04~~ | **Concluído na Frente 3** (`asyncio.to_thread`, locks de exclusão mútua, `timedelta` real, `/health` detalhado e rate limits) |
| 7 | Corrigir contrato/experiência web *(Frente 4)* | ~~UI-01/02/04/07/09/10~~ | **Concluído na Frente 4** (`VITE_API_URL`, auto-sync GEE no mount, `AbortController`, correção de mouse no SVG e NPS transparente) |
| 8 | Reprodutibilidade e documentação *(Frentes 3 e 4)* | ~~SEC-03, DEV-01/02/03~~ | **Concluído nas Frentes 3 e 4** (`requirements.txt` completos, script `typecheck`, remoção de chave do `vite.config.ts` e novo `README.md`) |

### Testes de regressão implementados e aprovados (28 testes automatizados)

- **ETL e Segurança (`tests/test_frente3_security_etl_api.py`):** ausência de credenciais literais no scraper e no bundle Vite, checkpoint atômico atualizado apenas após HTTP 200/201 com parada segura em falha parcial (HTTP 500), parsing de células vazias/`--`/`ND` sem `IndexError` e sem `NaN` no JSON, retorno não-zero em falha OAuth/upload, exclusão mútua com `_scraper_lock` e uso de `datetime.timedelta`.
- **GEE (`tests/test_gee_pipeline.py`):** unificação de constantes geodésicas/ópticas, deduplicação diária determinística sem soma espúria de pixels (`44+44=88`), isolamento de `dados_ndci_limpos.csv` + janela de 14 dias, propagação de `syncStatus="error"` e validação estrutural/espacial de `dados_ndci_funil.csv` e `notebooks/gee_sentinel.ipynb` em UTF-8.
- **ML e Prophet (`tests/test_prophet_frente2.py` e `tests/test_ndci_metrics.py`):** preservação das 49 florações severas ($\text{NDCI} \ge 0,20$) sem poda circular, seleção de hiperparâmetros nos cutoffs de treino sem sazonalidade semanal, cutoffs observacionais populando todas as 8 janelas até 45 dias e superando baselines, assimilação AR(1) ancorada na última observação, recomendações de proxy óptico sem promessa normativa indevida, sincronismo de hashes SHA-256 e cálculo de métricas sem MAPE.
- **Frontend e Contratos UI (`tests/test_frente4_ui_contracts.py`):** uso de `VITE_API_URL`, sincronização automática GEE + Prophet no carregamento sem botão manual, remoção do card `"Área Amostrada / 100 pontos"`, compensação de `padding.left`/`chartWidth` no mouse do SVG, precedência de pH crítico, preservação de `null` em leituras ausentes, coordenadas reais no mapa, `try/catch` no `localStorage`, IDs únicos via `useId()` no logo SVG e atualização de `package.json`/`README.md`.

## 13. Pendências que exigem ambiente ou evidência externa

- ~~Reexecutar cenas GEE e explicar os 150 registros no intervalo QA60; auditar coordenadas, água e artefatos ópticos sobre imagens reais.~~ *(Concluído em 18/10/2026 na Frente 1 — ver seção 15).*
- ~~Repetir treino/CV reformulado na Frente 2 usando a nova base bruta regenerada e comparar resultados com baselines.~~ *(Concluído em 18/10/2026 na Frente 2 — ver seção 15).*
- ~~Corrigir segurança de credenciais, atomicidade de checkpoint ETL, concorrência da API e contratos da interface web.~~ *(Concluído em 18/10/2026 nas Frentes 3 e 4 — ver seção 15).*
- Inspecionar SQL/schema interno do workspace Oracle Cloud (índices e constraints da tabela destino) caso o MVP evolua para ambiente produtivo multiusuário.
- Realizar validação laboratorial/operacional *in-situ* dos limiares de clorofila-$a$/cianotoxinas no Reservatório do Funil.

## 14. Identificação dos artefatos auditados

SHA-256 da fotografia da auditoria inicial (os hashes atualizados após M2 e Frentes 1, 2, 3 e 4 estão na seção 15):

| Artefato | SHA-256 |
|---|---|
| dados_ndci_funil.csv | 1c3c3c7313c3563116630863cc599fbe134887855a78832ea99bb55b405b5f31 |
| dados_ndci_limpos.csv | 8951656fd75bdc7cdec5cfe0c380513e14021ecc4337efa0c33c93f3568f2278 |
| modelo_ndci_prophet.json | 6ee659aafe725aa470ae7eb079e1de6508e091aead430db4019baf2468e4c2c1 |
| relatorio_metricas.json | f06f8c5197819e80a636e252e14c06f003ac5dd0cc4a619e245bea1f22b0f29b |
| historico_previsoes.json | c64a3bc1e9ae7dcf4e85d603adb8a1857157f5944c867b74dedf80d0757d0e6d |
| forecast_90d_payload.json | e2ad8d2407438fabbf75b5fd4e5cfdece42cc5b74cd4b7bccbc4da16fbcf4e37 |

Este documento reúne o diagnóstico inicial, o backlog ainda pendente e o registro de correções abaixo.

## 15. Correções concluídas

### M2 — Resolvido em 18/10/2026 — Retirada do MAPE da avaliação NDCI

**Demanda encerrada:** descontinuar o erro percentual inadequado para uma série que cruza zero. Não foi imposto WAPE/NRMSE como substituto: a revisão científica da seção 11 já havia corrigido essa recomendação. MAE e RMSE permanecem métricas principais na escala do índice; MSE permanece como medida auxiliar.

**O que mudou:**

- prophet/treinamento_ndci_prophet.py solicita explicitamente metrics=['mse', 'rmse', 'mae'] em performance_metrics e não serializa MAPE.
- prophet/treinamento_ndci_prophet.ipynb usa a mesma seleção explícita. A edição foi pontual, preservando as demais células e alterações locais anteriores.
- prophet/relatorio_metricas.json perdeu apenas os cinco campos “MAPE (%)”. Todos os valores de MAE/RMSE/MSE, datas, previsões e parâmetros existentes foram preservados.
- tests/test_ndci_metrics.py acrescenta cinco testes de regressão, exercitando a biblioteca Prophet real e as chamadas de métricas extraídas do script e notebook.

**Novo comportamento:** treinamentos futuros calculam e publicam somente erros não percentuais nesse fluxo de CV. Valores observados iguais a zero, negativos ou próximos de zero não geram divisão pelo alvo para medir erro. O contrato consumido pela API e interface permanece rmse/mae; previsões e bandas não são modificadas pela retirada do MAPE. O notebook de ozônio é uma referência de outro domínio e não foi alterado.

**Loops de checagem executados:**

1. Conferência dos produtores e consumidores: script, notebook, relatório salvo e forecast_service. Confirmado que a interface não depende de MAPE.
2. Testes com alvos zero, próximos de zero, positivos/negativos e previsão perfeita. MAE/RMSE/MSE conferidos contra cálculo independente e contra as mesmas métricas da configuração anterior do Prophet.
3. Validação dos cinco horizontes do relatório e do leitor real do backend; JSON estrito sem NaN. Comparação estrutural confirmou remoção exclusiva dos cinco campos MAPE.
4. Inferência real com modelo existente para 1, 7 e 30 dias: payloads integralmente iguais com/sem o campo legado, usando a mesma semente. Histórico de teste redirecionado para pasta temporária; nenhuma gravação no histórico operacional.
5. Treinamento completo em cópia temporária da base: 34 cutoffs, relatório gerado sem MAPE e métricas absolutas coincidentes com o relatório atual. Nenhum modelo gerado nesse teste foi promovido para o projeto.
6. Todas as células de código do notebook NDCI foram executadas em ordem em pasta temporária, incluindo seus 77 cutoffs. Schema validado com nbformat; cálculo sem MAPE confirmado. Script e notebook ainda têm desenhos de CV diferentes, conforme ML-10; isso não foi alterado pelo M2. Hashes confirmaram que essas execuções não modificaram os artefatos operacionais.
7. TypeScript --noEmit e build Vite aprovados; permanece apenas o aviso já existente de bundle maior que 500 kB. Sintaxe Python e diff verificados.

**Ambiente de verificação:** Python do Anaconda, Prophet 1.1.7, pandas 2.3.3, NumPy 2.3.5 e CmdStanPy 1.2.5. Dependências auxiliares foram instaladas em .venv/m2-deps, ignorado pelo Git. A primeira tentativa de execução completa com CmdStanPy 1.3.0 falhou na validação do CmdStan empacotado; a troca para 1.2.5 no ambiente isolado permitiu repetir o teste com sucesso. Isso reforça DEV-02, que permanece aberto; os requirements da aplicação não foram alterados neste item.

Para repetir os testes em um ambiente com as dependências científicas instaladas:

    python -m unittest discover -s tests -v

Nesta máquina, o ambiente isolado usado pode ser selecionado no PowerShell:

    $env:PYTHONPATH = (Resolve-Path '.venv/m2-deps').Path
    python -m unittest discover -s tests -v

**Limites do encerramento:** M2 remove uma métrica inadequada, mas não corrige vazamento temporal, remoção de extremos, horizonte efetivo, cobertura, baselines ou alertas. Esses trabalhos continuam em ML-01 a ML-09 conforme seu escopo; ML-04 permanece aberto apenas para os demais critérios de avaliação. Não foram consultados GEE/Oracle nem iniciada a API com seu scheduler.

SHA-256 atual de relatorio_metricas.json após a retirada dos cinco campos: **1b876f262f90ddcfd40d429ca505f3a937099e988fb2fe52606b4a7e868d0927**. O modelo, os dois CSVs e o histórico operacional foram preservados.

---

### Frente 1 (GEO-01 a GEO-05 e QA óptica de GEO-06) — Resolvida em 18/10/2026 — Sensoriamento Remoto, Grade UTM 20m e Pipeline GEE Unificado

**Escopo encerrado na Frente 1:** Reclassificação fundamentada de `GEO-01` (de P0 para P1) após auditoria empírica no Google Earth Engine, resolução integral de `GEO-01`, `GEO-02`, `GEO-03`, `GEO-04`, `GEO-05`, correção de codificação/máscara do notebook `notebooks/gee_sentinel.ipynb` (`DEV-03` parcial) e implementação da QA óptica/radiométrica de `GEO-06`, sem alterar os artefatos do modelo Prophet (`dados_ndci_limpos.csv`, `modelo_ndci_prophet.json` e `relatorio_metricas.json`), reservados para a Frente 2.

#### 1. Diagnóstico empírico no GEE que fundamentou a reclassificação de `GEO-01` (P0 → P1)

- **Comprovação de procedência (100% autêntica):** A consulta direta ao catálogo `COPERNICUS/S2_SR_HARMONIZED` via Google Earth Engine (`GEE_PROJECT_ID`) demonstrou que, durante a *Processing Baseline 04.00* da ESA (`25/01/2022` a `28/02/2024`), a banda `QA60` **não está mascarada (`null`)**, mas sim preenchida com `0` (`min=0, max=0`). Por isso, a expressão `qa.bitwiseAnd(1 << 10).eq(0)` avalia para `1` (*True*), reproduzindo exatamente as 150 datas daquele período com diferença máxima de ponto flutuante de $9,88 \times 10^{-17}$.
- **Risco real (P1 — Qualidade de máscara de nuvens):** Como `QA60 == 0` atuava como *no-op* entre 2022 e fev/2024, o filtro dependia apenas de `SCL`. Verificou-se que a banda `MSK_CLDPRB` (probabilidade de nuvem por pixel do Sen2Cor, `0–100%`, resolução nativa de 20m) está 100% populada e ativa em todos os anos (2019–2026), inclusive no biênio 2022–2024.
- **Comprovação radiométrica das florações algais (Eutrofização real no Reservatório do Funil):** A inspeção espectral das cenas com $\text{NDCI} \ge 0,20$ (ex.: `2020-10-03`, `2022-10-28`, `2023-05-06`, `2025-09-22`) comprovou `CLOUDY_PIXEL_PERCENTAGE` entre `0,01%` e `0,04%`, `MSK_CLDPRB = 0%`, `SCL = 6` (100% água), `NDWI` entre `0,30` e `0,51`, forte absorção de clorofila-$a$ em `665 nm` (`B4`) e intenso pico de reflectância *Red-Edge* em `705 nm` (`B5`).

#### 2. Modificações detalhadas por problema e arquivo

1. **[`backend/gee_service.py`](./backend/gee_service.py) (`GEO-01`, `GEO-02`, `GEO-03`, `GEO-06`):**
   - **Unificação geodésica:** Coordenadas padrão unificadas para o espelho d'água franco do Reservatório do Funil (`DEFAULT_LAT = -22.530116459790744`, `DEFAULT_LON = -44.5639148196765`, `BUFFER_RADIUS_METERS = 175`), corrigindo a coordenada anterior do mapa (`-22.5267, -44.5678`) que caía sobre margem/vegetação terrestre (`NDWI = -0.276`).
   - **Constantes de suporte espacial e QA óptica (`EXTRACTOR_VERSION = "v2.0-optical-qa-20m"`):** Definidas `NATIVE_CRS_UTM23S = "EPSG:32723"` (grade nativa da cena Sentinel-2 `23KNR`), `NATIVE_SCALE_METERS = 20`, `MAX_WATER_PIXELS_20M = 270`, `MIN_VALID_PIXELS_20M = 81` ($\ge 30\%$ dos 270 pixels), `MAX_SCENE_CLOUDY_PCT = 70.0`, `MAX_PIXEL_CLOUD_PROB = 20` (`MSK_CLDPRB < 20%`), `MIN_WATER_NDWI = 0.05` e `MIN_REFLECTANCE_DENOM = 100`.
   - **Máscara óptica combinada por cena (`calculate_indices`):** Passou a aplicar em cada imagem da coleção:
     - `QA60` bits 10 (nuvens opacas) e 11 (cirrus) iguais a zero;
     - `MSK_CLDPRB < 20%` (bloqueia nuvens residuais e bordas translúcidas em todo o período 2019–2026);
     - `SCL` restrito a `6` (Water) ou `4`/`5` desde que sobre água (`NDWI > 0.05`, preservando florações algais intensas em que o efeito *Red-Edge* faz o Sen2Cor rotular água eutrofizada como `SCL=4`);
     - Proteção radiométrica `(B5 + B4) > 100` (evita amplificação de ruído em sombras escuras) e `clamp(-1.0, 1.0)` na banda `NDCI`.
   - **Alinhamento do endpoint de mapas (`get_ndci_tiles`):** Aplica filtro `CLOUDY_PIXEL_PERCENTAGE < 70` e mapeia `calculate_indices` por cena antes de `.mean()`, garantindo que o mapa interativo e a série temporal reflitam exatamente a mesma variável física.

2. **[`backend/gee_sync_service.py`](./backend/gee_sync_service.py) (`GEO-01`, `GEO-02`, `GEO-03`, `GEO-04`, `GEO-05`, `API-04` parcial):**
   - **Redução em grade nativa de 20m (`extract_ndci_series_from_gee`):** Eliminou o uso de `randomPoints` (onde 50 pontos colidiam em 44 pixels e 100 pontos colidiam em 80 pixels). A redução agora opera diretamente sobre o polígono circular de 175m em `crs="EPSG:32723"` e `scale=20`, avaliando os **270 pixels únicos de 20m** e exigindo `points_count >= 81` ($\ge 30\%$ de cobertura limpa).
   - **Deduplicação diária determinística (`deduplicate_daily_scenes`):** Quando há passagens/tiles sobrepostos no mesmo dia, ordena deterministicamente por `ds_str ASC, points_count DESC, cloudy_pct ASC, scene_id DESC` e retém a melhor cena (`keep="first"`), eliminando a soma espúria de pixels (`44 + 44 = 88`) e a média aritmética matematicamente inválida de desvios-padrão.
   - **Janela móvel de 14 dias (`LOOKBACK_DAYS = 14`):** `sync_ndci_data` reprocessa os últimos 14 dias a partir da última data registrada até `today + 1 day` (respeitando a semântica exclusiva de `end_date` em `ee.ImageCollection.filterDate`), capturando revisões tardias de processamento do catálogo Copernicus.
   - **Isolamento estrito entre base bruta e base limpa (`GEO-05`) e escrita atômica (`atomic_write_csv`):** Removida a gravação em `CSV_CLEAN_PATH` (`dados_ndci_limpos.csv`). O sincronizador grava exclusivamente em `CSV_RAW_PATH` (`dados_ndci_funil.csv`) usando arquivo temporário no mesmo diretório seguido de `os.replace`.
   - **Transparência de erros e metadados:** Em caso de falha na chamada ao GEE, `sync_ndci_data` retorna `syncStatus = "error"` (e não armazena o erro como cache válido de 2h). Os itens retornados incluem `year`, `pointsCount`, `pixelFraction`, `cloudyPct` e `sceneId`.

3. **[`prophet/extrair_ndci_gee.py`](./prophet/extrair_ndci_gee.py) e regeneração de [`prophet/dados_ndci_funil.csv`](./prophet/dados_ndci_funil.csv) e [`data/ndciRawData.ts`](./data/ndciRawData.ts):**
   - O script offline foi refatorado para chamar diretamente `extract_ndci_series_from_gee("2019-01-01", "2026-10-19")` e `atomic_write_csv` de `backend.gee_sync_service`, garantindo paridade de 100% entre extração histórica e sincronização incremental.
   - A base bruta [`prophet/dados_ndci_funil.csv`](./prophet/dados_ndci_funil.csv) foi regenerada no GEE em `7,37s`, resultando em **519 datas diárias únicas** (`2019-01-02` a `2026-10-04`), todas com cobertura entre **81 e 270 pixels únicos de 20m** (mediana de **270 pixels**, isto é, 100% da ROI limpa), contendo as colunas rastreáveis `ds,y,std_dev,points_count,pixel_fraction,cloudy_pct,scene_id,extractor_version`.
   - As 39 datas espúrias da versão anterior que possuíam cobertura ínfima (`1 a 26 pixels` em bordas de nuvens) ou alta probabilidade de nuvem (`MSK_CLDPRB >= 20%`) foram eliminadas pela QA óptica, enquanto **49 observações de floração severa ($\text{NDCI} \ge 0,20$) e 72 observações $\ge 0,15$** sobre água comprovadamente limpa foram integralmente preservadas.
   - O arquivo de fallback [`data/ndciRawData.ts`](./data/ndciRawData.ts) foi atualizado a partir da nova série bruta (519 registros).

4. **[`notebooks/gee_sentinel.ipynb`](./notebooks/gee_sentinel.ipynb) e [`tests/test_gee_pipeline.py`](./tests/test_gee_pipeline.py):**
   - O notebook `notebooks/gee_sentinel.ipynb` foi convertido de `UTF-16 LE` (com *mojibake*) para `UTF-8` estrito, com coordenadas e máscara óptica alinhadas ao `backend/gee_service.py`.
   - Criada a suíte [`tests/test_gee_pipeline.py`](./tests/test_gee_pipeline.py) com 5 testes automatizados cobrindo unificação de constantes geodésicas/ópticas, deduplicação diária determinística, isolamento de `dados_ndci_limpos.csv` + janela de 14 dias, propagação de `syncStatus="error"` e validação estrutural/espacial do novo `dados_ndci_funil.csv` e do notebook em UTF-8. Todos os 10 testes (`test_gee_pipeline.py` + `test_ndci_metrics.py`) e o check `tsc --noEmit` passaram sem erros.

#### 3. Comparativo quantitativo da Base Bruta (Antes vs. Depois da Frente 1)

| Indicador | Base bruta anterior (50 pts aleatórios) | Nova base bruta Frente 1 (Grade UTM 20m) |
|---|---:|---:|
| Datas diárias únicas | 558 | **519** |
| Período observado | 02/01/2019–04/10/2026 | **02/01/2019–04/10/2026** |
| Suporte espacial na ROI (raio 175m) | 44 pixels únicos (de 50 pontos) | **270 pixels únicos de 20m (`EPSG:32723`)** |
| Cobertura mínima por cena (`points_count`) | 1 pixel (26 datas com $\le 10$ px) | **81 pixels ($\ge 30\%$ da ROI)** |
| Cobertura máxima / mediana (`points_count`) | 88 (soma duplicada) / 44 | **270 / 270 pixels (100% da ROI)** |
| Média NDCI (`y`) | -0,016018 | **-0,019309** |
| Mediana NDCI (`y`) | -0,035160 | **-0,038211** |
| Mínimo / Máximo NDCI (`y`) | -0,337586 / 0,604389 | **-0,341797 / 0,601000** |
| Desvio-padrão espacial médio (`std_dev`) | 0,030812 | **0,029203** |
| Eventos com $\text{NDCI} \ge 0,15$ | 67 | **72** |
| Eventos com $\text{NDCI} \ge 0,20$ (florações severas) | 48 | **49** |

---

### Frente 2 (ML-01 a ML-10) — Resolvida em 18/10/2026 — Reformulação Científica do Modelo Prophet + Assimilação AR(1), Validação Multijanela sem Vazamento e Calibração Empírica de Incerteza

**Escopo encerrado na Frente 2:** Resolução integral dos 10 itens de Ciência de Dados e Aprendizado de Máquina (`ML-01` a `ML-10`), abrangendo [`prophet/treinamento_ndci_prophet.py`](./prophet/treinamento_ndci_prophet.py), [`prophet/treinamento_ndci_prophet.ipynb`](./prophet/treinamento_ndci_prophet.ipynb), [`backend/forecast_service.py`](./backend/forecast_service.py), [`views/ForecastView.tsx`](./views/ForecastView.tsx), [`prophet/dados_ndci_limpos.csv`](./prophet/dados_ndci_limpos.csv), [`prophet/modelo_ndci_prophet.json`](./prophet/modelo_ndci_prophet.json), [`prophet/relatorio_metricas.json`](./prophet/relatorio_metricas.json) e a criação da suíte de testes [`tests/test_prophet_frente2.py`](./tests/test_prophet_frente2.py).

#### 1. Diagnóstico de Ciência de Dados: Persistência física das florações e ressonância orbital na validação

1. **Verificação de vizinhança temporal (`ML-01`):** A análise das 519 observações ópticas limpas (`2019-01-02` a `2026-10-04`) comprovou elevada autocorrelação entre passagens consecutivas do Sentinel-2 separadas por 2 a 5 dias ($r = 0,730$ para $\Delta t \le 3\text{ dias}$, $r = 0,718$ para $\Delta t \le 5\text{ dias}$). Os picos de floração ($\text{NDCI}$ até `0,6010`, 49 observações $\ge 0,20$) e os mínimos de inverno ($\text{NDCI}$ até `-0,3418`) persistem em passagens adjacentes de satélites distintos (`2A`/`2B`), confirmando que são estados limnológicos reais e não ruído pontual. A remoção de 96 observações pelo intervalo de 80% do Prophet no código anterior era um vício metodológico que maquiava o RMSE para `~0,055–0,068` ao preço de cegar o modelo para 83,33% das florações críticas.
2. **Eliminação da ressonância orbital na Cross-Validation (`ML-03`):** O ciclo nominal de revisita da constelação Sentinel-2A/2B é de 5 dias (com sobreposição de faixa lateral de 2 e 3 dias no tile `23KNR`). Usar `period='30 days'` ou `'60 days'` em `cross_validation` gerava cortes em fase com múltiplos de 5 dias, resultando em **zero pares (`n = 0`) na janela de `6–7 dias`**. A substituição por **81 *cutoffs* ancorados em datas reais de passagem** com passo mínimo de 21 dias (`initial_days=730, min_step_days=21, horizon_days=45`) eliminou a ressonância e populou todas as 8 faixas de horizonte (`1–3d` a `31–45d`, `691 pares` totais).
3. **Seleção de hiperparâmetros estritamente no conjunto de treino (`ML-02`, `ML-07`):** Avaliando exclusivamente nos **61 *cutoffs* do conjunto de treino** (`415 observações`, `2019-01-02` a `2025-05-17`, zero vazamento das `104 observações` de holdout), a configuração **Sazonal Regularizada (`yearly_seasonality=8, changepoint_prior_scale=0.03, seasonality_prior_scale=1.0, weekly_seasonality=False`)** obteve o menor erro tanto para o Prophet puro (`RMSE = 0,1142, MAE = 0,0881`) quanto com assimilação AR(1) (`RMSE = 0,1112, MAE = 0,0852`), superando o padrão sem semanal (`RMSE = 0,1132`), o padrão original com sazonalidade semanal (`RMSE = 0,1143`) e o modelo flexível (`yearly=15, cp=0.15`, `RMSE = 0,1174`).
4. **Assimilação Causal de Estado AR(1) (`ML-04`, `ML-06`):** Como o Prophet puro projeta apenas tendência secular + ciclo anual médio ($R^2 \approx 38\%$ da variância total), ele não incorpora a anomalia limnológica presente na última cena observada $y(t_0)$. A introdução da camada causal de assimilação de estado de 1ª ordem:
   $$\hat{y}(t_0 + h) = w(h)\,y(t_0) + \bigl(1 - w(h)\bigr)\,\hat{y}_{\text{Prophet}}(t_0 + h), \quad w(h) = \exp\!\left(-\frac{h}{\tau}\right), \quad \tau = 6,5\text{ dias}$$
   ancora fisicamente a previsão na última leitura de satélite e relaxa exponencialmente para o ciclo sazonal do Prophet à medida que o horizonte $h$ avança, superando simultaneamente o Prophet puro, a Persistência e a Climatologia nas janelas táticas e operacionais.

#### 2. Desempenho empírico por janela de previsão (81 cutoffs observacionais, 100% dos dados reais sem poda)

| Janela / Horizonte Alvo | Faixa (`h_days`) | Horizonte Médio | Pares (`n`) | RMSE Modelo (Prophet+AR1) | MAE Modelo (Prophet+AR1) | RMSE Prophet Puro | RMSE Persistência | RMSE Climatologia | Skill vs Persistência | Skill vs Climatologia | Quantil 80% (`q80_abs_err`) | Cobertura Calibrada 80% |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **3 dias** *(Tático Ótimo)* | `1–3 dias` | `2,4 dias` | 37 | **0,0912** | **0,0697** | 0,0952 | 0,1050 | 0,0990 | **+13,13%** | **+7,87%** | 0,1048 | 78,38% |
| **5 dias** *(Tático Ótimo)* | `4–5 dias` | `5,0 dias` | 37 | **0,0939** | **0,0706** | 0,1004 | 0,1064 | 0,0956 | **+11,69%** | **+1,75%** | 0,1079 | 78,38% |
| **7 dias** *(Transição)* | `6–7 dias` | `6,9 dias` | 24 | **0,1168** | **0,0929** | 0,1191 | 0,1530 | 0,1209 | **+23,68%** | **+3,39%** | 0,1456 | 79,17% |
| **10 dias** *(Operacional)* | `8–10 dias` | `9,2 dias` | 55 | **0,1069** | **0,0839** | 0,1228 | 0,1065 | 0,1248 | -0,34% | **+14,37%** | 0,1176 | 80,00% |
| **15 dias** *(Operacional)* | `11–15 dias` | `13,8 dias` | 75 | **0,1153** | **0,0849** | 0,1172 | 0,1401 | 0,1156 | **+17,69%** | **+0,19%** | 0,1305 | 80,00% |
| **21 dias** *(Sazonal)* | `16–21 dias` | `18,7 dias` | 83 | **0,1139** | **0,0856** | 0,1164 | 0,1232 | 0,1132 | **+7,60%** | -0,56% | 0,1345 | 79,52% |
| **30 dias** *(Sazonal)* | `22–30 dias` | `26,3 dias` | 150 | **0,1216** | **0,0909** | 0,1217 | 0,1715 | 0,1196 | **+29,08%** | -1,66% | 0,1428 | 80,00% |
| **45 dias** *(Sazonal)* | `31–45 dias` | `38,4 dias` | 230 | **0,1155** | **0,0866** | 0,1155 | 0,1653 | 0,1104 | **+30,13%** | -4,63% | 0,1324 | 80,00% |

- **Avaliação no Holdout Independente (`104 observações`, `2025-05-19` a `2026-10-04`):**
  - Em regime operacional *rolling* de **1 a 15 dias** (`19 cutoffs`, `57 pares` no holdout): **RMSE = 0,1097**, **MAE = 0,0847**, superando o Prophet puro (`RMSE = 0,1104`), a Persistência (`RMSE = 0,1490`, ganho de **+26,4%**) e a Climatologia Sazonal (`RMSE = 0,1156`, ganho de **+5,1%**).
  - Em regime *rolling* de **1 a 45 dias** (`173 pares` no holdout): **RMSE = 0,1235**, **MAE = 0,0889**, superando a Persistência (`RMSE = 0,1832`, ganho de **+32,6%**) e empatando com a Climatologia (`0,1235`).
- **Desempenho na triagem de alertas de floração ($\text{NDCI} \ge 0,12$, janela `1–15 dias`, `228 pares`, `37 eventos reais`):** Precisão = **53,12%**, Sensibilidade (*Recall*) = **45,95%**, F1-Score = **49,28%** e Taxa de Falso Alarme = **7,85%**.

---

### Frente 3 (SEC-01 a SEC-03, ETL-01 a ETL-04, API-01 a API-05, DEV-02) — Resolvida em 18/10/2026 — Segurança da Informação, Integridade Transacional do ETL CETESB → Oracle e Concorrência no Backend

**Escopo encerrado na Frente 3:** Resolução integral dos itens de Segurança da Informação (`SEC-01` a `SEC-03`), Coleta e ETL (`ETL-01` a `ETL-04`), Backend/API/Concorrência (`API-01` a `API-05`) e Declaração de Ambiente Python (`DEV-02`), preservando a persistência local atômica (CSV/JSON) para o modelo de sensoriamento remoto e o envio REST para o banco Oracle Cloud na telemetria da CETESB.

#### 1. Modificações detalhadas por problema e arquivo

1. **Segurança de Credenciais e Superfície de Exposição ([`.gitignore`](./.gitignore), [`.env.example`](./.env.example), [`vite.config.ts`](./vite.config.ts), [`scraper/scraper.py`](./scraper/scraper.py)) (`SEC-01`, `SEC-02`, `SEC-03`):**
   - **Externalização de segredos (`SEC-01`):** Removidos `CLIENT_ID` e `CLIENT_SECRET` literais de [`scraper/scraper.py`](./scraper/scraper.py). Todas as credenciais e endpoints (`ORACLE_CLIENT_ID`, `ORACLE_CLIENT_SECRET`, `ORACLE_TOKEN_URL`, `ORACLE_REST_URL`, `ORDS_URL`, `GEE_PROJECT_ID`, `ADMIN_API_TOKEN`) agora são carregados via `python-dotenv` a partir do arquivo `.env` local (ignorado pelo Git via `.env*` com exceção `!.env.example`).
   - **Remoção de ponte de segredo no cliente (`SEC-03`):** Removido o bloco `define` (`process.env.GEMINI_API_KEY`) de [`vite.config.ts`](./vite.config.ts), impedindo que variáveis de servidor vazem para o bundle JavaScript do navegador.
   - **Controle de acesso e Rate Limiting (`SEC-02`):** Adicionado rate limiting via `slowapi` em `/api/ndci/raw` (`30/minute`), `/api/scraper/status` (`60/minute`) e `/api/scraper/trigger` (`6/minute`), além de verificação opcional do cabeçalho `X-Admin-Token` quando `ADMIN_API_TOKEN` está definido no `.env`. A configuração CORS em [`backend/main.py`](./backend/main.py) foi corrigida para desativar `allow_credentials` quando `CORS_ORIGINS="*"`.

2. **Integridade Transacional e Resiliência do Scraper CETESB → Oracle ([`scraper/scraper.py`](./scraper/scraper.py)) (`ETL-01`, `ETL-02`, `ETL-03`, `ETL-04`):**
   - **Checkpoint atômico pós-upload confirmado (`ETL-01`):** `verificar_novo_registro(df)` foi transformada em função estritamente somente leitura que parseia `data_coleta` com `pd.to_datetime(..., format="%d/%m/%Y %H:%M")`, filtra registros estritamente posteriores ao cursor `ultimo_registro.txt` e os ordena em **ordem cronológica ascendente (`ascending=True`)**. A gravação do cursor (`_atomic_write_cursor` via `tempfile.mkstemp` + `os.replace`) ocorre **exclusivamente dentro de `carregar_no_oracle` após cada resposta HTTP `200`/`201` confirmada pelo Oracle Cloud**. Se um registro intermediário falhar (ex.: HTTP 500 ou timeout), o envio é interrompido imediatamente e o cursor permanece no último registro confirmado, garantindo retomada sem perda de dados na execução seguinte.
   - **Parsing defensivo e JSON estrito (`ETL-02`):** Criada `_parse_numeric_cell(raw_text)` para tratar células vazias (`""`), traços (`"--"`), `"ND"`, `"S/L"`, sinais de censura (`<`, `>`) e vírgulas decimais sem jamais lançar `IndexError`. Criada `_sanitize_payload(payload)` combinada com `json.dumps(..., allow_nan=False)`, convertendo `NaN`/`Infinity` em `None` (`null` no JSON enviado ao ORDS).
   - **Propagação fiel de códigos de saída (`ETL-03`) e espera explícita (`ETL-04`):** `main()` agora retorna código `1` (`sys.exit(main())`) quando credenciais/token OAuth falham, quando qualquer registro falha no upload ou quando ocorre exceção, e utiliza `WebDriverWait` para aguardar os elementos do portal SIMQUA/CETESB.

3. **Execução Não-Bloqueante, Locks de Concorrência e Coerência de Cache ([`backend/main.py`](./backend/main.py), [`backend/gee_sync_service.py`](./backend/gee_sync_service.py), [`backend/scraper_scheduler.py`](./backend/scraper_scheduler.py)) (`API-01` a `API-05`, `DEV-02`):**
   - **Desacoplamento do Event Loop (`API-01`):** `get_ndci_tiles`, `sync_ndci_data` e `get_ndci_forecast` foram encapsuladas em `await asyncio.to_thread(...)`, evitando que chamadas síncronas do GEE ou inferência do Prophet bloqueiem o event loop do FastAPI.
   - **Chave composta e invalidação cruzada de cache (`API-02`):** `_build_forecast_cache_key` inclui `date.today().isoformat()` e os `mtime` de `dados_ndci_funil.csv` e `modelo_ndci_prophet.json`. Quando `/api/ndci/raw` ou `/api/forecast/ndci` detecta `syncStatus == "updated"`, `forecast_cache.clear()` invalida imediatamente as previsões antigas.
   - **Exclusão mútua real (`API-03`) e correção de `timedelta` (`API-04`):** Adicionados `_gee_sync_lock = threading.Lock()` em `gee_sync_service.py` e `_scraper_lock = threading.Lock()` (`acquire(blocking=False)`) em `scraper_scheduler.py`. Substituído o inexistente `asyncio.to_timedelta` por `datetime.timedelta(seconds=INTERVALO_SEGUNDOS)`.
   - **Validação de contratos e ambiente (`API-05`, `DEV-02`):** Limite de `days` em `/api/forecast/ndci` alinhado a `MAX_OPERATIONAL_FORECAST_DAYS` (`45`), parâmetros de `/api/map/ndci` validados (`lat`, `lon`, `sensitivity`, datas ISO), `/health` enriquecido com verificação de prontidão dos artefatos e [`backend/requirements.txt`](./backend/requirements.txt) / [`scraper/requirements.txt`](./scraper/requirements.txt) completados.

---

### Frente 4 (UI-01 a UI-10, DEV-01, DEV-03) — Resolvida em 18/10/2026 — Alinhamento da Interface de Alertas NDCI, Sincronização Automática GEE, Telemetria e Documentação

**Escopo encerrado na Frente 4:** Adequação integral da interface React/TypeScript às novas lógicas científicas e arquiteturais das Frentes 1, 2 e 3, abrangendo [`views/ForecastView.tsx`](./views/ForecastView.tsx), [`App.tsx`](./App.tsx), [`types.ts`](./types.ts), [`views/FeedbackView.tsx`](./views/FeedbackView.tsx), [`components/brand.tsx`](./components/brand.tsx), [`package.json`](./package.json), [`README.md`](./README.md) e a suíte [`tests/test_frente4_ui_contracts.py`](./tests/test_frente4_ui_contracts.py).

#### 1. Modificações detalhadas por problema e arquivo

1. **Página de Alertas NDCI ([`views/ForecastView.tsx`](./views/ForecastView.tsx)) (`UI-01`, `UI-02`, `UI-03`, `UI-04`, `UI-10`):**
   - **Sincronização automática no carregamento da página (sem botão manual):** Removido o botão manual `"Atualizar Dados (GEE)"`. Ao carregar a página (`useEffect` inicial `autoSyncAndLoad`), a interface consulta automaticamente `${API_BASE_URL}/api/ndci/raw`, carrega os dados em cache do GEE, verifica se há novas passagens do satélite Sentinel-2 na janela de 14 dias e, caso novas cenas sejam incorporadas (`syncStatus === 'updated'`), dispara automaticamente `fetchForecast(forecastHorizon)` para atualizar o modelo sem exigir qualquer clique do usuário.
   - **Remoção do card legado `"Área Amostrada / 100 pontos"` e alinhamento com a Frente 1 (`UI-03`):** O grid superior passou de 4 para 3 cards auditados (`Cenas Auditadas`, `Período Histórico` e `NDCI Médio no Período`), removendo integralmente o card e qualquer menção a `"100 pontos"`. Os textos e metadados agora refletem a grade nativa `UTM 23S (EPSG:32723, 20 m)` com até `270 pixels únicos de água` ($\ge 81$ pixels limpos/cena em raio de 175 m), máscaras `QA60`, `MSK_CLDPRB < 20%`, `SCL` e `NDWI > 0.05`.
   - **Alinhamento com a Frente 2 (`Prophet + AR(1)` e janelas validadas):** Os seletores de horizonte foram atualizados para as janelas validadas na CV observacional (`+7 dias`, `+15 dias (Ótimo)`, `+30 dias`, `+45 dias`), com `15 dias` como horizonte operacional padrão. A legenda e o rodapé diferenciam explicitamente a curva histórica (`Suavização Descritiva σ=15d` e `Faixa Descritiva Local ±1σ`) da projeção preditiva (`Prophet + AR(1) — Banda 80% Calibrada`).
   - **URL configurável (`UI-01`), `AbortController` (`UI-02`) e correção de coordenadas do mouse no SVG (`UI-04`):** Todas as requisições usam `API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'`. Mudanças rápidas de horizonte cancelam requisições anteriores via `AbortController`. Nos handlers `handleMouseDown` e `handleMouseMove` do `<rect>` interno do SVG, a conversão de coordenadas passou a somar `padding.left` e escalar por `chartWidth` (`padding.left + ((e.clientX - rect.left) / rect.width) * chartWidth`), eliminando o erro de offset de 75 px.

2. **Dashboard de Telemetria, Classificação de pH, Preservação de Nulos e Mapa ([`App.tsx`](./App.tsx), [`types.ts`](./types.ts)) (`UI-02`, `UI-05`, `UI-06`, `UI-07`, `UI-08`, `UI-10`):**
   - **Precedência de pH crítico e badge nos cards (`UI-05`):** Em `getMetricStatus`, a condição crítica `value < 4.5 || value > 8.5` agora é avaliada antes de `value < 5 || value > 8`. O componente `StatCard` exibe um badge colorido (`Normal`, `Atenção`, `Crítico`) refletindo `metric.status`.
   - **Preservação de `null` em leituras ausentes (`UI-06`):** `toValidNumber` retorna `null` para leituras nulas/inválidas em vez de `0`, evitando falsos zeros nos gráficos `<Area connectNulls />` e nas estatísticas.
   - **Filtro temporal real de 48h no modo diário (`UI-07`) e coordenadas reais no mapa (`UI-08`):** O modo `daily` filtra os registros pelas últimas 48h a partir do timestamp mais recente. No `ReservoirMap`, os pontos de referência usam coordenadas `lat`/`lon` reais no Reservatório do Funil, a legenda `NDCI_LEGEND` exibe intervalos numéricos explícitos e falhas de tile são reportadas em `mapError`. O cabeçalho reflete dinamicamente `Telemetria Ativa` vs. `Modo Cache / Offline`, e a navegação escuta `hashchange`.

3. **Feedback NPS, Logo SVG e Reprodutibilidade ([`views/FeedbackView.tsx`](./views/FeedbackView.tsx), [`components/brand.tsx`](./components/brand.tsx), [`package.json`](./package.json), [`README.md`](./README.md)) (`UI-09`, `UI-10`, `DEV-01`, `DEV-03`):**
   - `FeedbackView.tsx` protege leituras/escritas em `localStorage` com `try/catch` e validação de campos, informando claramente a combinação com a base demonstrativa inicial de 40 votos.
   - `AquaLogo` em `components/brand.tsx` usa `useId()` para evitar colisão de IDs `<linearGradient>` no DOM.
   - `package.json` inclui `"typecheck": "tsc --noEmit"` e `"test:py": "python -m unittest discover -s tests -v"`, e `README.md` foi atualizado com toda a especificação científica e técnica das 4 Frentes.

---

### Hashes SHA-256 atualizados após a conclusão das Frentes 1, 2, 3 e 4

| Artefato | SHA-256 | Status |
|---|---|---|
| `prophet/dados_ndci_funil.csv` | `f841e2b81dbf5b09087c7bd8aededf53c1ec68d89df7bce1ff71591df9f9ae84` | Regenerado na Frente 1 (519 cenas ópticas em 20m UTM) |
| `prophet/dados_ndci_limpos.csv` | `8fd1fc07f79782f9bc245c4bab691c59f6032cefaaa36fb42e7f6052e1db9f6a` | Atualizado na Frente 2 (519 cenas aprovadas por QA causal, sem poda circular) |
| `prophet/modelo_ndci_prophet.json` | `6abd3ce23d28b3f8f0543b66694ee35a2ee39fe5912b6e00c5ea1ba2d35cdd13` | Atualizado na Frente 2 (`yearly=8, cp=0.03, sp=1.0, weekly=False`) |
| `prophet/relatorio_metricas.json` | `1cce595ee44758c358178164a0b0d75c918d6eb8b0ff60a7093f5ab1c7dd0401` | Atualizado na Frente 2 (8 janelas até 45d, baselines, skill, holdout e hashes) |
| `prophet/treinamento_ndci_prophet.py` | `1cf588bc4b5ce99a7537ed1511821b8665e81a4bd694846b12ebee73382e9f5c` | Refatorado na Frente 2 (`ML-01` a `ML-04`, `ML-07`, `ML-10`) |
| `prophet/treinamento_ndci_prophet.ipynb` | `9e27a7334cf1c235dc6647bdcc68dddf9ecdc5326cbccf8d1c865b86d300f4ce` | Sincronizado na Frente 2 com o pipeline modular (`ML-10`) |
| `backend/forecast_service.py` | `27c9e0b31a0c8ee3b3d3758059e5ac99b8eb9b8898b481d0b00408c072210596` | Refatorado nas Frentes 2 e 3 (`ML-05` a `ML-09`, `MAX_OPERATIONAL_FORECAST_DAYS`) |
| `backend/gee_sync_service.py` | `51bd2ccd371670d4629b6cbc8951865aa857ebb88bc9c106b60d5a33578ec98c` | Refatorado nas Frentes 1 e 3 (`GEO-01` a `GEO-05`, `API-03`) |
| `backend/main.py` | `2498ea057f972db39ea4d2d07f0d6f88c42aff10b5cedd07aa7c7dc3a393635e` | Refatorado na Frente 3 (`SEC-02`, `API-01` a `API-05`, `app_dir`) |
| `backend/scraper_scheduler.py` | `9fcaac68a9af5322e847e78cb0f8b3e04efbda39f7d93bdf55d195c875d96adf` | Refatorado na Frente 3 (`API-03`, `API-04`, `ETL-03`) |
| `scraper/scraper.py` | `6651cb5cf1f726505954941cd4121e271481c6e441f043648bb6844d8bf823e0` | Refatorado na Frente 3 (`SEC-01`, `ETL-01` a `ETL-04`) |
| `views/ForecastView.tsx` | `19e3d25994a2c1994f6f5e5b2a1e7c802e69973da96a87104f036e21a7917f7f` | Refatorado nas Frentes 2 e 4 (`ML-09`, `UI-01` a `UI-04`, `UI-10`) |
| `App.tsx` | `bf6ff4ce25da09753f9511630dc5ebcfe6f3b0a69fce43d84b007cca55f670f6` | Refatorado na Frente 4 (`UI-02`, `UI-05` a `UI-08`, `UI-10`) |
| `views/FeedbackView.tsx` | `6214c57c188905d603bcaf45571f489041e1dcaf3d03083e48c562648caca193` | Refatorado na Frente 4 (`UI-09`) |
| `components/brand.tsx` | `99c87301f28d5f1fb0a774a71ea1d60566a15c1a798d42cddd5a9613f0e059fb` | Refatorado na Frente 4 (`UI-10`) |
| `tests/test_frente3_security_etl_api.py` | `c1ffd5b6a3cb50a3fb581d010b6aab869b9c00fb675c9449f10c7d6a19a09cc0` | Criado na Frente 3 (6 testes de `SEC`, `ETL` e `API`) |
| `tests/test_frente4_ui_contracts.py` | `9cfecc2e2ee61001aab029081a8ef73da7714e7e58253c541b24346b2504af7f` | Criado na Frente 4 (6 testes de `UI-01` a `UI-10`, `DEV-01`, `DEV-03`) |
| `tests/test_prophet_frente2.py` | `bb674780d1c2bdad3827e8e4664f60987d1aaf57a4494d9cab12b5b7e49f3b01` | Criado na Frente 2 (6 testes integrados de `ML-01` a `ML-10`) |
| `tests/test_gee_pipeline.py` | `e45b982b04f8fce64da7210b12c1f94b5f3f33177e8e1c44c4eb5084476afe22` | Criado na Frente 1 (5 testes de `GEO-01` a `GEO-06`) |
| `tests/test_ndci_metrics.py` | `7b6401538cf9835a8d08e99e857e9bf72ab7442d37f741428ef58bf52e81fb13` | Criado no item `M2` (5 testes de contrato sem MAPE) |
