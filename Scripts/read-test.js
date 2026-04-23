import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 }, // 100 usuários lendo dados simultaneamente
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<150'], // Leitura deve ser mais rápida que escrita
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // Sorteia um dos 500 sensores para consultar
  const sensorNum = Math.floor(Math.random() * 500) + 1;
  const sensorId = `sensor-${sensorNum}`;

  // Rota de GET que busca telemetrias por sensor
  const url = `http://${__ENV.TARGET_URL}/api/telemetry/sensor/${sensorId}`;

  const res = http.get(url);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'data is not empty': (r) => r.json().length >= 0,
  });

  sleep(0.1);
}