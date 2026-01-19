---
title: 计划中的关系型 Schema
category: data
status: planned
version: v0.1
last_updated: 2026-01-19
---

# 计划中的关系型 Schema

说明：本文件描述计划中的关系型数据结构，用于从 JSON 迁移时参考；当前实现仍以 `db.json` 为准。
首期只需支持事件、标签及关联表。

## events

- id (PK)
- title
- summary
- start_year
- end_year
- precision
- fuzzy_is_approx
- fuzzy_range_years
- fuzzy_display_text
- created_at
- updated_at

## tags

- id (PK)
- name
- parent_id (nullable)

## event_tags

- event_id (FK)
- tag_id (FK)

## 时间规则

- 采用天文学年号，公元前 1 年 = 0。

## users

- id (PK, 可修改)
- name
- email
- role
- password_hash
- salt
- profile.phone
- profile.title
- profile.organization
- profile.location
- profile.bio
- created_at

## event_versions

- id (PK)
- event_id
- action
- changed_at
- changed_by
- note
- snapshot

## event_approvals

- id (PK)
- action
- event_id
- draft
- snapshot
- requested_at
- requested_by
- status
- decided_at
- decided_by
- note
