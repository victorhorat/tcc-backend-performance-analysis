<#
.SYNOPSIS
    Executa a suite completa de testes k6 para um framework específico do TCC.

.DESCRIPTION
    Roda os 5 cenários de teste (load, stress, spike, read, average) contra
    o framework escolhido. Cada teste é executado N vezes (-Samples) e os
    resultados são salvos individualmente para que o analyze-results.js
    calcule a média automática.

    Estrutura dos arquivos gerados:
      resultados/<fw>_<test>_s1_summary.json
      resultados/<fw>_<test>_s2_summary.json
      resultados/<fw>_<test>_s3_summary.json
      ...

.PARAMETER Framework
    Framework a testar: "nest" (porta 8083), "fastapi" (8082) ou "spring" (8081).

.PARAMETER SkipTests
    Lista separada por vírgula dos testes a pular.
    Ex: "load,stress"

.PARAMETER Samples
    Número de amostras por teste (padrão: 3).
    Cada amostra gera arquivos separados (_s1, _s2, _s3...).

.PARAMETER CooldownSeconds
    Tempo de espera entre cada teste para o banco estabilizar (padrão: 30s).

.EXAMPLE
    # Roda 3 amostras de cada teste para o FastAPI
    .\run-all-tests.ps1 -Framework fastapi

    # Roda apenas os testes que faltam para o NestJS
    .\run-all-tests.ps1 -Framework nest -SkipTests "load,stress"

    # Roda apenas 1 amostra (modo rápido)
    .\run-all-tests.ps1 -Framework spring -Samples 1
#>

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("nest", "fastapi", "spring")]
    [string]$Framework,

    [string]$SkipTests = "",

    [int]$Samples = 3,

    [int]$CooldownSeconds = 30
)

# ── Configuração ──────────────────────────────────────────────────────────────
$Ports = @{
    "nest"    = "localhost:8083"
    "fastapi" = "localhost:8082"
    "spring"  = "localhost:8081"
}

$FrameworkLabels = @{
    "nest"    = "NestJS"
    "fastapi" = "FastAPI"
    "spring"  = "Spring Boot"
}

$TargetUrl   = $Ports[$Framework]
$ResultsDir  = Join-Path $PSScriptRoot "resultados"
$SkipList    = $SkipTests -split "," | ForEach-Object { $_.Trim().ToLower() } | Where-Object { $_ -ne "" }

$Tests = @(
    [ordered]@{ Name = "load";    Script = "load-test.js";    Label = "Carga Estável  (100 VUs  | POST | 2min)" }
    [ordered]@{ Name = "stress";  Script = "stress-test.js";  Label = "Estresse       (100→1000 VUs | POST | 4min)" }
    [ordered]@{ Name = "spike";   Script = "spike-test.js";   Label = "Pico Repentino (10→1500 VUs  | POST | 1min)" }
    [ordered]@{ Name = "read";    Script = "read-test.js";    Label = "Leitura        (100 VUs  | GET  | 2min)" }
    [ordered]@{ Name = "average"; Script = "averege-test.js"; Label = "Agregação      (80 VUs   | GET  | 2min)" }
)

# ── Helpers ───────────────────────────────────────────────────────────────────
function Write-Banner {
    param([string]$Text, [string]$Color = "Cyan")
    $line = "=" * 68
    Write-Host $line -ForegroundColor $Color
    Write-Host "   $Text" -ForegroundColor $Color
    Write-Host $line -ForegroundColor $Color
}

function Write-Step {
    param([string]$Text, [string]$Color = "Green")
    Write-Host ""
    Write-Host "  >> $Text" -ForegroundColor $Color
}

# ── Pré-verificações ──────────────────────────────────────────────────────────
if (-not (Test-Path $ResultsDir)) {
    New-Item -ItemType Directory -Path $ResultsDir | Out-Null
    Write-Step "Pasta 'resultados/' criada." "Yellow"
}

