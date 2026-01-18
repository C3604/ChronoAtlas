@echo off

chcp 65001 >nul

setlocal

set "ROOT=%~dp0"

echo 检查 3000 端口占用（仅结束 node 进程）...

powershell -NoProfile -Command "try { $conns = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; foreach ($c in $conns) { $p = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue; if ($p -and $p.ProcessName -eq 'node') { Stop-Process -Id $p.Id -Force } } } catch {}"

echo 正在启动前后端服务...

set "PS_SCRIPT=%TEMP%\chronoatlas_run.ps1"
> "%PS_SCRIPT%" echo $ErrorActionPreference = 'Stop'
>> "%PS_SCRIPT%" echo $root = '%ROOT%'
>> "%PS_SCRIPT%" echo $serverPath = Join-Path $root 'packages\server'
>> "%PS_SCRIPT%" echo $webPath = Join-Path $root 'packages\web'
>> "%PS_SCRIPT%" echo $frontPort = 5173
>> "%PS_SCRIPT%" echo $backend = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','npm run dev' -WorkingDirectory $serverPath -PassThru -NoNewWindow
>> "%PS_SCRIPT%" echo $frontend = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','npm run dev' -WorkingDirectory $webPath -PassThru -NoNewWindow
>> "%PS_SCRIPT%" echo $opened = $false
>> "%PS_SCRIPT%" echo $start = Get-Date
>> "%PS_SCRIPT%" echo while ((Get-Date) - $start -lt [TimeSpan]::FromSeconds(60)) {
>> "%PS_SCRIPT%" echo try { if (Test-NetConnection -ComputerName '127.0.0.1' -Port $frontPort -InformationLevel Quiet) { $opened = $true; break } } catch {}
>> "%PS_SCRIPT%" echo Start-Sleep -Milliseconds 500
>> "%PS_SCRIPT%" echo }
>> "%PS_SCRIPT%" echo if ($opened) { Start-Process ('http://localhost:{0}/' -f $frontPort) }
>> "%PS_SCRIPT%" echo try { Wait-Process -Id $frontend.Id } finally {
>> "%PS_SCRIPT%" echo if ($frontend -and -not $frontend.HasExited) { taskkill /T /F /PID $frontend.Id ^| Out-Null }
>> "%PS_SCRIPT%" echo if ($backend -and -not $backend.HasExited) { taskkill /T /F /PID $backend.Id ^| Out-Null }
>> "%PS_SCRIPT%" echo }
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%"
set "PS_EXIT=%ERRORLEVEL%"
del "%PS_SCRIPT%" >nul 2>nul
exit /b %PS_EXIT%
