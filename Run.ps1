$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$serverPath = Join-Path $root "packages\server"
$webPath = Join-Path $root "packages\web"
$backendPort = 3000
$frontPort = 5173

Write-Host "检查 3000 端口占用（仅结束 node 进程）..."

try {
  $conns = Get-NetTCPConnection -LocalPort $backendPort -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $conns) {
    $p = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
    if ($p -and $p.ProcessName -eq "node") {
      Stop-Process -Id $p.Id -Force
    }
  }
} catch {}

Write-Host "正在启动后端服务并等待就绪..."

$backend = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev" -WorkingDirectory $serverPath -PassThru -NoNewWindow
$frontend = $null
$exitCode = 0

try {
  $backendReady = $false
  $backendStart = Get-Date
  while ((Get-Date) - $backendStart -lt [TimeSpan]::FromSeconds(60)) {
    if ($backend.HasExited) {
      throw "后端启动失败，请检查后端日志。"
    }

    try {
      if (Test-NetConnection -ComputerName "127.0.0.1" -Port $backendPort -InformationLevel Quiet) {
        $backendReady = $true
        break
      }
    } catch {}

    Start-Sleep -Milliseconds 500
  }

  if (-not $backendReady) {
    throw ("后端启动超时，未检测到 {0} 端口。" -f $backendPort)
  }

  $frontend = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev" -WorkingDirectory $webPath -PassThru -NoNewWindow

  $opened = $false
  $frontStart = Get-Date
  while ((Get-Date) - $frontStart -lt [TimeSpan]::FromSeconds(60)) {
    if ($frontend.HasExited) {
      throw "前端启动失败，请检查前端日志。"
    }

    try {
      if (Test-NetConnection -ComputerName "127.0.0.1" -Port $frontPort -InformationLevel Quiet) {
        $opened = $true
        break
      }
    } catch {}

    Start-Sleep -Milliseconds 500
  }

  if ($opened) {
    Start-Process ("http://localhost:{0}/" -f $frontPort)
  }

  if ($frontend) {
    Wait-Process -Id $frontend.Id
  }
} catch {
  Write-Host $_.Exception.Message
  $exitCode = 1
} finally {
  if ($frontend -and -not $frontend.HasExited) {
    taskkill /T /F /PID $frontend.Id | Out-Null
  }

  if ($backend -and -not $backend.HasExited) {
    taskkill /T /F /PID $backend.Id | Out-Null
  }
}

exit $exitCode


