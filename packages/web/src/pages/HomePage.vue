<template>
  <div class="page-container">
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

      <a-form layout="vertical" :model="filters" @finish="handleApply">
        <a-row :gutter="[16, 16]">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="时间起点" name="timeFrom">
              <a-input-number
                v-model:value="filters.timeFrom"
                placeholder="例如 -200"
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
                placeholder="例如 2020"
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
                placeholder="搜索事件标题或摘要"
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
                  placeholder="选择标签"
                  allow-clear
                  :options="tags.map(t => ({ label: t.name, value: t.id }))"
                  class="tag-select"
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

        <a-button type="primary" html-type="submit" :loading="loading" block size="large">
          <template #icon><search-outlined /></template>
          应用筛选
        </a-button>
      </a-form>
    </a-card>

    <!-- Gantt Chart Section -->
    <a-card class="gantt-card" :bordered="false">
      <div class="gantt-sticky">
        <div class="gantt-title-bar">
          <span class="card-title"><bar-chart-outlined /> 甘特图视图</span>
          <a-tag color="blue">共 {{ events.length }} 条事件</a-tag>
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
            />
            <span class="gantt-range">{{ ganttRangeLabel }}</span>
          </div>
        </div>
      </div>

      <a-spin :spinning="loading" tip="正在加载事件数据...">
        <a-empty v-if="!loading && events.length === 0" description="暂无符合条件的事件" />
        
        <div v-else class="gantt-container">
          <div class="gantt-header">
            <div v-for="tick in ganttTicks" :key="tick" class="gantt-tick">
              {{ formatGanttTick(tick) }}
            </div>
          </div>
          <div class="gantt-body">
            <div
              v-for="event in events"
              :key="event.id"
              class="gantt-row"
              @click="selectedEvent = event"
            >
              <div class="gantt-info">
                <div class="event-title">{{ event.title }}</div>
              </div>
              <div class="gantt-track-area">
                <a-tooltip>
                  <template #title>
                    {{ event.title }} ({{ formatEventTime(event.time) }})
                  </template>
                  <div class="gantt-bar" :style="calcBarStyle(event)"></div>
                </a-tooltip>
              </div>
            </div>
          </div>
        </div>
      </a-spin>
    </a-card>

    <!-- Event Details Drawer -->
    <a-drawer
      v-model:open="drawerVisible"
      title="事件详情"
      placement="right"
      :width="drawerWidth"
    >
      <template v-if="selectedEvent">
        <a-form layout="vertical" class="detail-form">
          <a-form-item label="标题">
            <a-input :value="selectedEvent.title" readonly />
          </a-form-item>
          <a-form-item label="时间">
            <a-input :value="formatEventTime(selectedEvent.time)" readonly />
          </a-form-item>
          <a-form-item label="精度">
            <a-input :value="selectedEvent.time.precision" readonly />
          </a-form-item>
          <a-form-item label="标签">
            <a-space size="small" wrap>
              <a-tag v-for="tag in eventTagLabels" :key="tag" color="blue">{{ tag }}</a-tag>
              <span v-if="eventTagLabels.length === 0">无</span>
            </a-space>
          </a-form-item>
          <a-form-item label="摘要">
            <a-textarea
              :value="selectedEvent.summary || '暂无摘要'"
              readonly
              :auto-size="{ minRows: 4, maxRows: 8 }"
              class="detail-textarea"
            />
          </a-form-item>
        </a-form>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import {
  ReloadOutlined,
  SearchOutlined,
  CalendarOutlined,
  TagOutlined,
  FilterOutlined,
  BarChartOutlined
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

const loading = ref(false);
const selectedEvent = ref<EventItem | null>(null);
const windowWidth = ref(window.innerWidth);

const updateWidth = () => {
  windowWidth.value = window.innerWidth;
};

onMounted(() => {
  window.addEventListener('resize', updateWidth);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateWidth);
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
const viewSpanConfig: Record<GanttView, number> = {
  year: 200,
  month: 48,
  day: 90
};

watch(ganttView, () => {
  ganttOffset.value = 0;
});

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
  try {
    await loadEvents();
    selectedEvent.value = null;
  } finally {
    loading.value = false;
  }
};

const handleReset = async () => {
  resetFilters();
  await handleApply();
};

onMounted(async () => {
  await loadTags();
  await handleApply();
});
</script>

<style scoped>
.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

/* Filter Card */
.filter-card {
  margin-bottom: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
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

.gantt-sticky {
  position: sticky;
  top: 72px;
  z-index: 5;
  background: var(--color-bg-container, #ffffff);
  padding-bottom: 12px;
  margin-bottom: 4px;
}

.gantt-title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.gantt-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
  flex-wrap: wrap;
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
  padding-left: 200px; /* Offset for labels */
  overflow: hidden;
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
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gantt-row {
  display: flex;
  align-items: center;
  padding: 8px 0;
  cursor: pointer;
  transition: background 0.3s;
  border-radius: 4px;
}

.gantt-row:hover {
  background-color: rgba(125, 125, 125, 0.1);
}

.gantt-info {
  width: 200px;
  flex-shrink: 0;
  padding-right: 16px;
  border-right: 1px solid var(--color-border);
}

.event-title {
  font-weight: 500;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
.detail-form :deep(.ant-input[readonly]),
.detail-form :deep(.ant-input-textarea textarea[readonly]) {
  cursor: default;
}

.detail-textarea {
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

  .gantt-track-area {
    margin: 0;
    height: 16px;
  }
}
</style>
