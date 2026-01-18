---
title: API 总说明
category: api
status: current
version: v0.1
last_updated: 2026-01-17
related:
  - ./v0.1/contract.md
  - ./v0.1/openapi.yaml
---

# API 总说明

## 范围

本目录描述 ChronoAtlas 后端 API 的通用约定与版本化规范文件入口。

## 鉴权

- 需要登录的接口使用 `Authorization: Bearer {token}`。

## 响应与错误

- 请求与响应均为 JSON。
- 统一错误结构与错误码以 [contract.md](v0.1/contract.md) 为准。

## 时间规则

- 时间系统与精度定义见 [术语表](../glossary.md)。
- 时间字段的约束与校验规则见 [contract.md](v0.1/contract.md)。

## 版本

- 人类可读合同：Doc/api/v0.1/contract.md
- OpenAPI 规格：Doc/api/v0.1/openapi.yaml
