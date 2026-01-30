﻿<template>
  <div class="page-container">
    <div class="page-grid">
      <!-- Filters Section -->
      <a-card class="filter-card" :bordered="false">
      <template #title>
        <span class="card-title"><filter-outlined /> 筛选条件</span>
      </template>
      <template #extra>
        <a-button type="text" @click="handleReset">
          <template #icon><reload-outlined /></template>
          重置
        </a-button>
      </template>

      <a-form layout="vertical" :model="filters" @finish="handleApply" autocomplete="off">
        <a-row :gutter="[16, 16]">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="时间起点" name="timeFrom">
              <a-input-number
                v-model:value="filters.timeFrom"
                placeholder="例如 -200…"
                name="timeFrom"
                inputmode="numeric"
                style="width: 100%"
              >
                <template #prefix><calendar-outlined /></template>
              </a-input-number>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="时间终点" name="timeTo">
              <a-input-number
                v-model:value="filters.timeTo"
                placeholder="例如 2020…"
                name="timeTo"
                inputmode="numeric"
                style="width: 100%"
              >
                <template #prefix><calendar-outlined /></template>
              </a-input-number>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="关键词" name="keyword">
              <a-input
                v-model:value="filters.keyword"
                placeholder="搜索事件标题或摘要…"
                name="keyword"
                allow-clear
              >
                <template #prefix><search-outlined /></template>
              </a-input>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="[16, 16]">
          <a-col :xs="24" :md="12">
            <a-form-item label="标签" name="tagIds">
              <div class="tag-filter">
                <a-select
                  v-model:value="filters.tagIds"
                  mode="multiple"
                  placeholder="选择标签…"
                  allow-clear
                  :options="tags.map(t => ({ label: t.name, value: t.id }))"
                  class="tag-select"
                  name="tagIds"
                >
                  <template #suffixIcon><tag-outlined /></template>
                </a-select>
                <a-form-item-rest>
                  <div class="tag-match-switch">
                    <span>匹配方式</span>
                    <a-switch
                      v-model:checked="tagMatchAll"
                      checked-children="全部"
                      un-checked-children="任意"
                    />
                  </div>
                </a-form-item-rest>
              </div>
            </a-form-item>
          </a-col>
        </a-row>

        <div class="filter-actions">
          <a-button type="primary" html-type="submit" :loading="loading">
            <template #icon><search-outlined /></template>
            手动刷新
          </a-button>
          <span class="auto-preview-hint">
            {{ autoPreviewing ? "自动预览中…" : "筛选会自动生效" }}
          </span>
        </div>
      </a-form>
      <a-alert
        v-if="tagError"
        type="error"
        show-icon
        :message="tagError"
        class="form-alert"
        aria-live="polite"
      />
      </a-card>

      <!-- Gantt Chart Section -->
      <a-card class="gantt-card" :bordered="false">
      <div class="gantt-sticky">
        <div class="gantt-title-bar">
          <div class="gantt-title-wrapper">
            <a-tooltip placement="topLeft" :mouseEnterDelay="0.5">
              <template #title>甘特图视图 - 历史事件与里程碑回顾</template>
              <span class="card-title text-truncate"><bar-chart-outlined /> 甘特图视图 - 历史事件与里程碑回顾</span>
            </a-tooltip>
          </div>
          <div class="gantt-title-meta">
            <a-tag color="blue" aria-live="polite">事件 {{ events.length }}</a-tag>
            <a-tag v-if="filters.tagIds.length" color="orange">筛选中</a-tag>
          </div>
        </div>
        <div class="gantt-toolbar">
          <a-radio-group v-model:value="ganttView" size="small" button-style="solid">
            <a-radio-button value="year">年视图</a-radio-button>
            <a-radio-button value="month">月视图</a-radio-button>
            <a-radio-button value="day">日视图</a-radio-button>
          </a-radio-group>
          <div class="gantt-slider">
            <input
              v-model.number="ganttOffset"
              type="range"
              min="0"
              max="100"
              step="1"
              :disabled="!canSlide"
              aria-label="时间范围滑块"
            />
            <span class="gantt-range" aria-live="polite">{{ ganttRangeLabel }}</span>
          </div>
        </div>
        <div v-if="events.length" class="gantt-header">
          <div v-for="tick in ganttTicks" :key="tick" class="gantt-tick">
            {{ formatGanttTick(tick) }}
          </div>
        </div>
      </div>

      <a-alert
        v-if="loadError"
        type="error"
        show-icon
        :message="loadError"
        class="gantt-alert"
        aria-live="polite"
      >
        <template #action>
          <a-button type="link" @click="handleApply">重试</a-button>
        </template>
      </a-alert>

      <a-spin :spinning="loading" tip="正在加载事件数据…">
        <a-empty v-if="!loading && events.length === 0" description="暂无符合条件的事件">
          <template #description>
            <div class="empty-desc">暂无符合条件的事件</div>
            <div class="empty-sub">可尝试放宽时间范围或清空筛选</div>
          </template>
          <template #extra>
            <a-button @click="handleReset">清空筛选</a-button>
          </template>
        </a-empty>
        
        <div v-else class="gantt-container">
          <div
            class="gantt-body"
            ref="ganttBodyRef"
            @scroll="handleGanttScroll"
            :style="{
              paddingTop: `${ganttPadding.top}px`,
              paddingBottom: `${ganttPadding.bottom}px`
            }"
          >
            <div
              v-for="event in visibleEvents"
              :key="event.id"
              class="gantt-row"
              :class="{ 'is-selected': selectedEvent?.id === event.id }"
              @click="selectedEvent = event"
              role="button"
              tabindex="0"
              :aria-label="`查看事件：${event.title}`"
              :aria-selected="selectedEvent?.id === event.id"
              @keydown.enter.prevent="selectedEvent = event"
              @keydown.space.prevent="selectedEvent = event"
            >
              <div class="gantt-info">
                <div class="event-title">{{ event.title }}</div>
                <div class="event-meta">
                  <span class="event-time">{{ formatEventTime(event.time) }}</span>
                  <span v-if="getEventTagCount(event) > 0" class="event-tags-count">
                    标签 {{ getEventTagCount(event) }}
                  </span>
                </div>
                <div v-if="event.summary" class="event-summary">{{ event.summary }}</div>
              </div>
              <div class="gantt-track-area">
                <a-tooltip overlayClassName="gantt-tooltip-enhanced" placement="top" :mouseEnterDelay="0.1">
                  <template #title>
                    <div class="tooltip-card">
                      <div class="tooltip-header">
                        <div class="tooltip-title">{{ event.title }}</div>
                        <a-tag color="processing" class="tooltip-status-badge">进行中</a-tag>
                      </div>
                      
                      <div class="tooltip-row">
                        <clock-circle-outlined class="tooltip-icon" />
                        <span class="tooltip-time">{{ formatEventTime(event.time) }}</span>
                      </div>

                      <div class="tooltip-progress-box">
                        <div class="progress-labels">
                          <span>当前进度</span>
                          <span class="progress-val">65%</span>
                        </div>
                        <div class="progress-track">
                           <div class="progress-fill" style="width: 65%"></div>
                        </div>
                      </div>

                      <div v-if="getEventTagLabelsFor(event).length" class="tooltip-row tags-row">
                        <tag-outlined class="tooltip-icon" />
                        <div class="tooltip-tags-list">
                          <span
                            v-for="tag in getEventTagLabelsFor(event)"
                            :key="tag"
                            class="tooltip-tag-pill"
                          >
                            {{ tag }}
                          </span>
                        </div>
                      </div>

                      <div class="tooltip-divider"></div>

                      <div class="tooltip-row">
                         <user-outlined class="tooltip-icon" />
                         <span class="tooltip-text">负责人：管理员</span>
                      </div>

                      <div v-if="event.summary" class="tooltip-row summary-row">
                        <info-circle-outlined class="tooltip-icon" />
                        <span class="tooltip-summary-text">{{ event.summary }}</span>
                      </div>
                    </div>
                  </template>
                  <div class="gantt-bar" :style="calcBarStyle(event)"></div>
                </a-tooltip>
              </div>
            </div>
          </div>
        </div>
      </a-spin>
      </a-card>
    </div>

    <!-- Event Details Drawer -->
    <a-drawer
      v-model:open="drawerVisible"
      title="事件详情"
      placement="right"
      :width="drawerWidth"
    >
      <template v-if="selectedEvent">
        <div class="detail-panel">
          <div class="detail-header">
            <div class="detail-title">{{ selectedEvent.title }}</div>
            <div class="detail-time">{{ formatEventTime(selectedEvent.time) }}</div>
          </div>
          <div class="detail-grid">
            <div class="detail-item">
              <div class="detail-label">精度</div>
              <div class="detail-value">
                <a-tag color="blue">{{ selectedEvent.time.precision }}</a-tag>
              </div>
            </div>
            <div class="detail-item">
              <div class="detail-label">标签</div>
              <div class="detail-value">
                <a-space size="small" wrap>
                  <a-tag v-for="tag in eventTagLabels" :key="tag" color="blue">{{ tag }}</a-tag>
                  <span v-if="eventTagLabels.length === 0">无</span>
                </a-space>
              </div>
            </div>
          </div>
          <a-divider />
          <div class="detail-section">
            <div class="detail-label">摘要</div>
            <a-typography-paragraph
              class="detail-summary"
              :ellipsis="{ rows: 6, expandable: true, symbol: '展开' }"
            >
              {{ selectedEvent.summary || "暂无摘要" }}
            </a-typography-paragraph>
          </div>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ReloadOutlined,
  SearchOutlined,
  CalendarOutlined,
  TagOutlined,
  FilterOutlined,
  BarChartOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons-vue';
