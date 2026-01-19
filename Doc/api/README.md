---
title: API 总说明
category: api
status: current
version: v0.1
last_updated: 2026-01-18
related:
  - ./v0.1/contract.md
  - ./v0.1/openapi.yaml
---

# API 总说明

## 范围

本目录描述 ChronoAtlas 后端 API 的通用约定与版本化规范文件入口。

## 鉴权

- 默认使用 Cookie（`access_token` + `refresh_token`）。
- 非 GET/HEAD/OPTIONS 请求需带 `X-CSRF-Token`，值等于 `csrf_token` Cookie。
- 服务端也兼容 `Authorization: Bearer {token}`。

## 响应与错误

- 请求与响应均为 JSON。
- 统一响应格式：`{ code, message, data, traceId }`。
- 错误码与字段校验规则以 [contract.md](v0.1/contract.md) 为准。

## 时间规则

- 时间系统与精度定义见 [术语表](../glossary.md)。
- 时间字段的约束与校验规则见 [contract.md](v0.1/contract.md)。

## 版本

- 人类可读合同：Doc/api/v0.1/contract.md
- OpenAPI 规格：Doc/api/v0.1/openapi.yaml
