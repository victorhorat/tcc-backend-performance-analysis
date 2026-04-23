# API Spring Boot — TCC Performance

Implementação em Java 21 + Spring Boot 4 para o estudo comparativo de performance.

## Stack

- Java 21 / Spring Boot 4
- Spring Data JPA (Hibernate) + PostgreSQL
- Lombok + Jakarta Validation
- SpringDoc OpenAPI (Swagger)

## Execução

```bash
./mvnw spring-boot:run
```

API disponível em `http://localhost:8081` — Swagger em `http://localhost:8081/swagger-ui/index.html`

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
| `POST` | `/api/telemetry` | Registrar leitura (valida `apiKey`) |
| `POST` | `/api/telemetry/bulk` | Registrar múltiplas leituras |
| `GET` | `/api/telemetry/sensor/{id}` | Buscar leituras por sensor |
| `GET` | `/api/telemetry/sensor/{id}/average` | Calcular média de leituras |

## Fluxo de Validação

Cada inserção valida o par `sensorId` + `apiKey` contra o banco antes de persistir — simulando autenticação real de dispositivos IoT.