import { EventItem, EventTimePoint, useAppStore } from "../store/appStore";

type GanttView = "year" | "month" | "day";

const {
  filters,
  events,
  tags,
  loadTags,
  loadEvents,
  resetFilters,
  formatYear,
  formatEventTime,
  mapTags
} = useAppStore();

const router = useRouter();
const route = useRoute();

const loading = ref(false);
const autoApplyTimer = ref<number | null>(null);
const suppressAutoApply = ref(false);
const autoPreviewing = ref(false);
const loadError = ref("");
const tagError = ref("");
const selectedEvent = ref<EventItem | null>(null);
const windowWidth = ref(window.innerWidth);
const ganttBodyRef = ref<HTMLElement | null>(null);
const ganttScrollTop = ref(0);
const ganttViewportHeight = ref(360);
const ganttRowHeight = 48;
const ganttOverscan = 6;

const updateWidth = () => {
  windowWidth.value = window.innerWidth;
  updateGanttViewport();
};

const updateGanttViewport = () => {
  if (!ganttBodyRef.value) {
    return;
  }
  ganttViewportHeight.value = ganttBodyRef.value.clientHeight;
};

const handleGanttScroll = (event: Event) => {
  const target = event.target as HTMLElement;
  ganttScrollTop.value = target.scrollTop;
};

