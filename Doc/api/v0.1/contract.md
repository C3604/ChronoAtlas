---
title: API 合同（v0.1）
category: api
status: current
version: v0.1
last_updated: 2026-01-17
---

# API 合同（v0.1）

本文档是人类可读的 API 权威说明，目标是与服务端行为保持一致，并与 OpenAPI 规格文件同步更新。

## 1. 范围

- 包含：登录鉴权、事件、标签、分类、版本记录、导入导出、统计概览、账号管理、事件审批。
- 暂不包含：人物、地点、地图、全文检索。

## 2. 通用约定

- 请求与响应均为 JSON。
- 请求头：`Content-Type: application/json`。
- 需要登录的接口请带上 `Authorization: Bearer {token}`。

## 3. 统一错误结构

```json
{
  "code": "BAD_REQUEST",
  "message": "参数错误",
  "details": {
    "field": "reason"
  }
}
```

## 4. 错误码表

| 错误码 | HTTP | 说明 |
| --- | --- | --- |
| OK | 200 | 成功 |
| CREATED | 201 | 创建成功 |
| ACCEPTED | 202 | 已受理（需要审批） |
| NO_CONTENT | 204 | 删除成功 |
| BAD_REQUEST | 400 | 参数错误 |
| UNAUTHORIZED | 401 | 未登录或登录已过期 |
| FORBIDDEN | 403 | 无权限 |
| NOT_FOUND | 404 | 资源不存在 |
| INTERNAL_ERROR | 500 | 系统错误 |

## 5. 时间规则

- 使用天文学年号：公元 1 年 = 1，公元前 1 年 = 0。
- TimePoint：`year` 必填，`month/day` 可选。
- `precision` 取值：century/decade/year/month/day。
- `precision` 不能高于给出的时间字段。
- `start.year` 必须小于等于 `end.year`（如提供 end）。

## 6. 数据结构

### 6.1 TimePoint

- year（必填，整数）
- month（可选，1-12）
- day（可选，1-31）

### 6.2 EventTime

- start：时间点（必填）
- end：时间点（可选）
- precision：时间精度
- fuzzy：模糊时间描述（可选）

### 6.3 Event

- id
- title（必填、非空）
- summary（可选）
- time（必填）
- tagIds[]（可选）
- categoryIds[]（可选）
- createdAt / updatedAt

### 6.4 Tag / Category

- id
- name（必填、非空）
- parentId（可选）

### 6.5 User（公开字段）

- id
- name
- email
- role（super_admin/account_admin/content_admin/content_editor）
- profile（可选对象）

### 6.6 EventVersion

- id
- eventId
- action（create/update/delete/restore/import）
- changedAt
- changedBy（可选）
- note（可选）
- snapshot（事件快照）

### 6.7 EventApproval

- id
- action（create/update/delete）
- eventId（可选）
- draft（事件草稿，可选）
- snapshot（事件快照，可选）
- requestedAt
- requestedBy（可选）
- status（pending/approved/rejected）
- decidedAt（可选）
- decidedBy（可选）
- note（可选）

### 6.8 PendingResponse

当当前用户角色需要走审批流程时，部分写接口会返回 202。

- pending：true
- approvalId：审批记录 id

## 7. 接口清单

### 7.1 健康检查与示例接口

- GET /health
- GET /api/hello

### 7.2 认证

- POST /auth/login：登录
  - 请求：`{ email, password }`
  - 响应：`{ token, expiresAt, user }`
- GET /auth/me：当前用户（需要登录）
  - 响应：`{ user }`
- POST /auth/logout：退出登录（需要登录）
  - 响应：`{ ok: true }`

### 7.3 用户（账号管理）

- GET /users：用户列表（需要账号管理权限）
  - 响应：`{ items: User[] }`
- POST /users：创建用户（需要账号管理权限）
  - 请求：`{ name, email, password, role, profile? }`
  - 响应：`{ user }`
- PATCH /users/{id}：修改用户（需要登录；本人可改部分字段，管理员可改更多）
- DELETE /users/{id}：删除用户（需要账号管理权限）

### 7.4 事件审批

- GET /events/approvals：审批列表（需要内容审批权限）
  - 查询：`status=pending|approved|rejected`（默认 pending）
  - 响应：`{ items: EventApproval[] }`
- POST /events/approvals/{id}/approve：通过审批（需要内容审批权限）
  - 请求：`{ note? }`
  - 响应：`{ ok: true, approval }`
- POST /events/approvals/{id}/reject：拒绝审批（需要内容审批权限）
  - 请求：`{ note? }`
  - 响应：`{ ok: true, approval }`

### 7.5 事件

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
  - 成功：204
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

### 7.6 标签与分类

- GET /tags：标签列表
  - 响应：`{ items: Tag[] }`
- POST /tags：创建标签（需要内容管理权限）
  - 响应：Tag
- PATCH /tags/{id}：修改标签（需要内容管理权限）
  - 响应：Tag
- DELETE /tags/{id}：删除标签（需要内容管理权限）
  - 响应：204

- GET /categories：分类列表
  - 响应：`{ items: Category[] }`
- POST /categories：创建分类（需要内容管理权限）
  - 响应：Category
- PATCH /categories/{id}：修改分类（需要内容管理权限）
  - 响应：Category
- DELETE /categories/{id}：删除分类（需要内容管理权限）
  - 响应：204

### 7.7 导入导出

- POST /import/events：导入事件（需要内容管理权限）
  - 请求：`{ mode: "merge"|"replace", items: Event[] }`
  - 响应：`{ mode, imported }`
- GET /export/events：导出事件
  - 响应：`{ exportedAt, total, items }`

## 8. 典型错误

- 未登录访问受限接口 -> UNAUTHORIZED
- 无权限访问 -> FORBIDDEN
- title 为空或非字符串 -> BAD_REQUEST
- time.start 缺失或 time 校验失败 -> BAD_REQUEST
- precision 与时间字段不匹配 -> BAD_REQUEST
- start > end -> BAD_REQUEST
- tagIds/categoryIds 存在不可识别 id -> BAD_REQUEST
- 访问不存在资源 -> NOT_FOUND
