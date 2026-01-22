
# ChronoAtlas 时序史鉴

ChronoAtlas 是一款以时间线为核心的历史事件管理与展示应用，支持浏览、筛选、管理与导入导出。

## 已实现功能

- 事件与标签的增删改查
- 角色权限与用户管理
- 注册/登录/邮箱验证/重置密码/刷新登录
- 事件版本记录与恢复
- JSON 数据导入导出（导入支持自动创建标签）
- 基础统计概览
- 速率限制保护
- SMTP 设置管理
- 审批流程
- 混合存储模式（PostgreSQL + JSON）

## 本地运行

1. 安装 Node.js 与 PostgreSQL。
2. 在数据库中执行：`packages/server/migrations/0001-auth.sql` 与 `packages/server/migrations/0002-smtp-settings.sql`。
3. 运行根目录的 `Run.bat`（单窗口启动）。
4. 首次启动后访问前端地址的 `/setup` 完成初始化配置（端口由配置文件决定）。
5. 保存配置后按提示重启后端与前端服务。

前后端地址：
- 以 `packages/server/data/app-config.json` 中的 `ports.backend` 与 `ports.frontend` 为准。

## 初始化配置（不再使用 .env）

配置文件位置：`packages/server/data/app-config.json`。

首次运行会进入初始化页面，主要配置：
- 运行环境检查（硬件、依赖、版本提示）
- 数据库连接信息
- 前后端端口

其余参数（如 JWT 密钥）会自动生成并写入配置文件。

## 默认管理员

- 数据库为空时会自动创建默认管理员。
- 默认账号：`admin@chronoatlas.local` / `admin123`。

## 目录说明

- `packages/server`：后端服务
- `packages/web`：前端页面
- `Doc`：项目文档
- `packages/server/data/db.json`：事件示例数据

## API 摘要

- 认证：POST `/auth/register`，POST `/auth/login`，POST `/auth/refresh`，GET `/auth/me`
- 邮件/密码：POST `/auth/verify-email`，POST `/auth/forgot-password`，POST `/auth/reset-password`
- 用户：GET/POST `/users`，PATCH `/users/{id}`
- 事件：GET/POST `/events`，GET/PATCH/DELETE `/events/{id}`
- 版本：GET `/events/{id}/versions`，POST `/events/{id}/restore`
- 统计：GET `/events/aggregations`
- 标签：GET/POST `/tags`，PATCH/DELETE `/tags/{id}`
- 导入导出：POST `/import/events`，GET `/export/events`
- 系统设置：GET/PUT `/settings/smtp`
- 其他：GET `/health`