onMounted(() => {
  window.addEventListener('resize', updateWidth);
  nextTick(() => {
    updateGanttViewport();
  });
});

onUnmounted(() => {
  window.removeEventListener('resize', updateWidth);
  if (autoApplyTimer.value) {
    window.clearTimeout(autoApplyTimer.value);
    autoApplyTimer.value = null;
  }
});

const drawerWidth = computed(() => {
  return windowWidth.value < 576 ? '100%' : '400px';
});

const drawerVisible = computed({
  get: () => !!selectedEvent.value,
  set: (val) => {
    if (!val) selectedEvent.value = null;
  }
});

const eventTagLabels = computed(() => {
  if (!selectedEvent.value) {
    return [];
  }
  if (selectedEvent.value.tags && selectedEvent.value.tags.length > 0) {
    return selectedEvent.value.tags.map((tag) => tag.name);
  }
  return mapTags(selectedEvent.value.tagIds);
});

const tagMatchAll = computed({
  get: () => filters.tagMatch === "all",
  set: (value) => {
    filters.tagMatch = value ? "all" : "any";
  }
});

const ganttView = ref<GanttView>("year");
const ganttOffset = ref(0);
const monthsPerYear = 12;
const daysPerMonth = 30;
const daysPerYear = monthsPerYear * daysPerMonth;
const isQuerySyncing = ref(false);
const viewSpanConfig: Record<GanttView, number> = {
  year: 200,
  month: 48,
  day: 90
};

