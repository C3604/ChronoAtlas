---
title: 技术栈（当前与目标）
category: engineering
status: current
version: v0.1
last_updated: 2026-01-17
---

# 技术栈（当前与目标）

本文件用于记录“当前实现”与“目标方案”，并说明它们之间的关系，避免读者把计划当成已实现。

## 当前实现（current）

- 前端：Vue 3 + TypeScript + Vite（packages/web）。
- 后端：Node.js + TypeScript（packages/server/src/main.ts），当前以轻量 HTTP 服务为主。
- 存储：JSON 文件（packages/server/data/db.json），说明见 ../data/current-storage.md。

## 目标方案（planned）

- 技术栈决策记录见 ../architecture/decisions/0001-tech-stack.md。
- 关系型数据库 Schema 设想见 ../data/planned-schema.md。

## 对外契约

- 对外接口以 ../api/v0.1/contract.md 与 ../api/v0.1/openapi.yaml 为准。
