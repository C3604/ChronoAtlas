## 1. 文档内容审查（逐项摘要）
- architecture.md：总体架构与模块边界；声明“当前范围/不做清单”；简化数据流；关键约定（时间规则、接口以 api-system 为准、目录变更以 structure 为准）。
- api-system.md：API 说明（范围、通用约定、统一错误结构/错误码、时间规则、核心数据结构、接口清单、查询参数、示例、典型错误）。覆盖面最全（含 users、approvals）。
- api/api-contract.md：API 合同版（约定、数据结构、错误边界、接口清单、查询参数、示例）。与 api-system 高度重叠（>70%），但结构更“合同/清单化”。
- api/openapi.yaml：OpenAPI 3.0.3 规格文件（目前只覆盖 health/hello/auth/events/tags/categories/import/export；缺 users、approvals 等）。
- openapi-readable.md：OpenAPI 的“可读摘要”；与 openapi.yaml 高度重叠，且同样缺 users、approvals。
- structure.md：仓库目录规划/现状清单（Doc、packages、infra）；声明“新增目录需更新本文件”。
- pre-dev-standards.md：开发前统一标准（目标边界、术语、最小可用需求、接口/数据标准摘要、目录与流程约束、决策记录要求、里程碑与交付标准、启动检查、当前实现补充）。主题混合度高（复合文档）。
- tech-stack.md：仅一句“记录当前实现技术选择”，内容过少，无法承载信息。
- dev-deps.md：依赖清单（提示“确认后再安装”）；内容与根 README 的依赖段落高度重复（>70%）。
- adr/0001-tech-stack.md：ADR 技术栈决策（Vue3+TS+Vite、NestJS、PostgreSQL）；与 README/structure 里“当前实现（JSON db）”存在潜在冲突，需要标注“计划/已实现”。
- adr/0002-auth-admin.md：ADR 登录鉴权与后台管理决策（原因、影响、备选）。
- database/schema.md：数据库结构（关系型表设计，含 users、event_versions、event_approvals）；与当前实现“JSON db.json”存在阶段差异，需要标注“计划/未来”或迁移说明。
- database/sample-data.md：首期示例数据（标签、分类、事件 10–20 条）。
- product/requirements.md：首期范围确认（目标/模块/不做/验收）。与 architecture/pre-dev 部分内容重复但更精简。
- product/user-stories.md：最小用户故事 3 条。

## 2. 文档关联与依赖关系（当前）
- 架构依赖：architecture.md 指向 api-system.md（接口与错误码）与 structure.md（目录变更）。
- API 依赖：
  - api-system.md ↔ api/api-contract.md（互相声明“保持一致”）。
  - openapi-readable.md 指向 api/api-contract.md。
  - openapi.yaml 与前两者“应一致”但实际缺 users/approvals，形成事实不一致。
- 规划/流程依赖：pre-dev-standards.md 指向 api-system.md、tech-stack.md、structure.md。
- 数据模型依赖：database/schema.md 与当前实现存储方式存在“阶段/方案”差异，需要显式分层（Current vs Planned）。

## 3. 结构优化目标（面向 AI 解析）
- 单一事实来源（Single Source of Truth）：避免三份 API 文档互相引用却不一致。
- 明确“已实现/计划中”：用元数据与目录分层消除 tech-stack、schema、存储方案的冲突。
- 文档按用途分类：技术文档 / API 文档 / 产品文档 / 用户手册（可先放骨架）。
- 统一命名与元数据：kebab-case；Markdown 统一标题层级；每篇加轻量 frontmatter。

