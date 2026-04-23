/**
 * analyze-results.js
 *
 * Lê todos os arquivos de resultado dos testes k6 e gera tabelas
 * comparativas prontas para o TCC.
 *
 * Suporta múltiplas amostras por teste: se existirem arquivos
 *   <fw>_<test>_s1_summary.json, _s2_, _s3_...
 * calcula a MÉDIA das amostras e registra o desvio padrão do P95.
 *
 * Fallback: arquivos legados sem sufixo de amostra (_summary.json / .txt).
 *
 * Uso: node analyze-results.js
 * Saída: resultados/comparison.json + tabelas no console
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const RESULTS_DIR = path.join(__dirname, 'resultados');

const FRAMEWORKS = ['nest', 'fastapi', 'spring'];
const TESTS      = ['load', 'stress', 'spike', 'read', 'average'];

const FRAMEWORK_LABELS = {
  nest:    'NestJS',
  fastapi: 'FastAPI',
  spring:  'Spring Boot',
};

const TEST_LABELS = {
  load:    'Carga (POST 100 VUs)',
  stress:  'Estresse (POST 1000 VUs)',
  spike:   'Pico (POST 1500 VUs)',
  read:    'Leitura (GET 100 VUs)',
  average: 'Agregacao (GET 80 VUs)',
};

// ─── Parsers ──────────────────────────────────────────────────────────────────

function loadJsonSummary(fw, test, suffix = '') {
  const p = path.join(RESULTS_DIR, `${fw}_${test}${suffix}_summary.json`);
  if (!fs.existsSync(p)) return null;
  try {
    const raw     = JSON.parse(fs.readFileSync(p, 'utf8'));
    const metrics = raw.metrics || {};

    const dur    = metrics.http_req_duration || {};
    const reqs   = metrics.http_reqs        || {};
    const failed = metrics.http_req_failed  || {};

    return {
      avg_ms:     round(dur.avg      ?? 0),
      min_ms:     round(dur.min      ?? 0),
      med_ms:     round(dur.med      ?? 0),
      max_ms:     round(dur.max      ?? 0),
      p90_ms:     round(dur['p(90)'] ?? 0),
      p95_ms:     round(dur['p(95)'] ?? 0),
      total_reqs: Math.round(reqs.count ?? 0),
      rps:        roundF(reqs.rate    ?? 0, 2),
      error_pct:  roundF((failed.value ?? 0) * 100, 3),
      source:     'json',
    };
  } catch { return null; }
}

function loadTxtSummary(fw, test, suffix = '') {
  const p = path.join(RESULTS_DIR, `${fw}_${test}${suffix}.txt`);
  if (!fs.existsSync(p)) return null;
  try {
    const txt = fs.readFileSync(p, 'utf8');

    const dur     = parseLine(txt, /http_req_duration[^:]*:\s*(.*)/);
    const reqLine = parseLine(txt, /http_reqs[^:]*:\s*(.*)/);
    const errLine = parseLine(txt, /http_req_failed[^:]*:\s*(.*)/);

    if (!dur) return null;

    return {
      avg_ms:     extractMs(dur, 'avg'),
      min_ms:     extractMs(dur, 'min'),
      med_ms:     extractMs(dur, 'med'),
      max_ms:     extractMs(dur, 'max'),
      p90_ms:     extractMs(dur, 'p\\(90\\)'),
      p95_ms:     extractMs(dur, 'p\\(95\\)'),
      total_reqs: extractReqCount(reqLine),
      rps:        extractRps(reqLine),
      error_pct:  extractErrorPct(errLine),
      source:     'txt',
    };
  } catch { return null; }
}

function parseLine(txt, re) {
  const m = txt.match(re);
  return m ? m[1] : null;
}

function extractMs(line, key) {
  if (!line) return 0;
  const m = line.match(new RegExp(`${key}=(\\d+\\.?\\d*)(ms|µs|s)`));
  if (!m) return 0;
  const v = parseFloat(m[1]);
  if (m[2] === 'µs') return round(v / 1000);
  if (m[2] === 's')  return round(v * 1000);
  return round(v);
}

function extractReqCount(line) {
  if (!line) return 0;
  const m = line.match(/(\d+)\s+[\d.]+\/s/);
  return m ? parseInt(m[1]) : 0;
}

function extractRps(line) {
  if (!line) return 0;
  const m = line.match(/[\d]+\s+([\d.]+)\/s/);
  return m ? roundF(parseFloat(m[1]), 2) : 0;
}

function extractErrorPct(line) {
  if (!line) return 0;
  const m = line.match(/([\d.]+)%/);
  return m ? roundF(parseFloat(m[1]), 3) : 0;
}

// ─── Média de múltiplas amostras ──────────────────────────────────────────────

/**
 * Tenta carregar N amostras (_s1, _s2, _s3...) e retorna a média.
 * Se não encontrar arquivos com sufixo de amostra, tenta o formato legado.
 */
