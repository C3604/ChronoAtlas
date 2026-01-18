---
title: 依赖与安装策略
category: engineering
status: current
version: v0.1
last_updated: 2026-01-17
---

# 依赖与安装策略

## 依赖来源

- 依赖清单以 `packages/*/package.json` 与对应 lock 文件为准。
- 本文仅描述“依赖管理策略”，避免与代码仓库中的依赖列表重复导致漂移。

## 安装策略

- 禁止自动安装依赖；如需安装或升级，需先确认目标与影响范围。
- 如需新增可选能力（例如可视化库、数据库驱动），先以 ADR 记录原因与替代方案，再落地到 package.json。

## 典型可选项

- 可视化：d3（仅在明确需要后加入）
- 数据库：PostgreSQL（见计划中的 Schema 与相关 ADR）
