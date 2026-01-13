# ChronoAtlas 时序史鉴

ChronoAtlas 是一个以时间线为核心的历史事件管理与展示应用，支持浏览、筛选、管理与导入导出。

## 已实现功能

- 事件、标签、分类的增删改查
- 时间范围筛选与关键词筛选
- 登录鉴权与后台管理
- 事件版本记录与恢复
- JSON 数据导入与导出
- 基础统计概览

## 本地运行

1. 确认已安装 Node.js。
2. 运行根目录的 `Run.bat`（单窗口启动）。
   - 后端默认地址：`http://localhost:3000`
   - 前端默认地址：`http://localhost:5173`

## 环境变量

根目录 `.env`：

- `VITE_API_BASE_URL`：前端请求后端的地址，默认 `http://localhost:3000`

## 默认管理员

- 邮箱：`admin@chronoatlas.local`
- 密码：`admin123`

## 目录说明

- `packages/server`：后端服务
- `packages/web`：前端页面
- `Doc`：项目文档
- `packages/server/data/db.json`：示例数据

## API 摘要

- 认证：POST `/auth/login`，GET `/auth/me`，POST `/auth/logout`
- 事件：GET/POST `/events`，GET/PATCH/DELETE `/events/{id}`
- 版本：GET `/events/{id}/versions`，POST `/events/{id}/restore`
- 统计：GET `/events/aggregations`
- 标签：GET/POST `/tags`，PATCH/DELETE `/tags/{id}`
- 分类：GET/POST `/categories`，PATCH/DELETE `/categories/{id}`
- 导入导出：POST `/import/events`，GET `/export/events`
- 其他：GET `/health`，GET `/api/hello`

## 依赖清单（当前 package.json）

后端（packages/server）
- 运行依赖：@nestjs/common、@nestjs/core、reflect-metadata、rxjs、dotenv
- 开发依赖：typescript、ts-node、@types/node

前端（packages/web）
- 运行依赖：vue
- 开发依赖：vite、@vitejs/plugin-vue、typescript
