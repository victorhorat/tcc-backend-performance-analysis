'use strict';

const fs   = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'resultados', 'comparison.json'), 'utf8'));

const FRAMEWORKS = ['nest', 'fastapi', 'spring'];
const TESTS      = ['load', 'stress', 'spike', 'read', 'average'];

const FW_LABELS = { nest: 'NestJS', fastapi: 'FastAPI', spring: 'Spring Boot' };
const FW_COLORS = { nest: '#e0245e', fastapi: '#009688', spring: '#6db33f' };
const FW_COLORS_ALPHA = { nest: 'rgba(224,36,94,0.15)', fastapi: 'rgba(0,150,136,0.15)', spring: 'rgba(109,179,63,0.15)' };

const TEST_LABELS = {
  load:    'Carga — POST 100 VUs',
  stress:  'Estresse — POST 1000 VUs',
  spike:   'Pico — POST 1500 VUs',
  read:    'Leitura — GET 100 VUs',
  average: 'Agregacao — GET 80 VUs',
};
const TEST_SHORT = { load: 'Carga', stress: 'Estresse', spike: 'Pico', read: 'Leitura', average: 'Agregacao' };

function badge(fw) {
  return `<span class="badge" style="background:${FW_COLORS[fw]}">${FW_LABELS[fw]}</span>`;
}

const WIN = `<span class="win-badge">1°</span>`;

function p95Cell(fw, test) {
  const d = data[fw][test];
  if (!d) return '<td>-</td>';
  // Only compare valid entries (error < 20%)
  const vals = FRAMEWORKS.map(f => (data[f][test]?.error_pct ?? 0) < 20 ? (data[f][test]?.p95_ms ?? Infinity) : Infinity);
  const min = Math.min(...vals);
  const label = d.p95_std_ms != null ? `${d.p95_ms}ms <small>±${d.p95_std_ms}</small>` : `${d.p95_ms}ms`;
  return d.p95_ms === min && (d.error_pct ?? 0) < 20 ? `<td class="best">${WIN} ${label}</td>` : `<td>${label}</td>`;
}

function rpsCell(fw, test) {
  // Only compare valid entries (error < 20%)
  const vals = FRAMEWORKS.map(f => (data[f][test]?.error_pct ?? 0) < 20 ? (data[f][test]?.rps ?? 0) : 0);
  const max = Math.max(...vals);
  const v = data[fw][test]?.rps;
  const err = data[fw][test]?.error_pct ?? 0;
  if (v == null) return '<td>-</td>';
  return v === max && err < 20 ? `<td class="best">${WIN} ${v}</td>` : `<td>${v}</td>`;
}

function errorCell(v, testKey) {
  if (v == null) return '<td>-</td>';
  if (v > 5)  return `<td class="bad">${v}%</td>`;
  if (v > 0)  return `<td class="warn">${v}%</td>`;
  // Only show WIN badge if at least one other framework had errors in this test
  const anyError = testKey && FRAMEWORKS.some(f => (data[f][testKey]?.error_pct ?? 0) > 0);
  return anyError ? `<td class="good">${WIN} 0%</td>` : `<td class="good">0%</td>`;
}

function testWinner(test) {
  const valid = FRAMEWORKS.filter(fw => data[fw][test] && (data[fw][test].error_pct ?? 0) < 20);
  if (valid.length < 2) return null;

  const pts = {};
  for (const fw of FRAMEWORKS) pts[fw] = 0;
  pts[valid.reduce((a, b) => (data[a][test].rps    ?? 0)        > (data[b][test].rps    ?? 0)        ? a : b)]++;
  pts[valid.reduce((a, b) => (data[a][test].p95_ms ?? Infinity) < (data[b][test].p95_ms ?? Infinity) ? a : b)]++;

  const maxPts = Math.max(...Object.values(pts));
  const tied = Object.entries(pts).filter(([, v]) => v === maxPts).map(([fw]) => fw);
  if (tied.length === 1) return tied[0];
  // Tiebreaker: higher RPS
  return tied.reduce((a, b) => (data[a][test].rps ?? 0) > (data[b][test].rps ?? 0) ? a : b);
}

