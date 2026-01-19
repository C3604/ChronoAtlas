$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$serverPath = Join-Path $root "packages\server"
$webPath = Join-Path $root "packages\web"
$backendPort = 3000
$frontPort = 5173

function Test-CommandAvailable {
  param(
    [Parameter(Mandatory = $true)][string]$Name
  )

  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-PackageDependencies {
  param(
    [Parameter(Mandatory = $true)][string]$PackageJsonPath
  )

  if (-not (Test-Path $PackageJsonPath)) {
    return @()
  }

  $pkg = Get-Content -Path $PackageJsonPath -Raw | ConvertFrom-Json
  $deps = @()
  if ($pkg.dependencies) {
    $deps += $pkg.dependencies.PSObject.Properties.Name
  }
  if ($pkg.devDependencies) {
    $deps += $pkg.devDependencies.PSObject.Properties.Name
  }
  return $deps | Sort-Object -Unique
}

function Get-MissingDependencies {
  param(
    [Parameter(Mandatory = $true)][string]$PackagePath
  )

  $packageJsonPath = Join-Path $PackagePath "package.json"
  $nodeModulesPath = Join-Path $PackagePath "node_modules"

  if (-not (Test-Path $nodeModulesPath)) {
    return Get-PackageDependencies -PackageJsonPath $packageJsonPath
  }

  $missing = @()
  Push-Location $PackagePath
  try {
    $raw = & npm ls --depth=0 --json 2>$null
    if ($raw) {
      $data = $raw | ConvertFrom-Json
      if ($data.dependencies) {
        foreach ($item in $data.dependencies.PSObject.Properties) {
          if ($item.Value.missing) {
            $missing += $item.Name
          }
        }
      }
      if ($data.problems) {
        foreach ($problem in $data.problems) {
          if ($problem -match "^missing: ([^@ ]+)") {
            $missing += $Matches[1]
          }
        }
      }
    }
  } finally {
    Pop-Location
  }

  return $missing | Sort-Object -Unique
}

function Get-DotEnvValue {
  param(
    [Parameter(Mandatory = $true)][string]$EnvPath,
    [Parameter(Mandatory = $true)][string[]]$Keys
  )

  if (-not (Test-Path $EnvPath)) {
    return $null
  }

  $values = @{}
  foreach ($line in Get-Content -Path $EnvPath) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) {
      continue
    }

    $parts = $trimmed -split "=", 2
    if ($parts.Count -ne 2) {
      continue
    }

    $key = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"')
    if ($key) {
      $values[$key] = $value
    }
  }

  foreach ($key in $Keys) {
    if ($values.ContainsKey($key)) {
      return $values[$key]
    }
  }

  return $null
}

function Get-PortFromValue {
  param(
    [string]$Value
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $null
  }

  $trimmed = $Value.Trim().Trim('"')
  if ($trimmed -match "^\d+$") {
    return [int]$trimmed
  }

  try {
    $uri = [Uri]$trimmed
    if ($uri.Port -gt 0) {
      return $uri.Port
    }
  } catch {}

  if ($trimmed -match ":(\d{2,5})") {
    return [int]$Matches[1]
  }

  return $null
}

function Resolve-FrontendUrl {
  param(
    [string]$Value,
    [int]$Port
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return ("http://localhost:{0}/" -f $Port)
  }

  $trimmed = $Value.Trim().Trim('"')
  if ($trimmed -match "^\w+://") {
    return $trimmed
  }

  if ($trimmed -match "^[^:/]+:\d+$") {
    return ("http://{0}/" -f $trimmed)
  }

  return ("http://localhost:{0}/" -f $Port)
}

Write-Host "检查运行所需依赖..."

if (-not (Test-CommandAvailable -Name "node")) {
  Write-Host "未检测到 Node.js（包含 npm）。请先安装后再运行。"
  exit 1
}

if (-not (Test-CommandAvailable -Name "npm")) {
  Write-Host "未检测到 npm。请先安装 Node.js（包含 npm）后再运行。"
  exit 1
}

$missingServer = Get-MissingDependencies -PackagePath $serverPath
$missingWeb = Get-MissingDependencies -PackagePath $webPath

if ($missingServer.Count -gt 0 -or $missingWeb.Count -gt 0) {
  Write-Host "检测到依赖缺失，需要先安装后再运行。"

  if ($missingServer.Count -gt 0) {
    Write-Host ("后端缺少依赖：{0}" -f ($missingServer -join ", "))
  }

  if ($missingWeb.Count -gt 0) {
    Write-Host ("前端缺少依赖：{0}" -f ($missingWeb -join ", "))
  }

  Write-Host "请在以下目录执行 npm install："
  Write-Host ("- {0}" -f $serverPath)
  Write-Host ("- {0}" -f $webPath)
  exit 1
}

$envPath = Join-Path $root ".env"
$frontendValue = Get-DotEnvValue -EnvPath $envPath -Keys @("VITE_DEV_SERVER_PORT", "WEB_ORIGIN", "APP_URL")
$resolvedPort = Get-PortFromValue -Value $frontendValue
if ($resolvedPort) {
  $frontPort = $resolvedPort
}
$frontUrl = Resolve-FrontendUrl -Value $frontendValue -Port $frontPort

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
    Start-Process $frontUrl
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


