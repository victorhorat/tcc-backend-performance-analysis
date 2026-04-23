import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 80 }, // 80 usuários consultando médias simultaneamente
    { duration: '1m', target: 80 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    // Esse teste costuma ser mais lento que o GET simples
    http_req_duration: ['p(95)<300'], 
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // Sorteia um dos 500 sensores
  const sensorNum = Math.floor(Math.random() * 500) + 1;
  const sensorId = `sensor-${sensorNum}`;

  // Rota de GET que calcula a média (ajuste a URL conforme sua API)
  const url = `http://${__ENV.TARGET_URL}/api/telemetry/sensor/${sensorId}/average`;

  const res = http.get(url);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has average value': (r) => r.json().average !== undefined,
  });

  sleep(0.2); // Um usuário real não atualiza a média a cada milissegundo
}