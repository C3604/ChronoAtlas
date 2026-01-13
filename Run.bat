@echo off
chcp 65001 >nul
setlocal

set "ROOT=%~dp0"

echo 检查 3000 端口占用（仅结束 node 进程）...
powershell -NoProfile -Command "try { $conns = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; foreach ($c in $conns) { $p = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue; if ($p -and $p.ProcessName -eq 'node') { Stop-Process -Id $p.Id -Force } } } catch {}"

echo 正在启动后端服务（后台）...
pushd "%ROOT%packages\server"
start /b "" cmd /c "npm run dev"
popd

echo 正在启动前端服务（前台）...
pushd "%ROOT%packages\web"
npm run dev