watch(ganttView, () => {
  if (isQuerySyncing.value) {
    return;
  }
  ganttOffset.value = 0;
});

const parseNumber = (value: unknown) => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === null || raw === undefined || raw === "") {
    return null;
  }
  const num = Number(raw);
  if (!Number.isFinite(num)) {
    return null;
  }
  return Math.trunc(num);
};

const parseTagIds = (value: unknown) => {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item).split(","))
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeQuery = (value: Record<string, unknown>) => {
  const result: Record<string, string> = {};
  Object.entries(value).forEach(([key, entry]) => {
    if (entry === undefined || entry === null || entry === "") {
      return;
    }
    if (Array.isArray(entry)) {
      if (entry.length === 0) {
        return;
      }
      result[key] = entry.join(",");
      return;
    }
    result[key] = String(entry);
  });
  return result;
};

const isSameQuery = (a: Record<string, string>, b: Record<string, string>) => {
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  return aKeys.every((key, index) => key === bKeys[index] && a[key] === b[key]);
};

const applyQueryToState = () => {
  isQuerySyncing.value = true;
  const { timeFrom, timeTo, keyword, tagIds, tagMatch, view, offset } = route.query;

  const parsedFrom = parseNumber(timeFrom);
  const parsedTo = parseNumber(timeTo);
  const parsedOffset = parseNumber(offset);
  const parsedTags = parseTagIds(tagIds);

  filters.timeFrom = parsedFrom ?? "";
  filters.timeTo = parsedTo ?? "";
  filters.keyword = typeof keyword === "string" ? keyword : "";
  filters.tagIds = parsedTags;
  filters.tagMatch = tagMatch === "any" || tagMatch === "all" ? tagMatch : "all";

  if (view === "month" || view === "day" || view === "year") {
    ganttView.value = view;
  } else {
    ganttView.value = "year";
  }

  if (parsedOffset !== null) {
    ganttOffset.value = Math.max(0, Math.min(100, parsedOffset));
  } else {
    ganttOffset.value = 0;
  }

  nextTick(() => {
    isQuerySyncing.value = false;
  });
};

const buildQueryFromState = () => {
  const query: Record<string, string> = {};
  if (filters.timeFrom !== "") {
    query.timeFrom = String(filters.timeFrom);
  }
  if (filters.timeTo !== "") {
    query.timeTo = String(filters.timeTo);
  }
  if (filters.keyword.trim()) {
    query.keyword = filters.keyword.trim();
  }
  if (filters.tagIds.length > 0) {
    query.tagIds = filters.tagIds.join(",");
  }
  if (filters.tagMatch && filters.tagMatch !== "all") {
    query.tagMatch = filters.tagMatch;
  }
  if (ganttView.value !== "year") {
    query.view = ganttView.value;
  }
  if (ganttOffset.value !== 0) {
    query.offset = String(ganttOffset.value);
  }
  return query;
};

