import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 }, // Sobe para 100 usuários
    { duration: '1m', target: 100 },  // Mantém estável por 1 minuto
    { duration: '30s', target: 0 },   // Desce gradualmente
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% das requisições abaixo de 200ms
    http_req_failed: ['rate<0.01'],    // Falha menor que 1%
  },
};

export default function () {
  const sensorNum = Math.floor(Math.random() * 500) + 1;
  const url = `http://${__ENV.TARGET_URL}/api/telemetry`;
  
  const payload = JSON.stringify({
    sensorId: `sensor-${sensorNum}`,
    apiKey: 'chave-mestra-tcc',
    value: parseFloat((Math.random() * 49 + 1).toFixed(2)),
    unit: 'celsius'
  });

  const res = http.post(url, payload, { headers: { 'Content-Type': 'application/json' } });

  check(res, { 'status is 201': (r) => r.status === 201 });
  sleep(0.1);
}