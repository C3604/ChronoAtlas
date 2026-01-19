---
title: API 合同（v0.1）
category: api
status: current
version: v0.1
last_updated: 2026-01-19
---

# API 合同（v0.1）

本文档是人类可读的 API 权威说明，目标是与服务端行为保持一致，并与 OpenAPI 规格文件同步更新。

## 1. 范围

- 包含：注册/登录/刷新、邮箱验证、忘记/重置密码、用户管理、事件、标签、分类、版本记录、导入导出、统计概览、事件审批、系统设置（SMTP）。
- 暂不包含：人物、地点、地图、全文检索。

## 2. 通用约定

- 请求与响应均为 JSON。
- 请求头：`Content-Type: application/json`。
- 统一响应格式：`{ code, message, data, traceId }`。
- 登录方式：默认使用 Cookie（`access_token` + `refresh_token`），服务端也兼容 `Authorization: Bearer {token}`。
- CSRF 防护：除 GET/HEAD/OPTIONS 外，需在请求头带 `X-CSRF-Token`，值等于 `csrf_token` Cookie。
- CSRF 免校验接口：`/auth/login`、`/auth/register`、`/auth/refresh`、`/auth/verify-email`、`/auth/forgot-password`、`/auth/reset-password`。

## 3. 统一响应结构

成功示例：

```json
{
  "code": "OK",
  "message": "OK",
  "data": { "user": { "id": "..." } },
  "traceId": "e6b2b2f1-..."
}
```

失败示例：

```json
{
  "code": "AUTH_002",
  "message": "邮箱或密码不正确",
  "data": null,
  "traceId": "e6b2b2f1-..."
}
```

参数校验失败会返回：

```json
{
  "code": "VALID_001",
  "message": "参数校验失败",
  "data": { "errors": ["password 规则不满足"] },
  "traceId": "e6b2b2f1-..."
}
```

## 4. 错误码表

| 错误码 | HTTP | 说明 |
| --- | --- | --- |
| OK | 200/201/202 | 成功 |
| COMMON_400 | 400 | 请求参数错误 |
| COMMON_404 | 404 | 资源不存在 |
| COMMON_500 | 500 | 系统错误 |
| VALID_001 | 400 | 参数校验失败 |
| AUTH_001 | 401 | 需要登录 |
| AUTH_002 | 401 | 邮箱或密码不正确 |
| AUTH_003 | 401 | 登录状态已失效 |
| AUTH_004 | 403 | 账号已被禁用 |
| AUTH_005 | 400 | 邮箱已被注册 |
| AUTH_006 | 400 | 验证链接已失效 |
| AUTH_007 | 400 | 重置链接已失效 |
| AUTH_008 | 400 | 当前密码不正确 |
| AUTH_009 | 400 | 不能禁用自己的账号 |
| AUTH_010 | 403 | CSRF 校验失败 |
| AUTH_011 | 400 | 必须保留至少一个超级管理员 |
| PERM_001 | 403 | 没有权限 |
| PERM_002 | 403 | 没有权限修改/分配超级管理员 |
| SETTINGS_001 | 400 | 启用 SMTP 时必须填写服务器地址 |
| SETTINGS_002 | 400 | 启用 SMTP 时必须填写端口 |

## 5. 字段校验规则

- email：必须是合法邮箱。
- password/newPassword：至少 8 位，包含大小写字母与数字，且不能有空格。
- displayName：长度 2-64。

## 6. 角色与权限

角色：`SUPER_ADMIN` / `ADMIN` / `EDITOR` / `USER`。

能力矩阵（简化）：

| 能力 | SUPER_ADMIN | ADMIN | EDITOR | USER |
| --- | --- | --- | --- | --- |
| 用户管理 | ✅（含超级管理员） | ✅（不含超级管理员） | ❌ | ❌ |
| 系统设置（SMTP） | ✅ | ❌ | ❌ | ❌ |
| 内容管理（标签/分类/导入/恢复） | ✅ | ✅ | ❌ | ❌ |
| 内容审批 | ✅ | ✅ | ❌ | ❌ |
| 内容写入（事件增删改） | ✅ | ✅ | ✅（需审批） | ❌ |
| 内容浏览 | ✅ | ✅ | ✅ | ✅ |

