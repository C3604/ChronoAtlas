@echo off
setlocal
chcp 65001 >nul

echo [INFO] 初始化统一启动环境...
set "ROOT=%~dp0"
set "CONFIG_PATH=%ROOT%packages\server\data\app-config.json"
set "SERVER_DIR=%ROOT%packages\server"
set "WEB_DIR=%ROOT%packages\web"

call :ReadPorts
if /i "%CONFIG_STATUS%"=="FAIL" (
  echo [WARN] 配置文件解析失败，已使用默认端口：后端 3000，前端 5173
)
echo [INFO] 使用端口：后端 %BACKEND_PORT%，前端 %FRONTEND_PORT%

call :KillPort %BACKEND_PORT% 后端
call :KillPort %FRONTEND_PORT% 前端

rem 避免环境变量 PORT 覆盖配置文件
set "PORT="

echo [INFO] 启动后端服务...
start "" /b cmd /c "cd /d ""%SERVER_DIR%"" && npm run dev"
call :WaitPort %BACKEND_PORT% 后端 60
if errorlevel 1 goto :Error

echo [INFO] 后端已就绪，启动前端应用...
start "" /b cmd /c "cd /d ""%WEB_DIR%"" && npm run dev"
call :WaitPort %FRONTEND_PORT% 前端 60
if errorlevel 1 goto :Error

set "FRONTEND_URL=http://localhost:%FRONTEND_PORT%"
if "%FRONTEND_PORT%"=="80" set "FRONTEND_URL=http://localhost"

echo [INFO] 前端已就绪，正在打开浏览器：%FRONTEND_URL%
start "" "%FRONTEND_URL%"

echo [INFO] 启动完成。所有服务在后台运行。按 Ctrl+C 结束并停止服务。
echo [INFO] 日志输出如下：
goto :Hold

:Error
echo [ERROR] 启动失败或等待超时，请检查上方日志。
goto :Hold

:Hold
timeout /t 3600 >nul
goto :Hold

:ReadPorts
set "BACKEND_PORT=3000"
set "FRONTEND_PORT=5173"
set "CONFIG_STATUS=OK"
for /f "usebackq tokens=1-3 delims=|" %%A in (`
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$path = '%CONFIG_PATH%';" ^
    "$backend = 3000; $frontend = 5173; $status = 'OK';" ^
    "if (Test-Path $path) {" ^
    "  try {" ^
    "    $json = Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json;" ^
    "    $temp = 0;" ^
    "    if ([int]::TryParse([string]$json.ports.backend, [ref]$temp)) { $backend = $temp }" ^
    "    if ([int]::TryParse([string]$json.ports.frontend, [ref]$temp)) { $frontend = $temp }" ^
    "  } catch { $status = 'FAIL' }" ^
    "} else { $status = 'FAIL' }" ^
    "Write-Output ($backend.ToString() + '|' + $frontend.ToString() + '|' + $status)"
`) do (
  set "BACKEND_PORT=%%A"
  set "FRONTEND_PORT=%%B"
  set "CONFIG_STATUS=%%C"
)
exit /b 0

:KillPort
set "PORT=%1"
set "LABEL=%2"
echo [INFO] 检查%LABEL%端口 %PORT% 占用情况...
for /f "usebackq delims=" %%P in (`
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique"
`) do (
  echo [WARN] 发现占用端口 %PORT% 的进程 PID=%%P，正在强制结束...
  taskkill /PID %%P /F >nul 2>&1
)
exit /b 0

:WaitPort
set "PORT=%1"
set "LABEL=%2"
set "TIMEOUT=%3"
set /a elapsed=0
:WaitPortLoop
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "if (Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if %errorlevel%==0 (
  echo [INFO] %LABEL%端口 %PORT% 已就绪
  exit /b 0
)
set /a elapsed+=1
if %elapsed% GEQ %TIMEOUT% (
  echo [ERROR] 等待%LABEL%启动超时（%TIMEOUT% 秒）
  exit /b 1
)
timeout /t 1 /nobreak >nul
goto :WaitPortLoop