if (-not (Get-Command k6 -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "  ERRO: k6 não encontrado no PATH." -ForegroundColor Red
    Write-Host "  Instale em: https://k6.io/docs/get-started/installation/" -ForegroundColor Red
    exit 1
}

# ── Início ────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Banner "SUITE DE TESTES TCC - $($FrameworkLabels[$Framework])"
Write-Host ""
Write-Host "  Framework : $($FrameworkLabels[$Framework])" -ForegroundColor White
Write-Host "  Target    : $TargetUrl" -ForegroundColor White
Write-Host "  Amostras  : $Samples por teste" -ForegroundColor White
Write-Host "  Resultados: $ResultsDir" -ForegroundColor White
if ($SkipList.Count -gt 0) {
    Write-Host "  Pulando   : $($SkipList -join ', ')" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "  IMPORTANTE: Certifique-se de que a API esta rodando antes de continuar." -ForegroundColor Yellow
Write-Host "  Pressione ENTER para iniciar ou Ctrl+C para cancelar..."
Read-Host | Out-Null

# ── Verificação de conectividade ──────────────────────────────────────────────
Write-Step "Verificando conectividade com $TargetUrl..."
try {
    $testResp = Invoke-WebRequest -Uri "http://$TargetUrl/api/telemetry/sensor/sensor-1" `
        -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  OK - API respondeu com status $($testResp.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "  AVISO: Nao foi possivel conectar a http://$TargetUrl" -ForegroundColor Yellow
    Write-Host "  Certifique-se de que a API esta rodando. Continuando mesmo assim..." -ForegroundColor Yellow
}

# ── Loop de testes ────────────────────────────────────────────────────────────
$TestsToRun  = $Tests | Where-Object { $_.Name -notin $SkipList }
$TotalToRun  = $TestsToRun.Count
$Current     = 0
$StartTime   = Get-Date

foreach ($Test in $TestsToRun) {
    $Current++

    Write-Host ""
    Write-Host ("-" * 68) -ForegroundColor DarkGray
    Write-Host "  [$Current/$TotalToRun] $($Test.Label)" -ForegroundColor Cyan
    Write-Host "  $Samples amostras serao coletadas" -ForegroundColor White
    Write-Host ""

    for ($s = 1; $s -le $Samples; $s++) {
        $CsvPath  = Join-Path $ResultsDir "${Framework}_$($Test.Name)_s${s}.csv"
        $JsonPath = Join-Path $ResultsDir "${Framework}_$($Test.Name)_s${s}_summary.json"
        $TxtPath  = Join-Path $ResultsDir "${Framework}_$($Test.Name)_s${s}.txt"

        Write-Host "  Amostra $s/$Samples - Inicio: $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor DarkCyan

        Push-Location $PSScriptRoot
        $k6Output = k6 run `
            -e "TARGET_URL=$TargetUrl" `
            --out "csv=$CsvPath" `
            --summary-export $JsonPath `
            $Test.Script 2>&1

        $k6Output | Tee-Object -FilePath $TxtPath
        Pop-Location

        $ExitCode = $LASTEXITCODE
        if ($ExitCode -eq 0) {
            Write-Host "  [OK] Amostra $s concluida. Fim: $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Green
        } else {
            Write-Host "  [AVISO] k6 saiu com codigo $ExitCode (threshold pode ter falhado - normal no stress/spike)." -ForegroundColor Yellow
        }

        # Cooldown entre amostras do mesmo teste (exceto após a última)
        if ($s -lt $Samples) {
            Write-Host "  Aguardando 15s entre amostras..." -ForegroundColor DarkGray
            Start-Sleep -Seconds 15
        }
    }

    Write-Host "  CSV    : ${Framework}_$($Test.Name)_s1..s${Samples}.csv" -ForegroundColor DarkGreen
    Write-Host "  Resumo : ${Framework}_$($Test.Name)_s1..s${Samples}_summary.json" -ForegroundColor DarkGreen

    # Cooldown entre testes diferentes (exceto após o último)
    if ($Current -lt $TotalToRun) {
        Write-Host ""
        Write-Host "  Aguardando ${CooldownSeconds}s para o banco estabilizar antes do proximo teste..." -ForegroundColor DarkYellow
        Start-Sleep -Seconds $CooldownSeconds
    }
}

# ── Resumo final ──────────────────────────────────────────────────────────────
$ElapsedMin = [math]::Round(((Get-Date) - $StartTime).TotalMinutes, 1)
Write-Host ""
Write-Banner "CONCLUIDO: $($FrameworkLabels[$Framework]) - $Samples amostras - ${ElapsedMin} minutos"
Write-Host ""
Write-Host "  Proximos passos:" -ForegroundColor White
Write-Host "  1. Repita para os outros frameworks" -ForegroundColor White
Write-Host "  2. Execute: node analyze-results.js" -ForegroundColor White
Write-Host ""
