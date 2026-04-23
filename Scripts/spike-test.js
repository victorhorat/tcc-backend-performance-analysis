import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '10s', target: 1500 }, // Salto de 10 para 1500 em 10 segundos
    { duration: '30s', target: 1500 },
    { duration: '10s', target: 0 },
  ],
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