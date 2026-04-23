# Estudo Comparativo de Performance: Spring Boot vs FastAPI vs NestJS

Este repositório contém a implementação prática do meu Trabalho de Conclusão de Curso (TCC) em Ciência da Computação na CESAR School. O objetivo do projeto é analisar e comparar o desempenho de diferentes frameworks de backend no processamento e persistência de altos volumes de dados de telemetria.

## Sobre o Estudo
O projeto simula um cenário real de IoT/Telemetria, onde sensores enviam milhares de registros que precisam ser processados de forma eficiente. Avaliamos três pilares tecnológicos distintos para entender como cada runtime lida com concorrência, memória e latência:

1. **Spring Boot (Java)**: Focado em robustez e multithreading na JVM.
2. **FastAPI (Python)**: Utilizando o modelo de concorrência assíncrona (AsyncIO).
3. **NestJS (Node.js)**: Baseado no Event Loop do motor V8.

## Arquitetura do Ecossistema
Todas as aplicações compartilham a mesma instância de banco de dados para garantir que a comparação de performance foque exclusivamente no comportamento dos frameworks.

- **Banco de Dados**: PostgreSQL (rodando via Docker) na porta 5432.
- **Portas das Aplicações**:
  - **8081**: Spring Boot (Java)
  - **8082**: FastAPI (Python)
  - **8083**: NestJS (Node.js)

---

## Arquitetura do Banco de Dados (PostgreSQL)

O sistema utiliza um modelo relacional desenhado para suportar o **Cenário B**, onde cada inserção de dado exige uma verificação prévia de identidade.

### 1. Tabela `sensors` (Diretório de Dispositivos)
| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| **id** | `VARCHAR(50)` | **PK** - Identificador único do sensor. |
| **api_key** | `VARCHAR(100)` | Chave secreta usada para validar o handshake. |
| **name** | `VARCHAR(100)` | Nome descritivo do dispositivo. |
| **location** | `VARCHAR(100)` | Localização física/lógica do sensor. |
| **created_at** | `TIMESTAMP` | Registro automático da data de cadastro. |

### 2. Tabela `telemetry` (Histórico de Leituras)
| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| **id** | `SERIAL` | **PK** - Identificador autoincrementável. |
| **sensor_id** | `VARCHAR(50)` | **FK** - Referência ao sensor de origem. |
| **value** | `DECIMAL(10,2)` | Valor numérico da leitura. |
| **unit** | `VARCHAR(20)` | Unidade de medida (ex: celsius, v, %). |
| **timestamp** | `TIMESTAMP` | Carimbo de tempo da persistência. |

---

## Como Executar

### 1. Infraestrutura (Docker)
Suba o banco de dados PostgreSQL:
```bash
docker-compose up -d
```

### 2. Inicialização das APIs
Abra um terminal para a tecnologia que deseja testar:

#### **Spring Boot (Porta 8081)**
```bash
cd api-spring-performance
./mvnw spring-boot:run
```

#### **FastAPI (Porta 8082)**
```bash
cd api-fastapi-performance
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8082
```

#### **NestJS (Porta 8083)**
```bash
cd api-nest-performance
npm install
npm run start:dev
```

### Swagger / Documentação das APIs

| Framework | URL |
| :--- | :--- |
| Spring Boot | http://localhost:8081/swagger-ui/index.html |
| FastAPI | http://localhost:8082/docs |
| NestJS | http://localhost:8083/swagger-ui |

---

### Bruno Collection

