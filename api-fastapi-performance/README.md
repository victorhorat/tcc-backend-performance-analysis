# API FastAPI — TCC Performance

Implementação em Python + FastAPI para o estudo comparativo de performance.

## Stack

- Python 3.10+ / FastAPI
- SQLAlchemy + PostgreSQL
- Pydantic v2
- Uvicorn (servidor ASGI)

## Execução

```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8082
```

API disponível em `http://localhost:8082` — Swagger em `http://localhost:8082/docs`

## Endpoints

### Sensores
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/sensors` | Cadastrar sensor |
| `GET` | `/api/sensors` | Listar sensores |
| `DELETE` | `/api/sensors/{id}` | Deletar sensor (cascata na telemetria) |

### Telemetria
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/telemetry` | Registrar leitura (valida `api_key`) |
| `POST` | `/api/telemetry/bulk` | Registrar múltiplas leituras |
| `GET` | `/api/telemetry/sensor/{id}` | Buscar leituras por sensor |
| `GET` | `/api/telemetry/sensor/{id}/average` | Calcular média de leituras |

## Fluxo de Validação

Cada inserção valida o par `sensor_id` + `api_key` contra o banco antes de persistir — simulando autenticação real de dispositivos IoT.
