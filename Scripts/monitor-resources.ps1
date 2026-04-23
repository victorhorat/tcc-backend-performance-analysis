<#
.SYNOPSIS
    Monitora CPU% e Memória RAM de um processo durante os testes k6.

.DESCRIPTION
    Captura amostras periódicas de uso de CPU e memória do processo da API
    e salva em CSV. Rode este script em um terminal separado ANTES de iniciar
    o k6 e pare com Ctrl+C após o teste terminar.

    O CSV gerado é importado pelo analyze-results.js para compor a análise
    completa do TCC (métricas de eficiência de recursos, seção 3.6.3).

.PARAMETER ProcessName
    Nome do processo do SO a monitorar:
      - NestJS    : "node"
      - FastAPI   : "python" (ou "uvicorn")
      - Spring Boot: "java"

.PARAMETER OutputFile
    Caminho do CSV de saída.

.PARAMETER IntervalSeconds
    Intervalo entre amostras em segundos (padrão: 3).

.EXAMPLE
    # Terminal 1 - inicia monitor para NestJS
    .\monitor-resources.ps1 -ProcessName "node" -OutputFile "resultados/nest_resources.csv"

    # Terminal 2 - roda os testes
    .\run-all-tests.ps1 -Framework nest -SkipTests "load,stress"

    # Para o monitor com Ctrl+C depois que os testes acabarem
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$ProcessName,

    [Parameter(Mandatory = $true)]
    [string]$OutputFile,

    [int]$IntervalSeconds = 3
)

# ── Helpers ───────────────────────────────────────────────────────────────────
$NumCores = (Get-CimInstance Win32_Processor | Measure-Object -Property NumberOfLogicalProcessors -Sum).Sum
if ($NumCores -eq 0) { $NumCores = 1 }

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  MONITOR DE RECURSOS - TCC" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Processo  : $ProcessName" -ForegroundColor White
Write-Host "  Saida CSV : $OutputFile" -ForegroundColor White
Write-Host "  Intervalo : ${IntervalSeconds}s" -ForegroundColor White
Write-Host "  CPU Cores : $NumCores" -ForegroundColor White
Write-Host ""
Write-Host "  Pressione Ctrl+C para encerrar." -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Garante que o diretório de saída existe
$OutputDir = Split-Path -Parent $OutputFile
if ($OutputDir -and -not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

# Escreve cabeçalho do CSV
"Timestamp,CPU_Percent,Memory_MB,Threads,Process_Count" | Set-Content -Path $OutputFile -Encoding UTF8

$PrevCpuTotal = $null
$PrevSample   = Get-Date
$SampleCount  = 0

try {
    while ($true) {
        $Now   = Get-Date
        $Procs = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue

        if ($Procs -and $Procs.Count -gt 0) {
            # Agrega todos os processos com esse nome (ex: múltiplos workers Python/Node)
            $CpuTotal   = ($Procs | Measure-Object -Property CPU -Sum).Sum
            $MemBytes   = ($Procs | Measure-Object -Property WorkingSet64 -Sum).Sum
            $MemMB      = [math]::Round($MemBytes / 1MB, 1)
            $ThreadTotal = ($Procs | ForEach-Object { $_.Threads.Count } | Measure-Object -Sum).Sum
            $ProcCount  = $Procs.Count

            # Calcula CPU% real (delta de CPU acumulada / tempo decorrido / núcleos)
            $CpuPercent = 0
            if ($null -ne $PrevCpuTotal) {
                $ElapsedSec  = ($Now - $PrevSample).TotalSeconds
                if ($ElapsedSec -gt 0) {
                    $CpuDelta    = $CpuTotal - $PrevCpuTotal
                    $CpuPercent  = [math]::Round(($CpuDelta / ($ElapsedSec * $NumCores)) * 100, 1)
                    $CpuPercent  = [math]::Max(0, [math]::Min(100 * $NumCores, $CpuPercent))
                }
            }

            $PrevCpuTotal = $CpuTotal
            $PrevSample   = $Now
            $SampleCount++

            $Timestamp = $Now.ToString("yyyy-MM-dd HH:mm:ss")
            "$Timestamp,$CpuPercent,$MemMB,$ThreadTotal,$ProcCount" | Add-Content -Path $OutputFile -Encoding UTF8

            # Cor baseada no uso de CPU
            $Color = if ($CpuPercent -gt 80) { "Red" } elseif ($CpuPercent -gt 40) { "Yellow" } else { "Green" }
            Write-Host ("  [{0}] CPU: {1,5}% | RAM: {2,7} MB | Threads: {3,4} | Procs: {4}" -f `
                $Now.ToString("HH:mm:ss"), $CpuPercent, $MemMB, $ThreadTotal, $ProcCount) -ForegroundColor $Color

        } else {
            $Ts = Get-Date -Format "HH:mm:ss"
            Write-Host "  [$Ts] Processo '$ProcessName' nao encontrado. Aguardando..." -ForegroundColor DarkGray
        }

        Start-Sleep -Seconds $IntervalSeconds
    }
}
finally {
    Write-Host ""
    Write-Host "  Monitor encerrado. $SampleCount amostras salvas em: $OutputFile" -ForegroundColor Green
    Write-Host ""
}