说明：
- EDITOR 提交的事件增删改会进入审批流程，接口返回 202。
- ADMIN 不能修改/分配超级管理员。

## 7. 数据结构

### 7.1 TimePoint

- year（必填，整数）
- month（可选，1-12）
- day（可选，1-31）

### 7.2 EventTime

- start：时间点（必填）
- end：时间点（可选）
- precision：时间精度（century/decade/year/month/day）
- fuzzy：模糊时间描述（可选）

### 7.3 Event

- id
- title（必填、非空）
- summary（可选）
- time（必填）
- tagIds[]（可选，可传 id 或名称）
- tags[]（只读，标签详情数组，包含 id/name/parentId）
- categoryIds[]（可选，可传 id 或名称）
- categories[]（只读，分类详情数组，包含 id/name/parentId）
- createdAt / updatedAt

说明：创建/更新/导入时，tagIds/categoryIds 可填写名称，系统会自动匹配或创建。

### 7.4 Tag / Category

- id
- name（必填、非空）
- parentId（可选）

### 7.5 User（公开字段）

- id
- email
- displayName
- roles[]（SUPER_ADMIN/ADMIN/EDITOR/USER）
- isActive
- emailVerified
- createdAt / updatedAt / lastLoginAt

### 7.6 EventVersion

- id
- eventId
- action（create/update/delete/restore/import）
- changedAt
- changedBy（可选）
- note（可选）
- snapshot（事件快照）

### 7.7 EventApproval

- id
- action（create/update/delete）
- eventId（可选）
- draft（事件草稿，可选）
- snapshot（事件快照，可选）
- requestedAt
- requestedBy（可选）
- requestedByName（可选）
- status（pending/approved/rejected）
- decidedAt（可选）
- decidedBy（可选）
- note（可选）

### 7.8 PendingResponse

当当前用户角色需要走审批流程时，部分写接口会返回 202。

- pending：true
- approvalId：审批记录 id

### 7.9 SmtpSettings

- enabled（是否启用）
- host（服务器地址）
- port（端口）
- secure（是否 SSL/TLS）
- username（账号）
- fromAddress（发件人地址）
- hasPassword（是否已保存密码）
- updatedAt（最后更新时间）
## 8. 接口清单

### 8.1 健康检查与示例接口

- GET /health
- GET /api/hello

### 8.2 认证

- POST /auth/register：注册
  - 请求：`{ email, displayName, password }`
  - 响应：`{ user, emailSent }`（token 写入 Cookie）
- POST /auth/login：登录
  - 请求：`{ email, password }`
  - 响应：`{ user }`（token 写入 Cookie）
- POST /auth/logout：退出登录（需要登录）
  - 响应：`{ ok: true }`（清理 Cookie）
- POST /auth/refresh：刷新登录态
  - 响应：`{ user }`（刷新 Cookie）
- POST /auth/verify-email：验证邮箱
  - 请求：`{ token }`
  - 响应：`{ ok: true }`
- POST /auth/forgot-password：忘记密码
  - 请求：`{ email }`
  - 响应：`{ ok: true }`
- POST /auth/reset-password：重置密码
  - 请求：`{ token, newPassword }`
  - 响应：`{ ok: true }`
- POST /auth/change-password：修改密码（需要登录）
  - 请求：`{ currentPassword, newPassword }`
  - 响应：`{ ok: true }`
- PATCH /auth/profile：更新个人信息（需要登录）
  - 请求：`{ displayName }`
  - 响应：`{ user }`
- GET /auth/me：当前用户（需要登录）
  - 响应：`{ user }`

### 8.3 用户（账号管理）

- GET /users：用户列表（需要管理员权限）
  - 响应：`{ items: User[] }`
- POST /users：创建用户（需要管理员权限）
  - 请求：`{ email, displayName, password, roles?, isActive? }`
  - 响应：`{ user }`
- PATCH /users/{id}：修改用户（需要管理员权限）
  - 请求：`{ email?, displayName?, password?, roles?, isActive? }`
  - 响应：`{ user }`