function loadMetrics(fw, test) {
  // Detecta quantas amostras existem
  const samples = [];
  for (let s = 1; s <= 10; s++) {
    const suffix = `_s${s}`;
    const m = loadJsonSummary(fw, test, suffix) || loadTxtSummary(fw, test, suffix);
    if (!m) break;
    samples.push(m);
  }

  // Fallback: formato legado sem sufixo
  if (samples.length === 0) {
    return loadJsonSummary(fw, test) || loadTxtSummary(fw, test);
  }

  if (samples.length === 1) return { ...samples[0], samples: 1 };

  // Calcula média de cada campo numérico
  const fields = ['avg_ms', 'min_ms', 'med_ms', 'max_ms', 'p90_ms', 'p95_ms', 'total_reqs', 'rps', 'error_pct'];
  const avg = {};
  for (const f of fields) {
    avg[f] = samples.reduce((s, m) => s + m[f], 0) / samples.length;
  }

  // Desvio padrão do P95 (métrica mais relevante para o TCC)
  const p95Values = samples.map(m => m.p95_ms);
  const p95Mean   = avg.p95_ms;
  const p95Std    = Math.sqrt(p95Values.reduce((s, v) => s + (v - p95Mean) ** 2, 0) / p95Values.length);

  return {
    avg_ms:     round(avg.avg_ms),
    min_ms:     round(avg.min_ms),
    med_ms:     round(avg.med_ms),
    max_ms:     round(avg.max_ms),
    p90_ms:     round(avg.p90_ms),
    p95_ms:     round(avg.p95_ms),
    p95_std_ms: roundF(p95Std, 1),
    total_reqs: Math.round(avg.total_reqs),
    rps:        roundF(avg.rps, 2),
    error_pct:  roundF(avg.error_pct, 3),
    samples:    samples.length,
    source:     samples[0].source,
    raw_samples: samples,
  };
}

// ─── Métricas de Recursos ─────────────────────────────────────────────────────

function loadResourceMetrics(fw) {
  const p = path.join(RESULTS_DIR, `${fw}_resources.csv`);
  if (!fs.existsSync(p)) return null;
  try {
    const lines = fs.readFileSync(p, 'utf8').trim().split('\n');
    if (lines.length < 2) return null;

    const rows = lines.slice(1).map(l => {
      const [ts, cpu, mem, threads] = l.split(',');
      return { cpu: parseFloat(cpu), mem: parseFloat(mem), threads: parseInt(threads) };
    }).filter(r => !isNaN(r.cpu));

    if (rows.length === 0) return null;

    const avgCpu     = roundF(rows.reduce((s, r) => s + r.cpu, 0) / rows.length, 1);
    const maxCpu     = roundF(Math.max(...rows.map(r => r.cpu)), 1);
    const avgMem     = roundF(rows.reduce((s, r) => s + r.mem, 0) / rows.length, 1);
    const maxMem     = roundF(Math.max(...rows.map(r => r.mem)), 1);
    const avgThreads = Math.round(rows.reduce((s, r) => s + r.threads, 0) / rows.length);

    return { avgCpu, maxCpu, avgMem, maxMem, avgThreads, samples: rows.length };
  } catch { return null; }
}

// ─── Formatação de Tabelas ────────────────────────────────────────────────────

function padEnd(str, len) { return String(str ?? '-').padEnd(len); }
function round(v)         { return Math.round(v); }
function roundF(v, d)     { return parseFloat(v.toFixed(d)); }

