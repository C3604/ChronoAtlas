
# OpenAPI 可读版（摘要）

说明：本文件是接口的可读摘要，详细字段请查看 Doc/api/api-contract.md。

## 通用

- 响应格式：JSON
- 需要登录的接口请带 Authorization: Bearer {token}

## 认证

- POST /auth/login：登录，返回 token 与用户信息
- GET /auth/me：获取当前用户
- POST /auth/logout：退出登录

## 事件

- GET /events：按时间、标签、分类筛选
- POST /events：创建事件
- GET /events/{id}：事件详情
- PATCH /events/{id}：更新事件
- DELETE /events/{id}：删除事件
- GET /events/search：关键词搜索
- GET /events/aggregations：统计概览
- GET /events/{id}/versions：版本列表
- POST /events/{id}/restore：版本恢复

## 标签与分类

- GET /tags /categories：列表
- POST /tags /categories：创建
- PATCH /tags/{id} /categories/{id}：修改
- DELETE /tags/{id} /categories/{id}：删除

## 导入导出

- POST /import/events：导入事件（JSON）
- GET /export/events：导出事件（JSON）

## 其它

- GET /health：健康检查
- GET /api/hello：示例接口
