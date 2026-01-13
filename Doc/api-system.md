# API 接口说明

本文档覆盖当前已实现范围，与 `Doc/api/api-contract.md` 保持一致。

## 1. 范围说明
- 包含：登录鉴权、事件、标签、分类、版本记录、导入导出、统计概览。
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
| NO_CONTENT | 204 | 删除成功 |
| BAD_REQUEST | 400 | 参数错误 |
| UNAUTHORIZED | 401 | 未登录 |
| FORBIDDEN | 403 | 无权限 |
| NOT_FOUND | 404 | 资源不存在 |
| INTERNAL_ERROR | 500 | 系统错误 |

## 5. 时间规则
- 使用天文学年号：公元 1 年 = 1，公元前 1 年 = 0。
- TimePoint：`year` 必填，`month/day` 可选。
- `precision` 取值：century/decade/year/month/day。
- `precision` 不能高于给出的时间字段。

## 6. 数据结构
### 6.1 EventTime
- start：时间点（必填）
- end：时间点（可选）
- precision：时间精度
- fuzzy：模糊时间描述

### 6.2 Event
- id
- title（必填、非空）
- summary（可选）
- time（必填）
- tagIds[]（可选）
- categoryIds[]（可选）
- createdAt / updatedAt

### 6.3 Tag / Category
- id
- name（必填、非空）
- parentId（可选）

### 6.4 User（公开字段）
- id
- name
- email
- role

### 6.5 EventVersion
- id
- eventId
- action（create/update/delete/restore/import）
- changedAt
- changedBy（可选）
- snapshot（事件快照）

## 7. 接口清单
- GET /health
- GET /api/hello
- POST /auth/login
- GET /auth/me
- POST /auth/logout
- GET /events
- POST /events
- GET /events/{id}
- PATCH /events/{id}
- DELETE /events/{id}
- GET /events/search
- GET /events/aggregations
- GET /events/{id}/versions
- POST /events/{id}/restore
- GET /tags
- POST /tags
- PATCH /tags/{id}
- DELETE /tags/{id}
- GET /categories
- POST /categories
- PATCH /categories/{id}
- DELETE /categories/{id}
- POST /import/events
- GET /export/events

## 8. 查询参数（GET /events）
- timeFrom：时间起点年份（整数）
- timeTo：时间终点年份（整数）
- tagIds：逗号分隔
- categoryIds：逗号分隔
- keyword：关键词（标题或摘要）

## 9. 请求示例
### 9.1 登录
```json
{
  "email": "admin@chronoatlas.local",
  "password": "admin123"
}
```

### 9.2 创建事件
```json
{
  "title": "示例事件",
  "summary": "简要说明",
  "time": {
    "start": { "year": -221 },
    "end": { "year": -206 },
    "precision": "year",
    "fuzzy": { "isApprox": false }
  },
  "tagIds": ["tag_1"],
  "categoryIds": ["cat_1"]
}
```

## 10. 典型错误
- 未登录访问受限接口 -> UNAUTHORIZED
- title 为空或非字符串 -> BAD_REQUEST
- time.start 缺失 -> BAD_REQUEST
- precision 与时间字段不匹配 -> BAD_REQUEST
- start > end -> BAD_REQUEST
- id 不存在 -> NOT_FOUND