const syncQueryFromState = () => {
  if (isQuerySyncing.value) {
    return false;
  }
  const nextQuery = normalizeQuery(buildQueryFromState());
  const currentQuery = normalizeQuery(route.query as Record<string, unknown>);
  if (isSameQuery(nextQuery, currentQuery)) {
    return false;
  }
  isQuerySyncing.value = true;
  router.replace({ query: nextQuery }).finally(() => {
    isQuerySyncing.value = false;
  });
  return true;
};

const scheduleAutoApply = () => {
  if (suppressAutoApply.value || isQuerySyncing.value) {
    return;
  }
  if (autoApplyTimer.value) {
    window.clearTimeout(autoApplyTimer.value);
  }
  autoPreviewing.value = true;
  autoApplyTimer.value = window.setTimeout(() => {
    autoApplyTimer.value = null;
    handleApply();
  }, 400);
};

const getPointValue = (point: EventTimePoint, isEnd: boolean) => {
  const year = point.year;
  if (ganttView.value === "year") {
    return year;
  }
  const month = point.month ?? (isEnd ? 12 : 1);
  if (ganttView.value === "month") {
    return year * monthsPerYear + (month - 1);
  }
  const day = point.day ?? (isEnd ? daysPerMonth : 1);
  return year * daysPerYear + (month - 1) * daysPerMonth + (day - 1);
};

const getEventRange = (event: EventItem) => {
  const startValue = getPointValue(event.time.start, false);
  const endPoint = event.time.end ?? event.time.start;
  const endValue = getPointValue(endPoint, true);
  return {
    startValue: Math.min(startValue, endValue),
    endValue: Math.max(startValue, endValue)
  };
};

const fullRange = computed(() => {
  if (events.value.length === 0) {
    return { min: 0, max: 0 };
  }
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  events.value.forEach((event) => {
    const range = getEventRange(event);
    min = Math.min(min, range.startValue);
    max = Math.max(max, range.endValue);
  });
  return { min, max };
});

const fullRangeSpan = computed(() => {
  const span = fullRange.value.max - fullRange.value.min;
  return span === 0 ? 1 : span;
});

const viewSpan = computed(() => {
  const span = fullRangeSpan.value;
  const target = viewSpanConfig[ganttView.value];
  return Math.max(1, Math.min(span, target));
});

const getEventTagCount = (event: EventItem) => {
  if (event.tags && event.tags.length > 0) {
    return event.tags.length;
  }
  return event.tagIds?.length ?? 0;
};

const getEventTagLabelsFor = (event: EventItem) => {
  if (event.tags && event.tags.length > 0) {
    return event.tags.map((tag) => tag.name);
  }
  return mapTags(event.tagIds || []);
};

const canSlide = computed(() => fullRangeSpan.value > viewSpan.value);

const rangeMin = computed(() => {
  if (events.value.length === 0) {
    return 0;
  }
  if (!canSlide.value) {
    return fullRange.value.min;
  }
  const maxOffset = fullRangeSpan.value - viewSpan.value;
  const offsetValue = Math.round((maxOffset * ganttOffset.value) / 100);
  return fullRange.value.min + offsetValue;
});

const rangeMax = computed(() => rangeMin.value + viewSpan.value);

const rangeSpan = computed(() => {
  const span = rangeMax.value - rangeMin.value;
  return span === 0 ? 1 : span;
});

const visibleRange = computed(() => {
  const total = events.value.length;
  if (total === 0) {
    return { startIndex: 0, endIndex: 0 };
  }
  const viewportCount = Math.ceil(ganttViewportHeight.value / ganttRowHeight);
  const start = Math.floor(ganttScrollTop.value / ganttRowHeight);
  const startIndex = Math.max(0, start - Math.floor(ganttOverscan / 2));
  const endIndex = Math.min(total, startIndex + viewportCount + ganttOverscan);
  return { startIndex, endIndex };
});

const visibleEvents = computed(() => {
  const { startIndex, endIndex } = visibleRange.value;
  return events.value.slice(startIndex, endIndex);
});