### 8.4 事件审批

- GET /events/approvals：审批列表（需要内容审批权限）
  - 查询：`status=pending|approved|rejected`（默认 pending）
  - 响应：`{ items: EventApproval[] }`
- POST /events/approvals/{id}/approve：通过审批（需要内容审批权限）
  - 请求：`{ note? }`
  - 响应：`{ ok: true, approval }`
- POST /events/approvals/{id}/reject：拒绝审批（需要内容审批权限）
  - 请求：`{ note? }`
  - 响应：`{ ok: true, approval }`

### 8.5 事件

- GET /events：列表
  - 查询：timeFrom/timeTo/tagIds/categoryIds/keyword
  - 兼容：keyword 也可用 q 作为别名
  - 响应：`{ items: Event[], total }`
- POST /events：创建（需要内容写入权限）
  - 成功：201 返回 Event
  - 需要审批：202 返回 PendingResponse
- GET /events/{id}：详情
- PATCH /events/{id}：修改（需要内容写入权限）
  - 成功：200 返回 Event
  - 需要审批：202 返回 PendingResponse
- DELETE /events/{id}：删除（需要内容写入权限）
  - 成功：200 返回 `{ ok: true }`
  - 需要审批：202 返回 PendingResponse
- GET /events/search：关键词搜索
  - 查询：q（必填）
  - 响应：`{ items: Event[], total }`
- GET /events/aggregations：统计概览
- GET /events/{id}/versions：版本列表
  - 响应：`{ items: EventVersion[] }`
- POST /events/{id}/restore：版本恢复（需要内容管理权限）
  - 请求：`{ versionId }`
  - 响应：Event

### 8.6 标签与分类

- GET /tags：标签列表
  - 响应：`{ items: Tag[] }`
- POST /tags：创建标签（需要内容管理权限）
  - 响应：Tag
- PATCH /tags/{id}：修改标签（需要内容管理权限）
  - 响应：Tag
- DELETE /tags/{id}：删除标签（需要内容管理权限）
  - 响应：`{ ok: true }`

- GET /categories：分类列表
  - 响应：`{ items: Category[] }`
- POST /categories：创建分类（需要内容管理权限）
  - 响应：Category
- PATCH /categories/{id}：修改分类（需要内容管理权限）
  - 响应：Category
- DELETE /categories/{id}：删除分类（需要内容管理权限）
  - 响应：`{ ok: true }`

### 8.7 导入导出

- POST /import/events：导入事件（需要内容管理权限）
  - 请求：`{ mode: "merge"|"replace", items: Event[] }`
  - 说明：items 中的 tagIds/categoryIds 可填写名称，系统会自动匹配或创建
  - 响应：`{ mode, imported }`
- GET /export/events：导出事件
  - 响应：`{ exportedAt, total, items }`

导入示例文件：`packages/web/public/examples/events-import-sample.json`。

### 8.8 系统设置（超级管理员）

- GET /settings/smtp：获取 SMTP 设置
  - 响应：`{ settings: SmtpSettings }`
- PUT /settings/smtp：更新 SMTP 设置
  - 请求：`{ enabled, host?, port?, secure?, username?, password?, fromAddress? }`
  - 说明：password 为空表示不修改；如需清空请传空字符串
  - 响应：`{ settings: SmtpSettings }`

## 9. 典型流程

- 注册 -> 邮箱验证 -> 登录 -> 刷新 token -> 修改资料
- 忘记密码 -> 邮件收到重置链接 -> 重置密码 -> 登录
- EDITOR 编辑事件 -> 进入审批 -> ADMIN/SUPER_ADMIN 审批通过/拒绝

## 10. 典型错误

- 未登录访问受限接口 -> AUTH_001
- 无权限访问 -> PERM_001
- CSRF 校验失败 -> AUTH_010
- title 为空或非字符串 -> COMMON_400
- time.start 缺失或 time 校验失败 -> COMMON_400
- precision 与时间字段不匹配 -> COMMON_400
- start > end -> COMMON_400
- 访问不存在资源 -> COMMON_404





