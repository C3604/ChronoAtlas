# 数据库结构（首期）

说明：首期只需支持事件、标签、分类及关联表。

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

## categories

- id (PK)
- name
- parent_id (nullable)

## event_tags

- event_id (FK)
- tag_id (FK)

## event_categories

- event_id (FK)
- category_id (FK)

## 时间规则

- 采用天文学年号，公元前1年=0。

