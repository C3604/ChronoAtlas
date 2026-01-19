---
title: 架构概览
category: architecture
status: current
version: v0.1
last_updated: 2026-01-19
---

# 架构概览

本文件用于描述总体架构与模块边界。

## 1. 模块

- 前端：页面与交互，目录 packages/web。
- 后端：NestJS 模块化服务（Auth/Users/Mail/Legacy/Settings），目录 packages/server。
- 数据存储：
  - 事件相关：JSON 文件（packages/server/data/db.json）
  - 用户与鉴权：PostgreSQL
  - SMTP 设置：PostgreSQL
- 文档：Doc/。

## 2. 当前范围

- 做：注册/登录/邮件验证/刷新、事件/标签管理。
- 做：版本恢复、导入导出、统计概览、审批流程。
- 不做：人物、地点、地图、全文检索。

## 3. 数据流（简化）

- 注册：页面 -> POST /auth/register -> 发送验证邮件 -> POST /auth/verify-email。
- 登录：页面 -> POST /auth/login -> 服务端写入 Cookie -> 前端保存 CSRF Token。
- 刷新：前端 -> POST /auth/refresh -> 轮换 refresh token。
- 浏览：页面 -> GET /events -> 返回列表 -> 展示。
- 编辑：后台表单 -> POST/PATCH /events -> 校验 -> 写入 JSON -> 返回结果。
- 审批：EDITOR 写入 -> 返回 202 -> ADMIN/SUPER_ADMIN 审批。
- 导入：后台 -> POST /import/events -> 批量写入。
- SMTP 设置：超级管理员 -> GET /settings/smtp -> 返回设置 -> 编辑 -> PUT /settings/smtp -> 写入 PostgreSQL -> 返回结果。

## 4. 关键约定

- 时间规则：天文学年号（公元前 1 年 = 0）。
- 统一响应格式：`{ code, message, data, traceId }`。
- 接口与错误码以 [API 合同](../api/v0.1/contract.md) 为准。
- 目录变更先更新 [仓库目录结构与约定](../engineering/repository-structure.md)。

## 5. 文字流程图

```text
登录流程：
用户 -> 前端 -> POST /auth/login -> 后端校验 -> 写入 Cookie -> 前端携带 CSRF

事件管理：
用户 -> 前端后台 -> POST/PATCH /events -> 后端校验 -> 写入 JSON -> 返回结果

版本恢复：
用户 -> 前端后台 -> POST /events/{id}/restore
恢复快照 -> 返回结果
```
