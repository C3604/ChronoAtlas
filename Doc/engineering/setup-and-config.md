---
title: 初始化配置与端口
category: engineering
status: current
version: v0.1
last_updated: 2026-01-22
---

# 初始化配置与端口

本项目不再使用 .env，所有运行参数统一写入 `packages/server/data/app-config.json`。

首次启动流程：
1. 运行 `Run.ps1` / `Run.bat`
2. 在前端地址访问 `/setup`
3. 完成环境检查、数据库与端口配置
4. 按提示重启前后端

端口规则：
- 后端端口：`app-config.json` 的 `ports.backend`
- 前端端口：`app-config.json` 的 `ports.frontend`
- `WEB_ORIGIN` 与 `APP_URL` 由配置页自动写入，用于 CORS 与邮件链接