function summaryWinner(metricKey, higherIsBetter) {
  const pts = {};
  for (const fw of FRAMEWORKS) pts[fw] = 0;
  for (const test of TESTS) {
    const valid = FRAMEWORKS.filter(fw => data[fw][test] && (data[fw][test].error_pct ?? 0) < 20);
    if (valid.length < 2) continue;
    const best = valid.reduce((a, b) => {
      const va = data[a][test]?.[metricKey] ?? (higherIsBetter ? -Infinity : Infinity);
      const vb = data[b][test]?.[metricKey] ?? (higherIsBetter ? -Infinity : Infinity);
      return higherIsBetter ? (va > vb ? a : b) : (va < vb ? a : b);
    });
    pts[best]++;
  }
  const maxPts = Math.max(...Object.values(pts));
  const tied = Object.entries(pts).filter(([, v]) => v === maxPts).map(([fw]) => fw);
  if (tied.length === 1) return tied[0];
  // Tiebreaker: soma total da metrica nos testes validos
  const sums = {};
  for (const fw of tied) {
    sums[fw] = TESTS.reduce((s, t) => {
      if (!data[fw][t] || (data[fw][t].error_pct ?? 0) >= 20) return s;
      return s + (data[fw][t][metricKey] ?? 0);
    }, 0);
  }
  const best = higherIsBetter
    ? Math.max(...Object.values(sums))
    : Math.min(...Object.values(sums));
  const afterTie = tied.filter(fw => sums[fw] === best);
  return afterTie.length === 1 ? afterTie[0] : null; // empate real = sem vencedor
}

// Retorna mapa fw -> lista de vitórias descritivas
function buildWinMap() {
  const wins = { nest: [], fastapi: [], spring: [] };
  for (const test of TESTS) {
    const valid = FRAMEWORKS.filter(fw => data[fw][test] && (data[fw][test].error_pct ?? 0) < 20);
    if (valid.length < 2) continue;
    const bestRps = valid.reduce((a, b) => (data[a][test].rps ?? 0) > (data[b][test].rps ?? 0) ? a : b);
    const bestP95 = valid.reduce((a, b) => (data[a][test].p95_ms ?? Infinity) < (data[b][test].p95_ms ?? Infinity) ? a : b);
    wins[bestRps].push(`RPS ${TEST_SHORT[test]}`);
    wins[bestP95].push(`P95 ${TEST_SHORT[test]}`);
  }
  const withRes = FRAMEWORKS.filter(fw => data[fw]._resources);
  if (withRes.length >= 2) {
    wins[withRes.reduce((a, b) => data[a]._resources.avgCpu < data[b]._resources.avgCpu ? a : b)].push('CPU mais eficiente');
    wins[withRes.reduce((a, b) => data[a]._resources.avgMem < data[b]._resources.avgMem ? a : b)].push('RAM mais leve');
  }
  return wins;
}

