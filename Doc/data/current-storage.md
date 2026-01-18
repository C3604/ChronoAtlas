---
title: 当前数据存储说明
category: data
status: current
version: v0.1
last_updated: 2026-01-17
---

# 当前数据存储说明

## 1. 存储位置

- 当前后端使用 JSON 文件作为持久化存储：`packages/server/data/db.json`。

## 2. 顶层结构

`db.json` 顶层对象包含：

- tags：标签列表
- categories：分类列表
- events：事件列表
- users：用户列表（包含密码哈希与盐，仅用于后端校验）
- sessions：登录会话列表（token 与过期时间）
- eventVersions：事件版本列表
- eventApprovals：事件审批列表

## 3. 关键约束

- 关联关系通过 id 维护：事件中的 `tagIds/categoryIds` 必须能在 tags/categories 中找到对应 id。
- 对外返回会在事件中补充 `tags/categories` 详情，但存储仍以 `tagIds/categoryIds` 为准。
- 导入或创建事件时，如果提供名称，系统会自动匹配并创建缺失的标签或分类。
- 时间系统使用天文学年号；时间字段规则见 ../api/v0.1/contract.md 与 ../glossary.md。
- 数据结构以服务端实现为准；对外以 API 合同与 OpenAPI 文件为准。

## 4. 演示数据

- 首期演示数据清单见 sample-data.md。
- `db.json` 中通常已包含一份可直接运行的示例数据与默认管理员账号。

## 5. 未来迁移原则（从 JSON 到关系型数据库）

- 以 API 行为优先：迁移不应改变已发布接口的请求/响应语义。
- 以导出/导入为兜底：迁移前后均可通过 /export/events 与 /import/events 进行数据搬运与校验。
- 以版本/审批可追溯为目标：eventVersions 与 eventApprovals 需要可恢复与可审计。