const ganttPadding = computed(() => {
  const { startIndex, endIndex } = visibleRange.value;
  const total = events.value.length;
  return {
    top: startIndex * ganttRowHeight,
    bottom: Math.max(0, (total - endIndex) * ganttRowHeight)
  };
});

const ganttTicks = computed(() => {
  if (events.value.length === 0) return [];
  const tickCount = ganttView.value === "day" ? 7 : 6;
  const step = Math.max(1, Math.round(rangeSpan.value / tickCount));
  const ticks: number[] = [];
  for (let value = rangeMin.value; value <= rangeMax.value; value += step) {
    ticks.push(value);
  }
  return ticks;
});

const splitMonthIndex = (value: number) => {
  const year = Math.floor(value / monthsPerYear);
  let month = value % monthsPerYear;
  if (month < 0) {
    month += monthsPerYear;
  }
  return { year, month: month + 1 };
};

const splitDayIndex = (value: number) => {
  const year = Math.floor(value / daysPerYear);
  let dayOfYear = value % daysPerYear;
  if (dayOfYear < 0) {
    dayOfYear += daysPerYear;
  }
  const month = Math.floor(dayOfYear / daysPerMonth);
  const day = (dayOfYear % daysPerMonth) + 1;
  return { year, month: month + 1, day };
};

const formatMonthLabel = (value: number) => {
  const { year, month } = splitMonthIndex(value);
  return `${formatYear(year)} ${month} 月`;
};

const formatDayLabel = (value: number) => {
  const { year, month, day } = splitDayIndex(value);
  return `${formatYear(year)} ${month} 月 ${day} 日`;
};

const formatGanttTick = (value: number) => {
  if (ganttView.value === "year") {
    return formatYear(value);
  }
  if (ganttView.value === "month") {
    return formatMonthLabel(value);
  }
  return formatDayLabel(value);
};

const ganttRangeLabel = computed(() => {
  if (events.value.length === 0) {
    return "暂无范围";
  }
  if (ganttView.value === "year") {
    return `${formatYear(rangeMin.value)} ~ ${formatYear(rangeMax.value)}`;
  }
  if (ganttView.value === "month") {
    return `${formatMonthLabel(rangeMin.value)} ~ ${formatMonthLabel(rangeMax.value)}`;
  }
  return `${formatDayLabel(rangeMin.value)} ~ ${formatDayLabel(rangeMax.value)}`;
});

const calcBarStyle = (event: EventItem) => {
  const range = getEventRange(event);
  const safeStart = Math.max(Math.min(range.startValue, rangeMax.value), rangeMin.value);
  const safeEnd = Math.max(Math.min(range.endValue, rangeMax.value), rangeMin.value);
  const left = ((safeStart - rangeMin.value) / rangeSpan.value) * 100;
  const right = ((safeEnd - rangeMin.value) / rangeSpan.value) * 100;
  const width = Math.max(right - left, 0.5);
  return {
    left: `${left}%`,
    width: `${width}%`
  };
};

const handleApply = async () => {
  loading.value = true;
  loadError.value = "";
  if (autoApplyTimer.value) {
    window.clearTimeout(autoApplyTimer.value);
    autoApplyTimer.value = null;
  }
  autoPreviewing.value = false;
  try {
    await loadEvents();
    selectedEvent.value = null;
    if (ganttBodyRef.value) {
      ganttBodyRef.value.scrollTop = 0;
      ganttScrollTop.value = 0;
    }
    await nextTick();
    updateGanttViewport();
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : "事件加载失败";
  } finally {
    loading.value = false;
  }
};

const handleReset = async () => {
  suppressAutoApply.value = true;
  autoPreviewing.value = false;
  resetFilters();
  await nextTick();
  suppressAutoApply.value = false;
  await handleApply();
};