function testTable(test) {
  const winner = testWinner(test);

  // Sort frameworks: best RPS first (but skip invalid results for ordering)
  const sorted = [...FRAMEWORKS].sort((a, b) => {
    const da = data[a][test];
    const db = data[b][test];
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    // Treat high-error entries as worst
    const rpsA = (da.error_pct ?? 0) >= 20 ? -1 : (da.rps ?? 0);
    const rpsB = (db.error_pct ?? 0) >= 20 ? -1 : (db.rps ?? 0);
    return rpsB - rpsA;
  });

  const rows = sorted.map(fw => {
    const d = data[fw][test];
    if (!d) return `<tr><td>${badge(fw)}</td><td colspan="7" class="na">Sem dados</td></tr>`;
    const n = d.samples > 1 ? ` <small>(n=${d.samples})</small>` : '';
    const skippedNote = (d.error_pct ?? 0) >= 20
      ? ` <small style="color:#dc2626">(excluido do placar)</small>`
      : '';
    const rejectedNote = (d.error_pct ?? 0) >= 20
      ? `<tr><td colspan="8" class="rejected-note">
          <strong>Resumo:</strong> ${d.error_pct}% das requisicoes foram <strong>recusadas no nivel TCP</strong> — o kernel do Windows
          esgotou a fila de conexoes (backlog) antes do servidor processar. As ${Math.round((d.total_reqs ?? 0) * (d.error_pct / 100)).toLocaleString('pt-BR')} requisicoes
          rejeitadas receberam TCP RST imediatamente, sem nem chegar ao FastAPI.
          Isso nao e falha do framework, e uma limitacao de infraestrutura (Windows + uvicorn sem proxy reverso).
          Resultado excluido do placar.
         </td></tr>`
      : '';
    const isWinner = winner === fw;
    const winnerBadge = isWinner ? ` <span class="winner-tag" style="border-color:${FW_COLORS[fw]};color:${FW_COLORS[fw]}">vencedor</span>` : '';
    const rowClass = isWinner ? ' class="winner-row"' : '';
    return `
      <tr${rowClass}>
        <td>${badge(fw)}${winnerBadge}${n}${skippedNote}</td>
        <td>${d.avg_ms}ms</td>
        <td>${d.med_ms}ms</td>
        <td>${d.p90_ms}ms</td>
        ${p95Cell(fw, test)}
        <td>${d.max_ms}ms</td>
        ${rpsCell(fw, test)}
        ${errorCell(d.error_pct, test)}
      </tr>${rejectedNote}`;
  }).join('');

  return `
    <div class="card">
      <h2>${TEST_LABELS[test]}</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Framework</th><th>Avg</th><th>Median</th><th>P90</th><th>P95 (±std)</th><th>Max</th><th>RPS</th><th>Erro%</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

function summaryTable(label, fn, metricKey, higherIsBetter) {
  const winner = metricKey != null ? summaryWinner(metricKey, higherIsBetter) : null;
  const rows = FRAMEWORKS.map(fw => {
    const cells = TESTS.map(t => fn(fw, t)).join('');
    const isWinner = winner === fw;
    const tag = isWinner ? ` <span class="winner-tag" style="border-color:${FW_COLORS[fw]};color:${FW_COLORS[fw]}">vencedor</span>` : '';
    return `<tr${isWinner ? ' class="winner-row"' : ''}><td>${badge(fw)}${tag}</td>${cells}</tr>`;
  }).join('');
  const headers = TESTS.map(t => `<th>${TEST_SHORT[t]}</th>`).join('');
  return `
    <div class="card">
      <h2>${label}</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Framework</th>${headers}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

function glossarySection() {
  return `
    <div class="card">
      <h2>Glossario de Metricas e Cenarios de Teste</h2>
      <div class="glossary">
        <div class="gl-block">
          <h3>O que e um VU (Virtual User)?</h3>
          <p>
            Um <strong>VU (Usuario Virtual)</strong> representa uma pessoa usando a API ao mesmo tempo.
            Se o teste usa 100 VUs, e como se 100 pessoas estivessem clicando no sistema simultaneamente,
            cada uma enviando requisicoes de forma continua. Quanto mais VUs, maior a pressao sobre o servidor.
          </p>
        </div>
        <div class="gl-block">
          <h3>O que e RPS (Requisicoes por Segundo)?</h3>
          <p>
            <strong>RPS</strong> mede quantas requisicoes o servidor consegue responder em 1 segundo.
            E o principal indicador de <em>throughput</em> (capacidade de trabalho). Quanto maior, melhor.
            Um RPS de 1000 significa que o servidor atendeu 1000 chamadas naquele segundo.
          </p>
        </div>
        <div class="gl-block">
          <h3>O que sao Avg, Median, P90 e P95?</h3>
          <p>
            Todas sao formas de medir latencia (tempo de resposta). Para entender P90 e P95,
            primeiro e preciso entender o conceito de <strong>percentil</strong>:
          </p>
          <p style="margin-top:.5rem">
            Imagine que voce ordenou todas as 10.000 requisicoes do teste do mais rapido para o mais lento.
            O <strong>percentil X</strong> e o tempo de resposta da requisicao que esta na posicao X% dessa fila ordenada.
            Em outras palavras: "X% das requisicoes foram respondidas em menos do que esse tempo."
            Exemplo: se o P95 e 200ms, significa que 9.500 das 10.000 requisicoes responderam em ate 200ms,
            e apenas 500 (os 5% mais lentos) demoraram mais.
          </p>
          <ul style="margin-top:.8rem">
            <li>
              <strong>Avg (Media)</strong> — soma de todos os tempos dividida pelo total de requisicoes.
              Facil de entender, mas distorcida por picos extremos: uma unica requisicao que travou por 10s
              puxa a media pra cima mesmo que todas as outras tenham sido rapidas.
            </li>
            <li>
              <strong>Median (Mediana = P50)</strong> — a requisicao exatamente no meio da fila ordenada.
              Metade foi mais rapida, metade foi mais lenta. Nao e afetada por outliers, por isso representa
              melhor a experiencia do usuario tipico do que a media.
            </li>
            <li>
              <strong>P90 (Percentil 90)</strong> — 90% das requisicoes responderam abaixo desse valor.
              Captura casos lentos mas descarta os 10% mais extremos, que podem ser anomalias pontuais.
            </li>
            <li>
              <strong>P95 (Percentil 95)</strong> — 95% das requisicoes responderam abaixo desse valor.
              E a metrica padrao em SLAs (acordos de nivel de servico) por equilibrar representatividade
              e robustez: ainda ignora os 5% de casos mais extremos, mas e mais exigente que o P90.
              Valores abaixo de 200ms sao considerados rapidos para o usuario final.
            </li>
          </ul>
        </div>
        <div class="gl-block">
          <h3>Os 5 Cenarios de Teste</h3>
          <ul>
            <li>
              <strong>Carga (Load)</strong> — 100 VUs por 2 minutos, enviando dados ao banco (POST).
              Simula o uso normal e estavel do sistema. E o cenario mais proximo do dia a dia real.
            </li>
            <li>
              <strong>Estresse (Stress)</strong> — comeca com 100 VUs e aumenta progressivamente ate 1000 VUs em 4 minutos.
              Testa o limite do servidor: ate onde ele aguenta antes de degradar ou travar?
            </li>
            <li>
              <strong>Pico (Spike)</strong> — salta de 10 para 1500 VUs em poucos segundos.
              Simula um evento repentino (ex: um post viral, uma promocao relampago). O servidor precisa absorver
              a carga imediatamente, sem tempo para se preparar.
            </li>
            <li>
              <strong>Leitura (Read)</strong> — 100 VUs por 2 minutos buscando dados (GET).
              Testa a performance de consultas no banco de dados, que retornam listas paginadas de registros.
            </li>
            <li>
              <strong>Agregacao (Average)</strong> — 80 VUs por 2 minutos fazendo consultas de media (GET).
              Testa queries mais pesadas que calculam estatisticas agregadas (media, contagem) sobre grandes volumes de dados.
            </li>
          </ul>
        </div>
        <div class="gl-block">
          <h3>O que sao RAM, CPU e Threads no contexto do servidor?</h3>
          <ul>
            <li>
              <strong>RAM (Memoria) em MB</strong> — quantidade de memoria que o processo do servidor ocupou
              durante os testes. Frameworks com runtime pesado (ex: JVM do Spring Boot) partem de um baseline
              alto mesmo sem carga. Menor consumo significa que o servidor e mais leve e deixa mais memoria
              disponivel para outros processos ou instancias.
            </li>
            <li>
              <strong>CPU %</strong> — percentual do processador consumido pelo processo do servidor.
              Um valor alto indica que o framework e intensivo em computacao; um valor baixo pode significar
              eficiencia ou que o gargalo estava em outro lugar (ex: banco de dados). Medido a cada 3 segundos
              durante toda a execucao dos testes.
            </li>
            <li>
              <strong>Threads</strong> — numero de threads que o processo manteve ativo simultaneamente.
              O Spring Boot usa um modelo de <em>thread-per-request</em> (uma thread por requisicao), por isso
              tem centenas de threads. O NestJS (Node.js) e o FastAPI (asyncio) usam um event loop com poucas
              threads, tratando multiplas requisicoes de forma assincrona num numero muito menor de threads.
              Mais threads nao e necessariamente melhor — depende da arquitetura do framework.
            </li>
          </ul>
        </div>
        <div class="gl-block">
          <h3>Nota sobre o FastAPI no teste de Pico</h3>
          <p>
            O FastAPI apresentou <strong>89% de erros</strong> no teste de Pico (1500 VUs) por uma limitacao
            de infraestrutura no Windows: o sistema operacional esgota a fila de conexoes TCP antes mesmo que
            o servidor consiga receber as requisicoes. Isso <em>nao e uma falha do FastAPI como framework</em>,
            mas sim do ambiente de teste (Windows + servidor unico sem proxy reverso).
            Por isso, o teste de Pico do FastAPI foi <strong>excluido do placar final</strong>.
            Em producao real (Linux + nginx), este problema nao ocorre.
          </p>
        </div>
        <div class="gl-block">
          <h3>Duracao Total dos Testes (tempo medido em execucao real)</h3>
          <p>Cada framework executou 5 cenarios com 3 amostras cada (exceto FastAPI, que pulou o Pico):</p>
          <table style="margin-top:.6rem;border-collapse:collapse;width:100%;font-size:.875rem">
            <thead>
              <tr>
                <th style="text-align:left;padding:.4rem .8rem;background:#f1f5f9;color:#475569;border-bottom:2px solid #e2e8f0">Framework</th>
                <th style="text-align:left;padding:.4rem .8rem;background:#f1f5f9;color:#475569;border-bottom:2px solid #e2e8f0">Testes executados</th>
                <th style="text-align:left;padding:.4rem .8rem;background:#f1f5f9;color:#475569;border-bottom:2px solid #e2e8f0">Duracao total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:.4rem .8rem;border-bottom:1px solid #f1f5f9"><span class="badge" style="background:${FW_COLORS.spring}">Spring Boot</span></td>
                <td style="padding:.4rem .8rem;border-bottom:1px solid #f1f5f9">5 cenarios x 3 amostras</td>
                <td style="padding:.4rem .8rem;border-bottom:1px solid #f1f5f9"><strong>37.7 min</strong></td>
              </tr>
              <tr>
                <td style="padding:.4rem .8rem;border-bottom:1px solid #f1f5f9"><span class="badge" style="background:${FW_COLORS.nest}">NestJS</span></td>
                <td style="padding:.4rem .8rem;border-bottom:1px solid #f1f5f9">5 cenarios x 3 amostras</td>
                <td style="padding:.4rem .8rem;border-bottom:1px solid #f1f5f9"><strong>37.7 min</strong></td>
              </tr>
              <tr>
                <td style="padding:.4rem .8rem"><span class="badge" style="background:${FW_COLORS.fastapi}">FastAPI</span></td>
                <td style="padding:.4rem .8rem">4 cenarios x 3 amostras (sem Pico)</td>
                <td style="padding:.4rem .8rem"><strong>33.6 min</strong></td>
              </tr>
            </tbody>
          </table>
          <p style="margin-top:.6rem;font-size:.8rem;color:#94a3b8">Media entre os tres frameworks (considerando Spring e NestJS): <strong>~36.3 min</strong> por framework.</p>
        </div>
      </div>
    </div>`;
}

function resourcesTable() {
  const hasRes = FRAMEWORKS.some(fw => data[fw]._resources);
  if (!hasRes) return '';

  const withRes = FRAMEWORKS.filter(fw => data[fw]._resources);
  const bestCpu = withRes.reduce((a, b) => data[a]._resources.avgCpu < data[b]._resources.avgCpu ? a : b);
  const bestMem = withRes.reduce((a, b) => data[a]._resources.avgMem < data[b]._resources.avgMem ? a : b);

  const rows = FRAMEWORKS.map(fw => {
    const r = data[fw]._resources;
    if (!r) return `<tr><td>${badge(fw)}</td><td colspan="5">-</td></tr>`;

    const isCpuWin = fw === bestCpu;
    const isMemWin = fw === bestMem;
    const cpuTag = isCpuWin ? ` <span class="winner-tag" style="border-color:${FW_COLORS[fw]};color:${FW_COLORS[fw]}">menor CPU</span>` : '';
    const memTag = isMemWin ? ` <span class="winner-tag" style="border-color:${FW_COLORS[fw]};color:${FW_COLORS[fw]}">menor RAM</span>` : '';

    return `<tr${isCpuWin || isMemWin ? ' class="winner-row"' : ''}>
      <td>${badge(fw)}${cpuTag}${memTag}</td>
      <td${isCpuWin ? ' class="best"' : ''}>${isCpuWin ? WIN + ' ' : ''}${r.avgCpu}%</td>
      <td>${r.maxCpu}%</td>
      <td${isMemWin ? ' class="best"' : ''}>${isMemWin ? WIN + ' ' : ''}${r.avgMem} MB</td>
      <td>${r.maxMem} MB</td>
      <td>${r.avgThreads}</td>
    </tr>`;
  }).join('');
  return `
    <div class="card">
      <h2>Consumo de Recursos</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Framework</th><th>CPU Med%</th><th>CPU Max%</th><th>RAM Med</th><th>RAM Max</th><th>Threads Med</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

function scoreCard() {
  const score = { nest: 0, fastapi: 0, spring: 0 };
  const maxPoints = TESTS.length * 2 + 2; // RPS+P95 por teste + RAM + CPU

  for (const test of TESTS) {
    // Exclude entries with >= 20% error rate from scoring (e.g. FastAPI spike)
    const c = FRAMEWORKS.map(fw => ({ fw, d: data[fw][test] }))
      .filter(r => r.d && (r.d.error_pct ?? 0) < 20);
    if (c.length < 2) continue;
    score[c.reduce((a, b) => a.d.rps > b.d.rps ? a : b).fw]++;
    score[c.reduce((a, b) => a.d.p95_ms < b.d.p95_ms ? a : b).fw]++;
  }

  // Resources: 1 point each for lowest avg RAM and lowest avg CPU
  const withRes = FRAMEWORKS.filter(fw => data[fw]._resources);
  if (withRes.length >= 2) {
    score[withRes.reduce((a, b) => data[a]._resources.avgMem < data[b]._resources.avgMem ? a : b)]++;
    score[withRes.reduce((a, b) => data[a]._resources.avgCpu < data[b]._resources.avgCpu ? a : b)]++;
  }

  const winMap = buildWinMap();
  const sorted = Object.entries(score).sort((a, b) => b[1] - a[1]);
  const medals = ['🥇', '🥈', '🥉'];
  const cards = sorted.map(([fw, pts], i) => {
    const wlist = winMap[fw].length
      ? `<ul class="win-list">${winMap[fw].map(w => `<li>${w}</li>`).join('')}</ul>`
      : `<p class="win-list-empty">nenhuma vitoria individual</p>`;
    return `
    <div class="score-card" style="border-top:4px solid ${FW_COLORS[fw]}">
      <div class="score-medal">${medals[i]}</div>
      <div class="score-name">${FW_LABELS[fw]}</div>
      <div class="score-pts">${pts}</div>
      <div class="score-total">de ${maxPoints} possiveis</div>
      ${wlist}
    </div>`;
  }).join('');
  return `<div class="card"><h2>Placar Final</h2>
    <p style="font-size:.8rem;color:#64748b;margin-bottom:1rem">
      Criterios: RPS e P95 por cenario (${TESTS.length} cenarios x 2 = ${TESTS.length * 2} pts) + menor RAM + menor CPU (2 pts) = ${maxPoints} pts totais.
    </p>
    <div class="score-grid">${cards}</div></div>`;
}

// ── Dados para gráficos ────────────────────────────────────────────────────────
function chartData() {
  const labels = TESTS.map(t => TEST_SHORT[t]);
  const datasets = (metric) => FRAMEWORKS.map(fw => ({
    label: FW_LABELS[fw],
    data: TESTS.map(t => data[fw][t]?.[metric] ?? null),
    backgroundColor: FW_COLORS_ALPHA[fw],
    borderColor: FW_COLORS[fw],
    borderWidth: 2,
  }));

  return JSON.stringify({
    labels,
    rps:   datasets('rps'),
    p95:   datasets('p95_ms'),
    error: datasets('error_pct'),
    ram:   FRAMEWORKS.map(fw => ({
      label: FW_LABELS[fw],
      data: [data[fw]._resources?.avgMem ?? 0],
      backgroundColor: FW_COLORS_ALPHA[fw],
      borderColor: FW_COLORS[fw],
      borderWidth: 2,
    })),
    cpu:   FRAMEWORKS.map(fw => ({
      label: FW_LABELS[fw],
      data: [data[fw]._resources?.avgCpu ?? 0],
      backgroundColor: FW_COLORS_ALPHA[fw],
      borderColor: FW_COLORS[fw],
      borderWidth: 2,
    })),
  });
}

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>TCC — Comparativo de Performance</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f8fafc;
      color: #1e293b;
      padding: 2rem;
    }

    header { text-align: center; margin-bottom: 2.5rem; }
    header h1 { font-size: 1.8rem; font-weight: 700; color: #0f172a; }
    header p  { color: #64748b; margin-top: .4rem; font-size: .9rem; }

    .grid { display: grid; gap: 1.5rem; max-width: 1100px; margin: 0 auto; }

    .card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 1.5rem;
      box-shadow: 0 1px 4px rgba(0,0,0,.06);
    }
    .card h2 {
      font-size: .85rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: .06em;
      margin-bottom: 1rem;
    }

    .charts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    .chart-box { position: relative; height: 260px; }

    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: .875rem; }
    th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 600;
      text-align: left;
      padding: .6rem .9rem;
      white-space: nowrap;
      border-bottom: 2px solid #e2e8f0;
    }
    td {
      padding: .55rem .9rem;
      border-bottom: 1px solid #f1f5f9;
      white-space: nowrap;
      color: #334155;
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #f8fafc; }

    .winner-tag {
      display: inline-block;
      font-size: .68rem;
      font-weight: 700;
      border: 1.5px solid;
      border-radius: 4px;
      padding: .1rem .4rem;
      margin-left: .4rem;
      vertical-align: middle;
      text-transform: uppercase;
      letter-spacing: .04em;
    }
    tr.winner-row td:first-child { font-weight: 700; }

    .win-badge {
      display: inline-block;
      background: #16a34a;
      color: #fff;
      font-size: .65rem;
      font-weight: 700;
      padding: .1rem .35rem;
      border-radius: 3px;
      vertical-align: middle;
      margin-right: .25rem;
    }

    .badge {
      display: inline-block;
      padding: .2rem .6rem;
      border-radius: 4px;
      font-size: .75rem;
      font-weight: 700;
      color: #fff;
    }

    td.best { color: #16a34a; font-weight: 700; }
    td.good { color: #16a34a; }
    td.warn { color: #d97706; font-weight: 600; }
    td.bad  { color: #dc2626; font-weight: 700; }
    td.na   { color: #94a3b8; font-style: italic; }
    small   { font-size: .75em; color: #94a3b8; }

    .score-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }
    .score-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1.2rem;
      text-align: center;
    }
    .score-medal { font-size: 2rem; }
    .score-name  { font-size: .95rem; font-weight: 700; color: #1e293b; margin: .4rem 0; }
    .score-pts   { font-size: 2rem; font-weight: 800; color: #0f172a; line-height: 1; }
    .score-total { font-size: .75rem; color: #94a3b8; margin-top: .3rem; margin-bottom: .6rem; }
    .win-list    { list-style: none; padding: 0; margin: 0; text-align: left; font-size: .75rem; color: #475569; border-top: 1px solid #e2e8f0; padding-top: .5rem; }
    .win-list li::before { content: "✓ "; color: #16a34a; font-weight: 700; }
    .win-list li { margin-bottom: .2rem; }
    .win-list-empty { font-size: .75rem; color: #94a3b8; margin-top: .5rem; }

    .legend {
      display: flex;
      gap: 1.5rem;
      font-size: .8rem;
      color: #64748b;
      margin-top: 1.2rem;
      flex-wrap: wrap;
      justify-content: center;
    }
    .legend span { display: flex; align-items: center; gap: .4rem; }
    .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }

    .rejected-note {
      background: #fff7ed;
      border-top: 1px solid #fed7aa;
      color: #92400e;
      font-size: .8rem;
      line-height: 1.6;
      padding: .6rem .9rem;
      white-space: normal;
    }

    .glossary { display: grid; gap: 1rem; }
    .gl-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem 1.2rem; }
    .gl-block h3 { font-size: .85rem; font-weight: 700; color: #0f172a; margin-bottom: .5rem; }
    .gl-block p  { font-size: .875rem; color: #475569; line-height: 1.6; }
    .gl-block ul { font-size: .875rem; color: #475569; line-height: 1.6; padding-left: 1.2rem; }
    .gl-block li { margin-bottom: .4rem; }

    @media (max-width: 600px) {
      .charts-grid { grid-template-columns: 1fr; }
      .score-grid  { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Comparativo de Performance — TCC</h1>
    <p>NestJS &nbsp;·&nbsp; FastAPI &nbsp;·&nbsp; Spring Boot &nbsp;|&nbsp; k6 Load Testing &nbsp;|&nbsp; 3 amostras por teste</p>
  </header>

  <div class="grid">

    ${scoreCard()}

    <!-- Gráficos -->
    <div class="card">
      <h2>Throughput (RPS) por Cenário</h2>
      <div class="chart-box"><canvas id="chartRps"></canvas></div>
    </div>

    <div class="card">
      <h2>Latência P95 (ms) por Cenário</h2>
      <div class="chart-box"><canvas id="chartP95"></canvas></div>
    </div>

    <div class="card">
      <h2>Taxa de Erro (%) por Cenário</h2>
      <div class="chart-box"><canvas id="chartErr"></canvas></div>
    </div>

    <div class="charts-grid">
      <div class="card">
        <h2>RAM Média (MB)</h2>
        <div class="chart-box"><canvas id="chartRam"></canvas></div>
      </div>
      <div class="card">
        <h2>CPU Média (%)</h2>
        <div class="chart-box"><canvas id="chartCpu"></canvas></div>
      </div>
    </div>

    ${glossarySection()}

    <!-- Tabelas detalhadas -->
    ${TESTS.map(testTable).join('\n')}

    ${summaryTable('Throughput (RPS) — Resumo Geral', (fw, t) => {
      const vals = FRAMEWORKS.map(f => data[f][t]?.rps ?? 0);
      const max = Math.max(...vals);
      const v = data[fw][t]?.rps;
      if (v == null) return '<td>-</td>';
      return v === max ? `<td class="best">${WIN} ${v}</td>` : `<td>${v}</td>`;
    }, 'rps', true)}

    ${summaryTable('Latência P95 (ms) — Resumo Geral', (fw, t) => {
      const d = data[fw][t];
      if (!d) return '<td>-</td>';
      const min = Math.min(...FRAMEWORKS.map(f => data[f][t]?.p95_ms ?? Infinity));
      const label = d.p95_std_ms != null ? `${d.p95_ms}ms <small>±${d.p95_std_ms}</small>` : `${d.p95_ms}ms`;
      return d.p95_ms === min ? `<td class="best">${WIN} ${label}</td>` : `<td>${label}</td>`;
    }, 'p95_ms', false)}

    ${summaryTable('Taxa de Erro (%) — Resumo Geral', (fw, t) => {
      const d = data[fw][t];
      if (!d) return '<td>-</td>';
      if (d.error_pct > 5)  return `<td class="bad">${d.error_pct}%</td>`;
      if (d.error_pct > 0)  return `<td class="warn">${d.error_pct}%</td>`;
      return `<td class="good">0%</td>`;
    }, 'error_pct', false)}

    ${resourcesTable()}

  </div>

  <div class="legend">
    <span><span class="dot" style="background:#16a34a"></span> melhor valor da linha</span>
    <span><span class="dot" style="background:#d97706"></span> erro entre 0–5%</span>
    <span><span class="dot" style="background:#dc2626"></span> erro acima de 5%</span>
  </div>

  <script>
    const CD = ${chartData()};
    const baseOpts = (title, suffix) => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { size: 12 }, color: '#334155' } },
        title:  { display: false },
        tooltip: { callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + (ctx.parsed.y ?? ctx.parsed.x) + suffix } }
      },
      scales: {
        x: { grid: { color: '#f1f5f9' }, ticks: { color: '#64748b' } },
        y: { grid: { color: '#f1f5f9' }, ticks: { color: '#64748b' }, beginAtZero: true }
      }
    });

    new Chart(document.getElementById('chartRps'), {
      type: 'bar',
      data: { labels: CD.labels, datasets: CD.rps },
      options: baseOpts('RPS', ' RPS'),
    });

    new Chart(document.getElementById('chartP95'), {
      type: 'bar',
      data: { labels: CD.labels, datasets: CD.p95 },
      options: baseOpts('P95', 'ms'),
    });

    new Chart(document.getElementById('chartErr'), {
      type: 'bar',
      data: { labels: CD.labels, datasets: CD.error },
      options: baseOpts('Erro%', '%'),
    });

    new Chart(document.getElementById('chartRam'), {
      type: 'bar',
      data: { labels: ['RAM Média'], datasets: CD.ram },
      options: { ...baseOpts('RAM', ' MB'), plugins: { ...baseOpts().plugins, legend: { position: 'top', labels: { color: '#334155' } } } },
    });

    new Chart(document.getElementById('chartCpu'), {
      type: 'bar',
      data: { labels: ['CPU Média'], datasets: CD.cpu },
      options: baseOpts('CPU', '%'),
    });
  </script>
</body>
</html>`;

const outPath = path.join(__dirname, 'resultados', 'relatorio.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log('Relatorio gerado:', outPath);