## 4. 建议的新目录结构（Doc/）
- Doc/
  - README.md（文档总索引：读什么、从哪开始、版本入口）
  - glossary.md（术语表：事件/标签/分类/时间系统/模糊时间/版本/审批等）
  - architecture/
    - overview.md（由原 architecture.md 迁移并补齐“当前实现/计划”说明）
    - decisions/（原 adr/，保留编号与决策格式）
  - api/
    - README.md（API 总说明：鉴权、错误、时间规则、通用约定；引用版本化规格文件）
    - v0.1/
      - openapi.yaml（补齐缺失端点后作为机器可读规范）
      - contract.md（保留人类可读合同：可从 api-system/api-contract 合并生成）
  - product/
    - scope.md（合并 requirements.md + pre-dev 中“范围/不做/验收”相关段落）
    - user-stories.md（保留）
  - engineering/
    - working-agreements.md（由 pre-dev 中“环境/流程/约束/交付标准”抽取）
    - dependencies.md（整合 dev-deps.md，并改为“以 package.json 为准 + 依赖政策”）
    - tech-stack.md（整合 tech-stack.md + ADR-0001 的“当前实现 vs 目标技术栈”摘要，并明确状态）
    - repository-structure.md（由 structure.md 迁移，聚焦“目录约定/更新规则”，详细树可放附录）
  - data/
    - current-storage.md（新增：说明当前 JSON 存储与迁移原则）
    - planned-schema.md（由 database/schema.md 迁移，标注 planned；避免误读为已实现）
    - sample-data.md（由 database/sample-data.md 迁移）

## 5. 合并/拆分/删除策略（按你给的标准落地到文件）
- 合并（相似度>70% / 同一功能多侧面 / 版本更新重复）
  - api-system.md + api/api-contract.md：合并为 api/v0.1/contract.md（保留“合同式结构”，把示例、错误边界、数据结构统一在同一处）。
  - openapi-readable.md：并入 api/README.md 的“摘要段落”，不再单独维护（避免与 OpenAPI 再次漂移）。
  - dev-deps.md：并入 engineering/dependencies.md，并去掉与 README 重复的“硬列表”，改为“以 packages/*/package.json 为准 + 依赖确认流程”。
- 拆分（复合文档/需要独立版本控制）
  - pre-dev-standards.md：拆为 product/scope.md + engineering/working-agreements.md + glossary.md（术语集中管理）。
  - database/schema.md：拆出“当前存储（JSON）”与“计划中的关系型 schema”，避免混淆。
- 删除（重复率>50% 的副本 / 废弃版本 / 临时文件）
  - tech-stack.md（现状几乎空内容，删除并用 engineering/tech-stack.md 替代）。
  - openapi-readable.md（删除，功能由 api/README.md 覆盖）。
  - 其他文件目前未发现临时编辑文件/废弃版本副本。

## 6. AI 可读性优化（将要对每篇文档执行的统一改造）
- 标题层级：每篇从单一 H1 开始，后续 H2/H3 语义一致；短文也保留“范围/术语/参考”最小结构。
- 元数据：每个 .md 文件顶部加入 YAML frontmatter（title/category/status/version/last_updated/related）。
- 命名规范：统一 kebab-case；决策记录保持 4 位编号 + 主题。
- 术语定义：所有“天文学年号/模糊时间/版本/审批”等只在 glossary.md 进行权威定义，其他文档引用。

## 7. 内部链接保持有效（实施时的校验方式）
- 批量替换：把现有 `Doc/...` 引用改为相对路径（例如从 architecture/overview.md 指向 ../api/README.md）。
- 一致性校验：
  - 文本层：扫描所有 Markdown 链接与引用路径，确保文件存在。
  - API 层：以 api/v0.1/contract.md 为准，对齐更新 openapi.yaml（补 users、approvals 等缺失端点），避免三处漂移。

## 8. 实施顺序（你确认后我将按此执行真实改动）
1) 新建 Doc/README.md、Doc/glossary.md 与各子目录骨架。
2) 迁移并重命名现有文档到新目录（先“移动不改内容”，保证可回滚）。
3) 合并 API 文档：生成 api/v0.1/contract.md，更新 api/README.md；删除 openapi-readable.md；补齐 openapi.yaml 端点。
4) 拆分 pre-dev-standards.md：抽取到 product/scope.md、engineering/working-agreements.md、glossary.md；删除原文件。
5) 拆分数据文档：生成 data/current-storage.md、data/planned-schema.md、data/sample-data.md。
6) 统一加元数据与标题层级；清理无用重复段落。
7) 更新并验证所有内部链接；最后更新 engineering/repository-structure.md（原 structure.md）与 Doc/README.md 索引。

## 9. 风险点与处理
- 技术栈/存储方案冲突：通过 status（current/planned）与“current-storage.md”显式化，避免 AI/读者误判。
- OpenAPI 不完整：实施时补齐后再把其作为机器可读来源；否则标注为 partial。

如果你确认该方案，我会开始在工作区内实际移动/合并/删除文件并更新链接，最终确保 Doc/ 内文档结构更适合 AI 解析。