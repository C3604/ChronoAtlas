---
title: 术语表
category: docs
status: current
version: v0.1
last_updated: 2026-01-19
---

# 术语表

## 事件（Event）
在时间轴上发生的一条历史记录，是系统的核心数据对象。

## 标签（Tag）
用于给事件做多维度标记，一个事件可以关联多个标签。

## 分类（Category）
用于给事件做分组归类，通常用于建立主题或学科目录。

## 人物（Person）
事件的关联对象之一，用于描述与事件相关的人物信息（首期范围暂不实现）。

## 地点（Place）
事件的关联对象之一，用于描述事件发生或关联的地理位置（首期范围暂不实现）。

## 时间系统（Astronomical Year Numbering）
采用天文学年号：公元 1 年 = 1，公元前 1 年 = 0，公元前 2 年 = -1。

## 时间精度（Precision）
用于描述时间精细程度的枚举值：century / decade / year / month / day。

## 模糊时间（Fuzzy Time）
当无法给出精确时间点时，用“约某年/某世纪”的方式表达，并支持展示与筛选。

## 版本记录（Event Version）
对事件的创建、修改、删除、恢复、导入等操作形成的历史快照。

## 审批（Event Approval）
当编辑操作需要审核时，用于保存草稿与审批结果（通过/拒绝），并记录决策信息。

## 内容管理权限（Content Manage Permission）
允许进行内容管理操作（如标签/分类管理、版本恢复、导入事件等）的权限集合。

## 内容写入权限（Content Write Permission）
允许创建、修改、删除事件的权限集合；部分角色的写入需要审批。

## RBAC（Role-Based Access Control）
基于角色的权限控制，不同角色拥有不同操作范围。

## JWT（JSON Web Token）
一种短期登录凭证，用于识别当前登录用户。

## Refresh Token
用于刷新登录状态的长期凭证，可撤销与轮换。

## CSRF（Cross-Site Request Forgery）
跨站请求伪造防护，通过校验请求头与 Cookie 的一致性来降低风险。

## SMTP
用于邮件发送的协议，这里用于配置邮件服务器信息。