function formatMdTable(headers, rows) {
  const cols   = headers.length;
  const widths = Array.from({ length: cols }, (_, i) =>
    Math.max(headers[i].length, ...rows.map(r => String(r[i] ?? '-').length))
  );
  const hr  = '|' + widths.map(w => '-'.repeat(w + 2)).join('|') + '|';
  const fmt = row => '| ' + row.map((v, i) => padEnd(v, widths[i])).join(' | ') + ' |';
  return [fmt(headers), hr, ...rows.map(fmt)].join('\n');
}

// ─── Geração do Relatório ─────────────────────────────────────────────────────

function generateReport() {
  console.log('\n' + '='.repeat(68));
  console.log('  ANALISE COMPARATIVA - TCC');
  console.log('  NestJS  vs  FastAPI  vs  Spring Boot');
  console.log('='.repeat(68));

  const data = {};
  for (const fw of FRAMEWORKS) {
    data[fw] = {};
    for (const test of TESTS) {
      data[fw][test] = loadMetrics(fw, test);
    }
    data[fw]._resources = loadResourceMetrics(fw);
  }

  // ── Tabela por tipo de teste ────────────────────────────────────────────────
  for (const test of TESTS) {
    const rows = FRAMEWORKS.map(fw => {
      const d = data[fw][test];
      if (!d) return [FRAMEWORK_LABELS[fw], '-', '-', '-', '-', '-', '-', '-', '-'];
      const p95Label = d.p95_std_ms != null
        ? `${d.p95_ms}ms ±${d.p95_std_ms}`
        : `${d.p95_ms}ms`;
      const samplesLabel = d.samples > 1 ? `(n=${d.samples})` : '';
      return [
        `${FRAMEWORK_LABELS[fw]} ${samplesLabel}`.trim(),
        `${d.avg_ms}ms`,
        `${d.med_ms}ms`,
        `${d.p90_ms}ms`,
        p95Label,
        `${d.max_ms}ms`,
        `${d.rps}`,
        `${d.error_pct}%`,
      ];
    });

    console.log(`\n${'─'.repeat(68)}`);
    console.log(`## ${TEST_LABELS[test]}\n`);
    console.log(formatMdTable(
      ['Framework', 'Avg', 'Median', 'P90', 'P95 (±std)', 'Max', 'RPS', 'Erro%'],
      rows
    ));
    console.log();

    const ranked = FRAMEWORKS
      .map(fw => ({ fw: FRAMEWORK_LABELS[fw], d: data[fw][test] }))
      .filter(r => r.d);

    if (ranked.length >= 2) {
      const byRps = [...ranked].sort((a, b) => b.d.rps - a.d.rps);
      const byP95 = [...ranked].sort((a, b) => a.d.p95_ms - b.d.p95_ms);
      const byErr = [...ranked].sort((a, b) => a.d.error_pct - b.d.error_pct);
      console.log(`  Maior throughput : ${byRps[0].fw} (${byRps[0].d.rps} RPS)`);
      console.log(`  Menor latencia   : ${byP95[0].fw} (P95 = ${byP95[0].d.p95_ms}ms)`);
      console.log(`  Menor taxa erro  : ${byErr[0].fw} (${byErr[0].d.error_pct}%)`);
    }
  }

  // ── Tabela consolidada de RPS ───────────────────────────────────────────────
  console.log(`\n${'─'.repeat(68)}`);
  console.log('## Throughput (RPS) — Resumo Geral\n');
  const rpsRows = FRAMEWORKS.map(fw => [
    FRAMEWORK_LABELS[fw],
    ...TESTS.map(t => data[fw][t] ? `${data[fw][t].rps}` : '-'),
  ]);
  console.log(formatMdTable(
    ['Framework', 'Carga', 'Estresse', 'Pico', 'Leitura', 'Agregacao'],
    rpsRows
  ));

  // ── Tabela consolidada de P95 ───────────────────────────────────────────────
  console.log(`\n${'─'.repeat(68)}`);
  console.log('## Latencia P95 (ms) — Resumo Geral\n');
  const p95Rows = FRAMEWORKS.map(fw => [
    FRAMEWORK_LABELS[fw],
    ...TESTS.map(t => {
      const d = data[fw][t];
      if (!d) return '-';
      return d.p95_std_ms != null ? `${d.p95_ms}ms ±${d.p95_std_ms}` : `${d.p95_ms}ms`;
    }),
  ]);
  console.log(formatMdTable(
    ['Framework', 'Carga', 'Estresse', 'Pico', 'Leitura', 'Agregacao'],
    p95Rows
  ));

  // ── Tabela consolidada de Erro% ─────────────────────────────────────────────
  console.log(`\n${'─'.repeat(68)}`);
  console.log('## Taxa de Erro (%) — Resumo Geral\n');
  const errRows = FRAMEWORKS.map(fw => [
    FRAMEWORK_LABELS[fw],
    ...TESTS.map(t => data[fw][t] ? `${data[fw][t].error_pct}%` : '-'),
  ]);
  console.log(formatMdTable(
    ['Framework', 'Carga', 'Estresse', 'Pico', 'Leitura', 'Agregacao'],
    errRows
  ));

  // ── Tabela de Recursos ──────────────────────────────────────────────────────
  const hasResources = FRAMEWORKS.some(fw => data[fw]._resources);
  if (hasResources) {
    console.log(`\n${'─'.repeat(68)}`);
    console.log('## Consumo de Recursos (sessao completa de testes)\n');
    const resRows = FRAMEWORKS.map(fw => {
      const r = data[fw]._resources;
      if (!r) return [FRAMEWORK_LABELS[fw], '-', '-', '-', '-', '-'];
      return [
        FRAMEWORK_LABELS[fw],
        `${r.avgCpu}%`,
        `${r.maxCpu}%`,
        `${r.avgMem} MB`,
        `${r.maxMem} MB`,
        `${r.avgThreads}`,
      ];
    });
    console.log(formatMdTable(
      ['Framework', 'CPU Med%', 'CPU Max%', 'RAM Med MB', 'RAM Max MB', 'Threads Med'],
      resRows
    ));
  }

  // ── Ranking geral ───────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(68)}`);
  console.log('## Placar de Vitorias por Metrica (menor latencia / maior RPS)\n');

  const score = { nest: 0, fastapi: 0, spring: 0 };
  let totalDisputes = 0;

  for (const test of TESTS) {
    const candidates = FRAMEWORKS
      .map(fw => ({ fw, d: data[fw][test] }))
      .filter(r => r.d);

    if (candidates.length < 2) continue;
    totalDisputes++;

    const bestRps = candidates.reduce((a, b) => a.d.rps > b.d.rps ? a : b);
    score[bestRps.fw]++;

    const bestP95 = candidates.reduce((a, b) => a.d.p95_ms < b.d.p95_ms ? a : b);
    score[bestP95.fw]++;
  }

  const scoreRows = Object.entries(score)
    .sort((a, b) => b[1] - a[1])
    .map(([fw, pts], i) => [`${i + 1}°`, FRAMEWORK_LABELS[fw], `${pts}`, `de ${totalDisputes * 2} disputas`]);

  console.log(formatMdTable(['Pos', 'Framework', 'Vitorias', 'Total'], scoreRows));

  // ── Exporta JSON consolidado ────────────────────────────────────────────────
  const exportPath = path.join(RESULTS_DIR, 'comparison.json');
  fs.writeFileSync(exportPath, JSON.stringify(data, null, 2), 'utf8');

  console.log(`\n${'='.repeat(68)}`);
  console.log(`  Dados exportados: ${exportPath}`);
  console.log('='.repeat(68));
  console.log();

  // Aviso sobre dados faltando
  const missing = [];
  for (const fw of FRAMEWORKS) {
    for (const test of TESTS) {
      if (!data[fw][test]) missing.push(`  ${FRAMEWORK_LABELS[fw]} - ${TEST_LABELS[test]}`);
    }
  }
  if (missing.length > 0) {
    console.log('  ATENCAO: Os seguintes testes ainda nao tem resultados:');
    missing.forEach(m => console.log(m));
    console.log();
  }
}

// ─── Execução ─────────────────────────────────────────────────────────────────
generateReport();
