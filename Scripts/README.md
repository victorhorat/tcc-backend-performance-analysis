# Suite de Testes de Performance — TCC

Comparação de desempenho entre **NestJS**, **FastAPI** e **Spring Boot**.

---

## Arquivos

| Arquivo | Função |
|---|---|
| `load-test.js` | Carga estável — 100 VUs, POST, 2min |
| `stress-test.js` | Estresse progressivo — 100→1000 VUs, POST, 4min |
| `spike-test.js` | Pico repentino — 10→1500 VUs, POST, 1min |
| `read-test.js` | Leitura simples — 100 VUs, GET, 2min |
| `averege-test.js` | Agregação/média — 80 VUs, GET, 2min |
| `setup-banco.js` | Recria o banco e insere 500 sensores |
| `run-all-tests.ps1` | Roda os 5 testes de um framework (3 amostras cada) |
| `monitor-resources.ps1` | Coleta CPU% e RAM durante os testes |
| `analyze-results.js` | Gera tabelas comparativas para o TCC |

---

## Pré-requisitos

- [k6](https://k6.io/docs/get-started/installation/) instalado e no PATH
- Node.js 18+
- Docker Desktop rodando

---

## Execução

Repita os passos 1–3 para **cada framework**. O banco deve ser zerado entre eles para garantir comparação justa.

### Para cada framework

**Antes de começar:**
- Feche navegador, Discord, Spotify e outros apps pesados
- Suba apenas o serviço alvo (pare os outros dois)
- Certifique-se de que o Docker/PostgreSQL está rodando

**Passo 1 — Resetar o banco** (zera telemetria e recria 500 sensores)
```powershell
node setup-banco.js
```

**Passo 2 — Iniciar o monitor de recursos** (terminal separado, opcional)
```powershell
# NestJS
.\monitor-resources.ps1 -ProcessName "node"   -OutputFile "resultados/nest_resources.csv"

# FastAPI
.\monitor-resources.ps1 -ProcessName "python" -OutputFile "resultados/fastapi_resources.csv"

# Spring Boot
.\monitor-resources.ps1 -ProcessName "java"   -OutputFile "resultados/spring_resources.csv"
```
> O script fica rodando e exibe CPU/RAM a cada 3s. Pare com **Ctrl+C** após os testes.

**Passo 3 — Rodar os testes**
```powershell
.\run-all-tests.ps1 -Framework nest
.\run-all-tests.ps1 -Framework fastapi
.\run-all-tests.ps1 -Framework spring
```
> O script pede ENTER antes de começar — confirme que a API está no ar. Duração: ~38 min por framework.

### Após todos os frameworks

**Passo 4 — Analisar resultados**
```powershell
node analyze-results.js
```

---

## Duração estimada por teste

| Teste | VUs | Tipo | Duração/amostra |
|---|---|---|---|
| load | 100 | POST | 2 min |
| stress | 100→1000 | POST | 4 min |
| spike | 10→1500 | POST | 1 min |
| read | 100 | GET | 2 min |
| average | 80 | GET | 2 min |

**Total por framework (3 amostras + cooldowns): ~38 min — Total geral: ~2h**

> Medido na execução real:
> - Spring Boot completou em **37.7 minutos**
> - FastAPI completou em **33.6 minutos** (sem spike test — ver `fastapi_problemas_encontrados.txt`)
> - NestJS completou em **37.7 minutos**

---

## Estrutura dos resultados

```
resultados/
├── nest_load_s1.csv / _s2 / _s3        # Dados brutos k6 (3 amostras)
├── nest_load_s1_summary.json           # Resumo JSON por amostra
├── nest_load_s1.txt                    # Log completo do k6
├── nest_resources.csv                  # CPU/RAM monitorados
├── fastapi_* / spring_*               # Mesma estrutura
└── comparison.json                     # Gerado pelo analyze-results.js
```

---

## Métricas coletadas

| Métrica | Ferramenta |
|---|---|
| Tempo de resposta (avg, P90, P95, max) | k6 |
| Throughput (RPS) | k6 |
| Taxa de erro | k6 |
| CPU% e RAM MB | monitor-resources.ps1 |
