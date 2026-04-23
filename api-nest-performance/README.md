# API NestJS — TCC Performance

Implementação em Node.js + TypeScript para o estudo comparativo de performance.

## Stack

- Node.js 18+ / NestJS
- TypeORM + PostgreSQL
- Class-validator
- Swagger (`@nestjs/swagger`)

## Execução

```bash
npm install
npm run start:dev
```

API disponível em `http://localhost:8083` — Swagger em `http://localhost:8083/swagger-ui`

## Endpoints

### Sensores
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/sensors` | Cadastrar sensor |
| `GET` | `/api/sensors` | Listar sensores |
| `GET` | `/api/sensors/:id` | Buscar sensor por ID |
| `DELETE` | `/api/sensors/:id` | Deletar sensor (cascata na telemetria) |

### Telemetria
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/telemetry` | Registrar leitura (valida `apiKey`) |
| `POST` | `/api/telemetry/bulk` | Registrar múltiplas leituras |
| `GET` | `/api/telemetry/sensor/:id` | Buscar leituras por sensor |
| `GET` | `/api/telemetry/sensor/:id/average` | Calcular média de leituras |

## Fluxo de Validação

Cada inserção valida o par `sensorId` + `apiKey` contra o banco antes de persistir — simulando autenticação real de dispositivos IoT.
