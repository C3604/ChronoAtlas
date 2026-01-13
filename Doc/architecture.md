
# 架构概览

本文件用于描述总体架构与模块边界。

## 1. 模块
- 前端：页面与交互，目录 packages/web。
- 后端：认证、事件、标签、分类、版本、导入导出，目录 packages/server。
- 数据存储：JSON 文件（packages/server/data/db.json）。
- 文档：Doc/。

## 2. 当前范围
- 做：登录鉴权、事件/标签/分类管理。
- 做：版本恢复、导入导出、统计概览。
- 不做：人物、地点、地图、全文检索。

## 3. 数据流（简化）
- 登录：页面 -> /auth/login -> token -> 前端保存。
- 浏览：页面 -> /events -> 返回列表 -> 展示。
- 编辑：后台表单 -> /events -> 校验 -> 写入 JSON -> 返回结果。
- 版本：修改/删除 -> 写入 eventVersions -> 可恢复。
- 导入：后台 -> /import/events -> 批量写入。
- 统计：后台 -> /events/aggregations -> 概览。

## 4. 关键约定
- 时间规则：天文学年号（公元前 1 年 = 0）。
- 接口与错误码以 Doc/api-system.md 为准。
- 目录变更先更新 Doc/structure.md。

## 5. 文字流程图
```text
登录流程：
用户 -> 前端 -> POST /auth/login -> 后端校验 -> 返回 token -> 前端保存

事件管理：
用户 -> 前端后台 -> POST/PATCH /events -> 后端校验 -> 写入 JSON -> 返回结果

版本恢复：
用户 -> 前端后台 -> POST /events/{id}/restore
恢复快照 -> 返回结果
```