A pasta [`bruno-collection/`](bruno-collection/) contém todos os endpoints das 3 APIs prontos para importar no [Bruno](https://www.usebruno.com/).

**Como importar:** Abra o Bruno → **Open Collection** → selecione a pasta `bruno-collection/`.

| Pasta | Endpoints |
| :--- | :--- |
| `Spring Boot (8081)` | Sensors: Criar, Listar, Deletar / Telemetry: Buscar, Média, Registrar, Bulk |
| `FastAPI (8082)` | Sensors: Criar, Listar, Deletar / Telemetry: Buscar, Média, Registrar, Bulk |
| `NestJS (8083)` | Sensors: Criar, Listar, Buscar por ID, Deletar / Telemetry: Buscar, Média, Registrar, Bulk |

> **Atenção:** FastAPI usa `snake_case` nos campos do body (`sensor_id`, `api_key`). Spring Boot e NestJS usam `camelCase` (`sensorId`, `apiKey`).

---

### 3. Popular o Banco de Dados

Execute **uma única vez** para resetar o banco e criar os 500 sensores de teste:

```powershell
cd Scripts
node setup-banco.js
```

Saída esperada: `✅ SUCESSO: Banco resetado e 500 sensores criados!`

---

### 4. Execução dos Testes (k6)

> **Pré-requisitos:** [k6](https://k6.io/docs/get-started/installation/) instalado e no PATH, Node.js 18+.

Os testes são executados via script de automação PowerShell. Rode **um framework por vez** para não contaminar os resultados de CPU/RAM.

#### Suite completa (3 amostras por teste, padrão recomendado para o TCC)

```powershell
# NestJS
.\run-all-tests.ps1 -Framework nest

# FastAPI
.\run-all-tests.ps1 -Framework fastapi

# Spring Boot
.\run-all-tests.ps1 -Framework spring
```

#### Opções do script

| Parâmetro | Descrição | Padrão |
| :--- | :--- | :--- |
| `-Framework` | `nest`, `fastapi` ou `spring` | obrigatório |
| `-Samples` | Número de amostras por teste | `3` |
| `-SkipTests` | Testes a pular (ex: `"load,stress"`) | nenhum |
| `-CooldownSeconds` | Pausa entre testes para o banco estabilizar | `30` |

#### Cenários de teste executados

| Arquivo | Cenário |
| :--- | :--- |
| `load-test.js` | Carga estável — 100 VUs, POST, 2min |
| `stress-test.js` | Estresse progressivo — 100→1000 VUs, POST, 4min |
| `spike-test.js` | Pico repentino — 10→1500 VUs, POST, 1min |
| `read-test.js` | Leitura simples — 100 VUs, GET, 2min |
| `averege-test.js` | Agregação/média — 80 VUs, GET, 2min |

#### Monitorar CPU e RAM (opcional, mas recomendado)

Em um **segundo terminal**, antes de iniciar cada framework:

```powershell
# NestJS
.\monitor-resources.ps1 -ProcessName "node" -OutputFile "resultados/nest_resources.csv"

# FastAPI
.\monitor-resources.ps1 -ProcessName "python" -OutputFile "resultados/fastapi_resources.csv"

# Spring Boot
.\monitor-resources.ps1 -ProcessName "java" -OutputFile "resultados/spring_resources.csv"
```

Pare com **Ctrl+C** após o `run-all-tests.ps1` finalizar para aquele framework.

---

### 5. Analisar os Resultados

Após rodar os testes dos 3 frameworks:

```powershell
cd Scripts
node analyze-results.js
```

Gera tabelas comparativas no console e o arquivo `Scripts/resultados/comparison.json`.

---

### Estrutura dos Arquivos Gerados

```
Scripts/resultados/
├── nest_load_s1.csv              # Dados brutos k6 (amostra 1)
├── nest_load_s1_summary.json     # Resumo JSON (métricas principais)
├── nest_load_s1.txt              # Log completo do k6
├── nest_load_s2.*                # Amostra 2
├── nest_load_s3.*                # Amostra 3
├── nest_stress.*  / nest_spike.*  / nest_read.*  / nest_average.*
├── nest_resources.csv            # CPU/RAM monitorados
│
├── fastapi_*  (mesma estrutura)
├── spring_*   (mesma estrutura)
│
└── comparison.json               # Gerado pelo analyze-results.js
```

---

## Estrutura do Repositório
- `/api-spring-performance`: Implementação em Java 21 (Spring Boot 4).
- `/api-fastapi-performance`: Implementação em Python 3.10+ (FastAPI + AsyncIO).
- `/api-nest-performance`: Implementação em TypeScript/Node.js (NestJS).
- `/Scripts`: Scripts de setup do banco, testes k6, automação e análise.
- `/Infra`: Configurações de Docker e ambiente.

---