onMounted(async () => {
  applyQueryToState();
  try {
    await loadTags();
    tagError.value = "";
  } catch (error) {
    tagError.value = error instanceof Error ? error.message : "标签加载失败";
  }
  await handleApply();
});

watch(
  () => route.query,
  async () => {
    if (isQuerySyncing.value) {
      return;
    }
    applyQueryToState();
    await handleApply();
  }
);

watch(
  () => [
    filters.timeFrom,
    filters.timeTo,
    filters.keyword,
    filters.tagMatch,
    filters.tagIds.join(","),
    ganttView.value,
    ganttOffset.value
  ],
  () => {
    if (suppressAutoApply.value) {
      return;
    }
    const changed = syncQueryFromState();
    if (!changed) {
      scheduleAutoApply();
    }
  }
);

watch(
  () => events.value.length,
  () => {
    nextTick(() => {
      updateGanttViewport();
    });
  }
);
</script>

<style scoped>
.page-container {
  width: 100%;
  padding: 24px clamp(16px, 3vw, 40px);
}

.page-grid {
  display: grid;
  gap: 24px;
}

@media (min-width: 1200px) {
  .page-grid {
    grid-template-columns: 320px 1fr;
    align-items: start;
  }

  .filter-card {
    position: sticky;
    top: 88px;
  }
}

/* Filter Card */
.filter-card {
  margin-bottom: 0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  width: 100%;
  min-width: 0;
  overflow: visible; /* Changed from hidden to visible to avoid clipping shadows/tooltips if needed, but 'hidden' is safer for rounded corners */
}

.filter-card :deep(.ant-card-body) {
  display: flex;
  flex-direction: column;
  gap: 12px;
  /* Fix layout collapse */
  min-height: min-content;
}

/* Tooltip Styles (Global for Portal) */
:global(.gantt-tooltip-enhanced .ant-tooltip-inner) {
  background: #fff !important;
  color: #1f2937 !important;
  padding: 12px !important;
  border-radius: 8px !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15) !important;
  border: 1px solid #e2e8f0;
  max-width: 320px;
}

:global(.gantt-tooltip-enhanced .ant-tooltip-arrow::before) {
  background: #fff !important;
}

.tooltip-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 240px;
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.tooltip-title {
  font-weight: 600;
  font-size: 14px;
  color: #111827;
  line-height: 1.4;
}

.tooltip-status-badge {
  margin: 0;
  font-size: 10px;
  height: 20px;
  line-height: 18px;
}

.tooltip-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: #4b5563;
  line-height: 1.5;
}

.tooltip-icon {
  margin-top: 3px;
  color: #9ca3af;
}

.tooltip-progress-box {
  background: #f3f4f6;
  padding: 8px;
  border-radius: 6px;
  margin: 4px 0;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 4px;
}

.progress-val {
  font-weight: 600;
  color: #10b981;
}

.progress-track {
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #10b981;
  border-radius: 3px;
}

.tooltip-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tooltip-tag-pill {
  background: #f3f4f6;
  color: #4b5563;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  border: 1px solid #e5e7eb;
}

.tooltip-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 2px 0;
}

.tooltip-summary-text {
  color: #6b7280;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.auto-preview-hint {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.form-alert {
  margin-top: 16px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  text-wrap: balance;
}

.tag-filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.tag-select {
  flex: 1;
  min-width: 220px;
}

.tag-match-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

/* Gantt Chart */
.gantt-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.gantt-alert {
  margin: 0 16px 12px;
}

.gantt-sticky {
  position: sticky;
  top: 72px;
  z-index: 5;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 12px;
  padding: 12px 0 16px;
  margin-bottom: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
}

:global([data-theme="dark"]) .gantt-sticky {
  background: rgba(15, 23, 42, 0.72);
  border-color: rgba(148, 163, 184, 0.12);
  box-shadow: 0 10px 24px rgba(2, 6, 23, 0.35);
}

.gantt-title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  padding: 0 16px;
  min-width: 0;
  flex-wrap: nowrap; /* Changed to nowrap to support truncation */
}

