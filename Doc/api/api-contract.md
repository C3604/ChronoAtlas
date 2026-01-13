# 接口清单（当前版本）

## 1. 基本约定

- 时间规则使用天文学年号（公元前 1 年 = 0）。
- 错误响应统一，参考 Doc/api-system.md。
- 需要登录的接口使用 `Authorization: Bearer {token}`。

## 2. 数据结构

### 2.1 EventTime

- start：时间点（必填）
- end：时间点（可选）
- precision：century|decade|year|month|day
- fuzzy：模糊时间描述

### 2.2 Event

- id
- title（必填、字符串非空）
- summary（可选，简要描述）
- time（必填）
- tagIds[]（可选，标签 id 列表）
- categoryIds[]（可选，分类 id 列表）
- createdAt / updatedAt

### 2.3 Tag / Category

- id
- name（必填、非空）
- parentId（可选）

### 2.4 User（公开字段）

- id
- name
- email
- role

### 2.5 EventVersion

- id
- eventId
- action
- changedAt
- changedBy（可选）
- snapshot

## 3. 错误边界

- 未登录访问受限接口 -> UNAUTHORIZED
- title 为空或非字符串 -> BAD_REQUEST
- time.start 缺失 -> BAD_REQUEST
- precision 与 time 精度不匹配 -> BAD_REQUEST
- start > end -> BAD_REQUEST
- tagIds/categoryIds 存在不可识别 id -> BAD_REQUEST
- 访问不存在资源 -> NOT_FOUND

## 4. 接口

- POST /auth/login：登录
- GET /auth/me：当前用户
- POST /auth/logout：退出登录
- GET /events：列表（时间范围、标签、分类）
- POST /events：创建
- GET /events/{id}：详情
- PATCH /events/{id}：修改
- DELETE /events/{id}：删除
- GET /events/search：关键词搜索
- GET /events/aggregations：统计概览
- GET /events/{id}/versions：版本列表
- POST /events/{id}/restore：版本恢复
- GET /tags：列表
- POST /tags：创建
- PATCH /tags/{id}：修改
- DELETE /tags/{id}：删除
- GET /categories：列表
- POST /categories：创建
- PATCH /categories/{id}：修改
- DELETE /categories/{id}：删除
- POST /import/events：导入事件
- GET /export/events：导出事件

## 5. 查询参数

GET /events 支持：
- timeFrom：时间起点年份（整数）
- timeTo：时间终点年份（整数）
- tagIds：逗号分隔
- categoryIds：逗号分隔
- keyword：关键词（标题或摘要）

## 6. 请求示例

### 6.1 登录

```json
{
  "email": "admin@chronoatlas.local",
  "password": "admin123"
}
```

### 6.2 创建事件

```json
{
  "title": "Example Event",
  "summary": "Short summary",
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
