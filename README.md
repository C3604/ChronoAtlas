# ChronoAtlas 时序史鉴

ChronoAtlas 是一个以时间线为核心的历史事件管理与展示应用，支持浏览、筛选、管理与导入导出。

## 已实现功能

- 事件、标签、分类的增删改查
- 角色权限与用户管理
- 注册/登录/邮箱验证/重置密码/刷新登录
- 事件版本记录与恢复
- JSON 数据导入与导出（导入支持自动创建标签/分类）
- 基础统计概览

## 本地运行

1. 确认已安装 Node.js 与 PostgreSQL。
2. 在数据库中执行 packages/server/migrations/0001-auth.sql 与 packages/server/migrations/0002-smtp-settings.sql。
3. 配置根目录 .env（见下方环境变量示例）。
4. 运行根目录的 Run.bat（单窗口启动）。
   - 后端默认地址：`http://localhost:3000`
   - 前端默认地址：`http://localhost:5173`

## 环境变量

根目录 `.env`：

- `VITE_API_BASE_URL`：前端请求后端的地址，默认 `http://localhost:3000`
- `WEB_ORIGIN`：前端页面地址（CORS 使用）
- `APP_URL`：前端访问地址（邮件链接使用）
- `JWT_SECRET`：访问 token 密钥
- `JWT_REFRESH_SECRET`：刷新 token 密钥
- `PG_HOST/PG_PORT/PG_USER/PG_PASSWORD/PG_DATABASE`：数据库连接
- SMTP 配置：在系统设置页面填写（超级管理员可见）
- `MAIL_DEV_OUTPUT`：开发环境邮件输出（log/file/off）
- `MAIL_DEV_DIR`：开发环境邮件输出目录
- `BOOTSTRAP_ADMIN_EMAIL/BOOTSTRAP_ADMIN_PASSWORD/BOOTSTRAP_ADMIN_NAME`：默认管理员

## 默认管理员

- 数据库为空时会自动创建默认管理员。
- 默认值：`admin@chronoatlas.local` / `admin123`（可通过环境变量修改）。

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
- 分类：GET/POST `/categories`，PATCH/DELETE `/categories/{id}`
- 导入导出：POST `/import/events`，GET `/export/events`
- 系统设置：GET/PUT `/settings/smtp`
- 其他：GET `/health`，GET `/api/hello`


