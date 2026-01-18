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

      <a-form layout="vertical" @finish="handleApply">
        <a-row :gutter="[16, 16]">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="时间起点">
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
            <a-form-item label="时间终点">
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
            <a-form-item label="关键词">
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
            <a-form-item label="标签">
              <a-select
                v-model:value="filters.tagIds"
                mode="multiple"
                placeholder="选择标签"
                allow-clear
                :options="tags.map(t => ({ label: t.name, value: t.id }))"
              >
                <template #suffixIcon><tag-outlined /></template>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="分类">
              <a-select
                v-model:value="filters.categoryIds"
                mode="multiple"
                placeholder="选择分类"
                allow-clear
                :options="categories.map(c => ({ label: c.name, value: c.id }))"
              >
                <template #suffixIcon><appstore-outlined /></template>
              </a-select>
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
      <template #title>
        <span class="card-title"><bar-chart-outlined /> 甘特图视图</span>
      </template>
      <template #extra>
        <a-tag color="blue">共 {{ events.length }} 条事件</a-tag>
      </template>

      <a-spin :spinning="loading" tip="正在加载事件数据...">
        <a-empty v-if="!loading && events.length === 0" description="暂无符合条件的事件" />
        
        <div v-else class="gantt-container">
          <div class="gantt-header">
            <div v-for="tick in yearTicks" :key="tick" class="gantt-tick">
              {{ formatYear(tick) }}
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
                <div class="event-time">{{ formatEventTime(event.time) }}</div>
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
          <a-form-item label="分类">
            <a-input
              :value="mapCategories(selectedEvent.categoryIds).join('、') || '无'"
              readonly
            />
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
import { computed, onMounted, onUnmounted, ref } from "vue";
import {
  ReloadOutlined,
  SearchOutlined,
  CalendarOutlined,
  TagOutlined,
  AppstoreOutlined,
  FilterOutlined,
  BarChartOutlined
} from '@ant-design/icons-vue';
import { EventItem, useAppStore } from "../store/appStore";

const {
  filters,
  events,
  tags,
  categories,
  loadTags,
  loadCategories,
  loadEvents,
  resetFilters,
  formatYear,
  formatEventTime,
  mapTags,
  mapCategories
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

const toNumber = (value: string | number) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const rangeMin = computed(() => {
  const from = toNumber(filters.timeFrom);
  if (from != null) return from;
  if (events.value.length === 0) return 0;
  return Math.min(...events.value.map((event) => event.time.start.year));
});

const rangeMax = computed(() => {
  const to = toNumber(filters.timeTo);
  if (to != null) return to;
  if (events.value.length === 0) return 0;
  return Math.max(
    ...events.value.map((event) => event.time.end?.year ?? event.time.start.year)
  );
});

const rangeSpan = computed(() => {
  const span = rangeMax.value - rangeMin.value;
  return span === 0 ? 1 : span;
});

const yearTicks = computed(() => {
  if (events.value.length === 0) return [];
  const step = Math.max(1, Math.round(rangeSpan.value / 5));
  return Array.from({ length: 6 }, (_, idx) => rangeMin.value + step * idx);
});

const calcBarStyle = (event: EventItem) => {
  const start = event.time.start.year;
  const end = event.time.end?.year ?? start;
  const safeStart = Math.max(Math.min(start, rangeMax.value), rangeMin.value);
  const safeEnd = Math.max(Math.min(end, rangeMax.value), rangeMin.value);
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
  await Promise.all([loadTags(), loadCategories()]);
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

/* Gantt Chart */
.gantt-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.gantt-container {
  position: relative;
  min-height: 200px;
}

.gantt-header {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 8px;
  margin-bottom: 16px;
  padding-left: 200px; /* Offset for labels */
}

.gantt-tick {
  font-size: 12px;
  color: var(--color-text-secondary);
  position: relative;
  transform: translateX(50%);
}

.gantt-tick::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  width: 1px;
  height: 4px;
  background: var(--color-border);
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

.event-time {
  font-size: 12px;
  color: var(--color-text-secondary);
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
