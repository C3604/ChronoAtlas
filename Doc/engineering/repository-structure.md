---
title: 仓库目录结构与约定
category: engineering
status: current
version: v0.1
last_updated: 2026-01-17
---

# 仓库目录结构与约定

说明：目录结构变更时，需要同步更新本文件与 Doc/README.md，避免文档索引失效。

## Doc/（项目文档）

- README.md：文档索引入口
- glossary.md：术语表（权威定义）
- api/
  - README.md：API 总说明
  - v0.1/
    - contract.md：API 合同（人类可读）
    - openapi.yaml：OpenAPI 规格（机器可读）
- architecture/
  - overview.md：架构概览
  - decisions/：架构决策记录（ADR）
- product/
  - scope.md：首期范围
  - user-stories.md：用户故事
- engineering/
  - working-agreements.md：工程约定
  - repository-structure.md：目录结构与约定
  - dependencies.md：依赖管理策略
  - tech-stack.md：技术栈（current/planned）
- data/
  - current-storage.md：当前 JSON 存储说明
  - planned-schema.md：计划中的关系型 Schema
  - sample-data.md：示例数据清单

## packages/（代码）

- packages/server：后端服务（Node.js + TypeScript）
- packages/web：前端应用（Vue 3 + TypeScript + Vite）
- packages/shared：共享文档与（未来）共享代码

## 命名与版本约定

- Markdown 文件名使用小写+短横线（kebab-case）。
- API 文档按版本放入 `Doc/api/v{version}/`，并通过 `status/version` 元数据标注状态。


## 补充：初始化配置
- 新增文档：`Doc/engineering/setup-and-config.md`
- 运行配置：`packages/server/data/app-config.json`（不再使用 .env）