.gantt-title-wrapper {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  max-width: 100%;
}

.gantt-title-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.gantt-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  padding: 0 16px;
}

.gantt-slider {
  display: grid;
  grid-template-columns: 1fr 220px;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.gantt-slider input[type="range"] {
  width: 100%;
  height: 8px;
  cursor: pointer;
}

.gantt-range {
  font-size: 12px;
  color: var(--color-text-secondary);
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.gantt-container {
  position: relative;
  min-height: 200px;
}

.gantt-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 8px;
  margin-bottom: 16px;
  padding-left: 240px; /* Offset for labels */
  padding-right: 16px;
  overflow: hidden;
  font-variant-numeric: tabular-nums;
}

.gantt-tick {
  font-size: 12px;
  color: var(--color-text-secondary);
  position: relative;
  flex: 1;
  min-width: 0;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
}

.gantt-tick::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  width: 1px;
  height: 4px;
  background: var(--color-border);
  transform: translateX(-50%);
}

.gantt-body {
  --gantt-row-height: 48px;
  display: flex;
  flex-direction: column;
  gap: 0;
  max-height: clamp(320px, 60vh, 720px);
  overflow-y: auto;
  padding-right: 4px;
}

.gantt-row {
  display: flex;
  align-items: center;
  height: var(--gantt-row-height);
  padding: 8px 0;
  cursor: pointer;
  transition: background 0.3s;
  border-radius: 4px;
  box-sizing: border-box;
  border: 1px solid transparent;
}

.gantt-row:focus-visible {
  outline: 2px solid rgba(16, 185, 129, 0.6);
  outline-offset: 2px;
}

.gantt-row:hover {
  background-color: rgba(125, 125, 125, 0.1);
}

.gantt-row.is-selected {
  background-color: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.gantt-row.is-selected .gantt-bar {
  opacity: 1;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
}

.gantt-info {
  width: 240px;
  flex-shrink: 0;
  padding-right: 16px;
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.event-title {
  font-weight: 500;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-time {
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-tags-count {
  padding: 2px 6px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-size: 11px;
  color: var(--color-text-secondary);
  background: rgba(255, 255, 255, 0.04);
}

.event-summary {
  font-size: 12px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tooltip-title {
  font-weight: 600;
  margin-bottom: 2px;
}

.tooltip-time {
  font-size: 12px;
  opacity: 0.85;
  margin-bottom: 4px;
}

.tooltip-summary {
  font-size: 12px;
  opacity: 0.85;
  max-width: 260px;
}

.empty-desc {
  font-weight: 600;
}

.empty-sub {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.gantt-track-area {
  flex-grow: 1;
  position: relative;
  height: 24px;
  margin-left: 16px;
  margin-right: 16px;
}

.gantt-bar {
  position: absolute;
  height: 12px;
  top: 6px;
  background: var(--gradient-fern);
  border-radius: 6px;
  opacity: 0.8;
  transition: opacity 0.3s;
}

.gantt-row:hover .gantt-bar {
  opacity: 1;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
}

/* Detail Form */
.detail-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.detail-time {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px 16px;
  align-items: start;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.detail-value {
  font-size: 14px;
  color: var(--color-text-primary);
}

.detail-summary {
  margin-bottom: 0;
  white-space: pre-wrap;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .gantt-header {
    padding-left: 0;
    display: none; 
  }

  .gantt-toolbar {
    align-items: stretch;
  }

  .gantt-slider {
    width: 100%;
  }

  .gantt-slider input[type="range"] {
    width: 100%;
  }

  .gantt-row {
    flex-direction: column;
    align-items: stretch;
  }

  .gantt-info {
    width: 100%;
    border-right: none;
    margin-bottom: 4px;
  }

  .event-summary {
    display: none;
  }

  .gantt-track-area {
    margin: 0;
    height: 16px;
  }
}
</style>
