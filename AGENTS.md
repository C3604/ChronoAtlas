# Repository Guidelines

## 更新日志

- 2026-01-18：根据 `Doc/` 全量文档同步更新。补充了文档权威入口、API 契约（v0.1）、架构与 ADR、数据存储现状与迁移原则、工程约定与依赖策略、首期产品范围与验收要点。

## 项目结构与模块组织

- 当前仓库同时包含文档与可运行代码：文档集中在 `Doc/`，代码集中在 `packages/`。
- 文档权威入口：
  - 文档索引：[Doc/README.md](Doc/README.md)
  - 目录结构与约定（目录变更时必须同步更新）：[Doc/engineering/repository-structure.md](Doc/engineering/repository-structure.md)
  - 工程约定（环境与流程约束）：[Doc/engineering/working-agreements.md](Doc/engineering/working-agreements.md)
  - 技术栈（当前与目标）：[Doc/engineering/tech-stack.md](Doc/engineering/tech-stack.md)
  - 依赖策略（避免漂移）：[Doc/engineering/dependencies.md](Doc/engineering/dependencies.md)
  - 产品范围（首期）：[Doc/product/scope.md](Doc/product/scope.md)
  - 术语表（名词权威定义）：[Doc/glossary.md](Doc/glossary.md)
- API 权威入口（避免多处重复）：
  - 人类可读合同（v0.1）：[Doc/api/v0.1/contract.md](Doc/api/v0.1/contract.md)
  - OpenAPI（v0.1）：[Doc/api/v0.1/openapi.yaml](Doc/api/v0.1/openapi.yaml)
- 架构与决策记录：
  - 架构概览：[Doc/architecture/overview.md](Doc/architecture/overview.md)
  - ADR 目录：[Doc/architecture/decisions/](Doc/architecture/decisions/)
- 数据存储与说明：
  - 当前持久化：`packages/server/data/db.json`
  - 当前存储说明：[Doc/data/current-storage.md](Doc/data/current-storage.md)
  - 计划中的关系型 Schema（仅计划）：[Doc/data/planned-schema.md](Doc/data/planned-schema.md)
- 代码模块（按当前约定）：
  - `packages/server`：后端服务（当前实现：Node.js + TypeScript）
  - `packages/web`：前端应用（Vue 3 + TypeScript + Vite）
  - `packages/shared`：共享文档与（未来）共享代码

## 构建、测试与本地开发命令

- 脚本入口以 `packages/*/package.json` 为准（例如后端与前端的 dev/build/start）。
- 禁止自动安装依赖；如需安装或升级依赖，必须先确认目标与影响范围，并按 [Doc/engineering/dependencies.md](Doc/engineering/dependencies.md) 的策略执行。
- 对外接口与行为变更前，先对齐 API 文档（见 [Doc/api/README.md](Doc/api/README.md) 与 v0.1 合同/规格）。

## 编码风格与命名约定

- 文档统一使用 Markdown，句子尽量简短；首次出现的专业词用一句话解释（必要时补充到术语表：[Doc/glossary.md](Doc/glossary.md)）。
- 文档文件名使用小写 + 短横线（kebab-case），例如 `Doc/product/scope.md`。
- 文档存在“已实现（current）/计划（planned）”两种状态时，使用文档头部元数据 `status` 明确标注，避免把计划当成已实现。
- API 文档按版本存放在 `Doc/api/v{version}/`，对外契约以 v0.1 合同与 OpenAPI 为准，避免在其他文档重复定义接口细节。
- ADR 文件名使用 4 位编号 + 主题，例如 `0001-tech-stack.md`，并在内容中写清原因、影响范围、替代方案（见 [Doc/architecture/decisions/README.md](Doc/architecture/decisions/README.md)）。

## 测试指南

- 目前没有统一的测试框架与测试目录。
- 若后续引入测试，先在 [Doc/engineering/repository-structure.md](Doc/engineering/repository-structure.md) 中补充规划，并明确测试目录、命名方式与运行命令。
- 任何临时文件或测试文件，用完立即删除（见 [Doc/engineering/working-agreements.md](Doc/engineering/working-agreements.md)）。

## 提交与拉取请求（PR）要求

当前目录不是 Git 仓库，无法总结既有提交习惯。如未来启用 Git，建议提交信息使用“动词 + 目标”的短句；PR 需要描述目标、影响范围与必要截图或接口示例。

## 其他说明

- 开发环境以 Windows 为准，命令行默认使用 PowerShell。
- 首期产品范围与不做清单以 [Doc/product/scope.md](Doc/product/scope.md) 为准；用户故事见 [Doc/product/user-stories.md](Doc/product/user-stories.md)。
- 时间系统采用天文学年号：公元 1 年 = 1，公元前 1 年 = 0；时间精度与校验规则以 API 合同为准。
- 当前存储实现以 `packages/server/data/db.json` 为准；未来迁移需保证 API 行为语义不变，并以导出/导入作为兜底校验路径（见 [Doc/data/current-storage.md](Doc/data/current-storage.md)）。
