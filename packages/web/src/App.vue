<template>
  <main class="app">
    <header class="hero">
      <p class="eyebrow">ChronoAtlas</p>
      <h1>时间线数据的可视化与管理</h1>
      <p class="sub">将历史事件整理成可筛选、可追溯、可协作的知识底稿，并为后续地图与人物扩展做准备。</p>
      <div class="status">
        <span class="status-label">服务状态</span>
        <span :class="['status-value', status.ok ? 'ok' : 'bad']">{{ status.text }}</span>
        <span class="status-meta">API：{{ apiBase }}</span>
      </div>
    </header>

    <section class="panel">
      <div class="panel-head">
        <h2>账号与权限</h2>
        <span class="panel-tip">默认管理员：admin@chronoatlas.local / admin123</span>
      </div>
      <div v-if="user" class="auth-card">
        <div>
          <div class="auth-name">{{ user.name }}</div>
          <div class="auth-meta">{{ user.email }} · {{ user.role }}</div>
        </div>
        <button class="btn ghost" type="button" @click="logout">退出登录</button>
      </div>
      <form v-else class="grid" @submit.prevent="login">
        <label class="field">
          <span>邮箱</span>
          <input v-model="loginForm.email" type="email" placeholder="admin@chronoatlas.local" />
        </label>
        <label class="field">
          <span>密码</span>
          <input v-model="loginForm.password" type="password" placeholder="admin123" />
        </label>
        <div class="actions">
          <button class="btn" type="submit" :disabled="loading">{{ loading ? "登录中..." : "登录" }}</button>
        </div>
        <p v-if="authError" class="error">{{ authError }}</p>
      </form>
    </section>

    <section class="panel">
      <div class="panel-head">
        <h2>功能视图</h2>
        <div class="tabs">
          <button class="tab" :class="{ active: view === 'browse' }" type="button" @click="view = 'browse'">
            公开浏览
          </button>
          <button class="tab" :class="{ active: view === 'admin' }" type="button" @click="view = 'admin'">
            后台管理
          </button>
        </div>
      </div>
      <p v-if="view === 'admin' && !user" class="muted">后台管理需要先登录。</p>
    </section>

    <section v-if="view === 'browse'" class="panel">
      <div class="panel-head">
        <h2>公开浏览</h2>
        <button class="btn ghost" type="button" @click="resetFilters">重置筛选</button>
      </div>
      <form class="grid" @submit.prevent="applyFilters">
        <label class="field">
          <span>时间起点</span>
          <input v-model="filters.timeFrom" type="number" placeholder="例如 -200" />
        </label>
        <label class="field">
          <span>时间终点</span>
          <input v-model="filters.timeTo" type="number" placeholder="例如 2020" />
        </label>
        <label class="field">
          <span>关键词</span>
          <input v-model="filters.keyword" type="text" placeholder="事件标题或摘要" />
        </label>
        <label class="field">
          <span>标签</span>
          <select v-model="filters.tagIds" multiple>
            <option v-for="tag in tags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
          </select>
        </label>
        <label class="field">
          <span>分类</span>
          <select v-model="filters.categoryIds" multiple>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>
        </label>
        <div class="actions">
          <button class="btn" type="submit" :disabled="loading">{{ loading ? "加载中..." : "应用筛选" }}</button>
        </div>
      </form>
    </section>

    <section v-if="view === 'browse'" class="panel">
      <div class="panel-head">
        <h2>事件时间线</h2>
        <span class="panel-tip">共 {{ events.length }} 条</span>
      </div>
      <div v-if="loading" class="muted">正在读取事件...</div>
      <div v-else-if="events.length === 0" class="muted">暂无事件</div>
      <ul v-else class="event-list">
        <li v-for="event in events" :key="event.id" class="event-item">
          <div class="event-main">
            <h3>{{ event.title }}</h3>
            <p v-if="event.summary" class="event-summary">{{ event.summary }}</p>
            <div class="event-meta">
              <span>时间：{{ formatEventTime(event.time) }}</span>
              <span>精度：{{ event.time.precision }}</span>
            </div>
            <div class="event-tags">
              <span v-for="tag in mapTags(event.tagIds)" :key="tag" class="pill">{{ tag }}</span>
              <span v-for="cat in mapCategories(event.categoryIds)" :key="cat" class="pill ghost">{{ cat }}</span>
            </div>
          </div>
        </li>
      </ul>
    </section>

    <section v-if="view === 'admin' && user" class="panel">
      <div class="panel-head">
        <h2>后台功能</h2>
        <div class="tabs">
          <button class="tab" :class="{ active: adminTab === 'events' }" type="button" @click="adminTab = 'events'">
            事件管理
          </button>
          <button class="tab" :class="{ active: adminTab === 'taxonomy' }" type="button" @click="adminTab = 'taxonomy'">
            标签与分类
          </button>
          <button class="tab" :class="{ active: adminTab === 'import' }" type="button" @click="adminTab = 'import'">
            导入导出
          </button>
          <button class="tab" :class="{ active: adminTab === 'stats' }" type="button" @click="adminTab = 'stats'">
            统计概览
          </button>
          <button class="tab" :class="{ active: adminTab === 'users' }" type="button" @click="adminTab = 'users'">
            用户与权限
          </button>
        </div>
      </div>
      <p class="panel-tip">所有管理操作都会记录版本，必要时可恢复。</p>
    </section>

    <section v-if="view === 'admin' && !user" class="panel">
      <p class="muted">请先登录管理员账号，再进入后台管理。</p>
    </section>

    <section v-if="view === 'admin' && user && adminTab === 'events'" class="panel">
      <div class="panel-head">
        <h2>{{ isEditing ? "编辑事件" : "新增事件" }}</h2>
        <span class="panel-tip">管理事件数据与版本</span>
      </div>
      <form class="grid" @submit.prevent="submitEvent">
        <label class="field span-2">
          <span>标题</span>
          <input v-model="eventForm.title" type="text" placeholder="事件标题" />
        </label>
        <label class="field span-2">
          <span>摘要</span>
          <textarea v-model="eventForm.summary" rows="2" placeholder="简要说明"></textarea>
        </label>
        <label class="field">
          <span>起始年份</span>
          <input v-model="eventForm.startYear" type="number" placeholder="例如 -221" />
        </label>
        <label class="field">
          <span>起始月份</span>
          <input v-model="eventForm.startMonth" type="number" placeholder="1-12，可为空" />
        </label>
        <label class="field">
          <span>起始日期</span>
          <input v-model="eventForm.startDay" type="number" placeholder="1-31，可为空" />
        </label>
        <label class="field">
          <span>结束年份</span>
          <input v-model="eventForm.endYear" type="number" placeholder="可为空" />
        </label>
        <label class="field">
          <span>结束月份</span>
          <input v-model="eventForm.endMonth" type="number" placeholder="可为空" />
        </label>
        <label class="field">
          <span>结束日期</span>
          <input v-model="eventForm.endDay" type="number" placeholder="可为空" />
        </label>
        <label class="field">
          <span>时间精度</span>
          <select v-model="eventForm.precision">
            <option value="century">century</option>
            <option value="decade">decade</option>
            <option value="year">year</option>
            <option value="month">month</option>
            <option value="day">day</option>
          </select>
        </label>
        <label class="field">
          <span>模糊时间</span>
          <input v-model="eventForm.isApprox" type="checkbox" />
        </label>
        <label v-if="eventForm.isApprox" class="field">
          <span>模糊范围（年）</span>
          <input v-model="eventForm.approxRangeYears" type="number" placeholder="例如 10" />
        </label>
        <label v-if="eventForm.isApprox" class="field span-2">
          <span>模糊说明</span>
          <input v-model="eventForm.fuzzyText" type="text" placeholder="可选" />
        </label>
        <label class="field">
          <span>标签</span>
          <select v-model="eventForm.tagIds" multiple>
            <option v-for="tag in tags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
          </select>
        </label>
        <label class="field">
          <span>分类</span>
          <select v-model="eventForm.categoryIds" multiple>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>
        </label>
        <div class="actions">
          <button class="btn" type="submit" :disabled="loading">
            {{ loading ? "提交中..." : isEditing ? "保存修改" : "创建事件" }}
          </button>
          <button v-if="isEditing" class="btn ghost" type="button" @click="resetEventForm">取消编辑</button>
        </div>
        <p v-if="formError" class="error">{{ formError }}</p>
      </form>
    </section>

    <section v-if="view === 'admin' && user && adminTab === 'events'" class="panel">
      <div class="panel-head">
        <h2>事件列表</h2>
        <span class="panel-tip">共 {{ events.length }} 条</span>
      </div>
      <div v-if="loading" class="muted">正在刷新事件...</div>
      <div v-else-if="events.length === 0" class="muted">暂无事件</div>
      <ul v-else class="event-list admin-list">
        <li v-for="event in events" :key="event.id" class="event-item">
          <div class="event-main">
            <h3>{{ event.title }}</h3>
            <p v-if="event.summary" class="event-summary">{{ event.summary }}</p>
            <div class="event-meta">
              <span>时间：{{ formatEventTime(event.time) }}</span>
              <span>精度：{{ event.time.precision }}</span>
            </div>
            <div class="event-tags">
              <span v-for="tag in mapTags(event.tagIds)" :key="tag" class="pill">{{ tag }}</span>
              <span v-for="cat in mapCategories(event.categoryIds)" :key="cat" class="pill ghost">{{ cat }}</span>
            </div>
          </div>
          <div class="event-actions">
            <button class="btn ghost" type="button" @click="beginEdit(event)">编辑</button>
            <button class="btn ghost" type="button" @click="toggleVersions(event.id)">版本</button>
            <button class="btn danger" type="button" @click="removeEvent(event.id)">删除</button>
          </div>
          <div v-if="versions[event.id]" class="version-list">
            <div v-if="versions[event.id].length === 0" class="muted">暂无版本记录</div>
            <div v-for="version in versions[event.id]" :key="version.id" class="version-item">
              <div>
                <strong>{{ version.action }}</strong>
                <span class="version-time">{{ formatDateTime(version.changedAt) }}</span>
              </div>
              <button class="btn ghost" type="button" @click="restoreVersion(event.id, version.id)">恢复</button>
            </div>
          </div>
        </li>
      </ul>
    </section>

    <section v-if="view === 'admin' && user && adminTab === 'taxonomy'" class="panel">
      <div class="panel-head">
        <h2>标签与分类</h2>
        <span class="panel-tip">维护筛选维度</span>
      </div>
      <div class="split">
        <div class="card">
          <h3>标签管理</h3>
          <form class="inline-form" @submit.prevent="createTag">
            <input v-model="tagForm.name" type="text" placeholder="新标签名称" />
            <button class="btn" type="submit">新增标签</button>
          </form>
          <div v-if="tagEdit.id" class="edit-row">
            <input v-model="tagEdit.name" type="text" />
            <button class="btn" type="button" @click="saveTagEdit">保存</button>
            <button class="btn ghost" type="button" @click="cancelTagEdit">取消</button>
          </div>
          <ul class="simple-list">
            <li v-for="tag in tags" :key="tag.id">
              <span>{{ tag.name }}</span>
              <div class="list-actions">
                <button class="btn ghost" type="button" @click="startEditTag(tag)">编辑</button>
                <button class="btn danger" type="button" @click="deleteTag(tag.id)">删除</button>
              </div>
            </li>
          </ul>
        </div>
        <div class="card">
          <h3>分类管理</h3>
          <form class="inline-form" @submit.prevent="createCategory">
            <input v-model="categoryForm.name" type="text" placeholder="新分类名称" />
            <button class="btn" type="submit">新增分类</button>
          </form>
          <div v-if="categoryEdit.id" class="edit-row">
            <input v-model="categoryEdit.name" type="text" />
            <button class="btn" type="button" @click="saveCategoryEdit">保存</button>
            <button class="btn ghost" type="button" @click="cancelCategoryEdit">取消</button>
          </div>
          <ul class="simple-list">
            <li v-for="cat in categories" :key="cat.id">
              <span>{{ cat.name }}</span>
              <div class="list-actions">
                <button class="btn ghost" type="button" @click="startEditCategory(cat)">编辑</button>
                <button class="btn danger" type="button" @click="deleteCategory(cat.id)">删除</button>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section v-if="view === 'admin' && user && adminTab === 'import'" class="panel">
      <div class="panel-head">
        <h2>导入与导出</h2>
        <span class="panel-tip">支持 JSON 格式</span>
      </div>
      <div class="split">
        <div class="card">
          <h3>导出事件</h3>
          <button class="btn" type="button" @click="exportEvents">生成导出数据</button>
          <textarea v-model="exportText" rows="10" readonly placeholder="导出内容会显示在这里"></textarea>
        </div>
        <div class="card">
          <h3>导入事件</h3>
          <label class="field">
            <span>导入模式</span>
            <select v-model="importMode">
              <option value="merge">merge（合并）</option>
              <option value="replace">replace（替换）</option>
            </select>
          </label>
          <textarea v-model="importText" rows="10" placeholder="粘贴事件 JSON"></textarea>
          <button class="btn" type="button" @click="importEvents">开始导入</button>
          <p v-if="importError" class="error">{{ importError }}</p>
        </div>
      </div>
    </section>

    <section v-if="view === 'admin' && user && adminTab === 'stats'" class="panel">
      <div class="panel-head">
        <h2>统计概览</h2>
        <button class="btn ghost" type="button" @click="loadStats">刷新统计</button>
      </div>
      <div v-if="!stats" class="muted">暂无统计数据</div>
      <div v-else class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">事件总数</div>
          <div class="stat-value">{{ stats.total }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">年份范围</div>
          <div class="stat-value">
            {{ stats.years.min ?? "-" }} ~ {{ stats.years.max ?? "-" }}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">标签分布</div>
          <ul class="stat-list">
            <li v-for="tag in stats.tags" :key="tag.id">{{ tag.name }}：{{ tag.count }}</li>
          </ul>
        </div>
        <div class="stat-card">
          <div class="stat-label">分类分布</div>
          <ul class="stat-list">
            <li v-for="cat in stats.categories" :key="cat.id">{{ cat.name }}：{{ cat.count }}</li>
          </ul>
        </div>
      </div>
    </section>

    <section v-if="view === 'admin' && user && adminTab === 'users'" class="panel">
      <div class="panel-head">
        <h2>用户列表与权限</h2>
        <button class="btn ghost" type="button" @click="loadUsers">刷新列表</button>
      </div>
      <p class="panel-tip">管理员可以管理全部数据，编辑者只能新增和修改事件。</p>
      <p v-if="userError" class="error">{{ userError }}</p>
      <ul v-if="users.length > 0" class="simple-list">
        <li v-for="item in users" :key="item.id">
          <span>{{ item.name }}（{{ item.email }}）</span>
          <span class="pill ghost">{{ item.role }}</span>
        </li>
      </ul>
      <div v-else-if="!userError" class="muted">暂无用户数据</div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";

type TagItem = { id: string; name: string; parentId?: string | null };

type CategoryItem = { id: string; name: string; parentId?: string | null };

type EventTimePoint = { year: number; month?: number; day?: number };

type EventFuzzy = {
  isApprox: boolean;
  approxRangeYears?: number;
  displayText?: string;
};

type EventTime = {
  start: EventTimePoint;
  end?: EventTimePoint;
  precision: string;
  fuzzy?: EventFuzzy;
};

type EventItem = {
  id: string;
  title: string;
  summary?: string;
  time: EventTime;
  tagIds: string[];
  categoryIds: string[];
  createdAt: string;
  updatedAt: string;
};

type UserRole = "super_admin" | "account_admin" | "content_admin" | "content_editor";

type UserInfo = { id: string; name: string; email: string; role: UserRole };

type EventVersion = {
  id: string;
  action: string;
  changedAt: string;
  changedBy?: string;
  note?: string;
  snapshot: EventItem;
};

type Stats = {
  total: number;
  years: { min: number | null; max: number | null };
  tags: { id: string; name: string; count: number }[];
  categories: { id: string; name: string; count: number }[];
};

type EventDraft = {
  title: string;
  summary?: string;
  time: EventTime;
  tagIds: string[];
  categoryIds: string[];
};

type EventApproval = {
  id: string;
  action: "create" | "update" | "delete";
  eventId?: string;
  draft?: EventDraft;
  snapshot?: EventItem;
  requestedAt: string;
  requestedBy?: string;
  requestedByName?: string;
  status: "pending" | "approved" | "rejected";
  decidedBy?: string;
  decidedAt?: string;
  note?: string;
  resultEventId?: string;
};

const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:3000";
const tokenKey = "chronoatlas_token";

const status = reactive({
  ok: false,
  text: "未检测"
});

const view = ref<"browse" | "admin">("browse");
const adminTab = ref<"events" | "taxonomy" | "import" | "stats" | "users">("events");

const token = ref(localStorage.getItem(tokenKey) || "");
const user = ref<UserInfo | null>(null);
const loading = ref(false);
const authError = ref("");
const formError = ref("");
const formNotice = ref("");
const importError = ref("");

const loginForm = reactive({
  email: "",
  password: ""
});

const filters = reactive({
  timeFrom: "" as string | number,
  timeTo: "" as string | number,
  keyword: "",
  tagIds: [] as string[],
  categoryIds: [] as string[]
});

const eventForm = reactive({
  id: "",
  title: "",
  summary: "",
  startYear: "" as string | number,
  startMonth: "" as string | number,
  startDay: "" as string | number,
  endYear: "" as string | number,
  endMonth: "" as string | number,
  endDay: "" as string | number,
  precision: "year",
  isApprox: false,
  approxRangeYears: "" as string | number,
  fuzzyText: "",
  tagIds: [] as string[],
  categoryIds: [] as string[]
});

const events = ref<EventItem[]>([]);
const tags = ref<TagItem[]>([]);
const categories = ref<CategoryItem[]>([]);
const versions = reactive<Record<string, EventVersion[]>>({});
const stats = ref<Stats | null>(null);
const users = ref<UserInfo[]>([]);
const userError = ref("");
const approvals = ref<EventApproval[]>([]);
const approvalError = ref("");

const tagForm = reactive({ name: "" });
const tagEdit = reactive({ id: "", name: "" });
const categoryForm = reactive({ name: "" });
const categoryEdit = reactive({ id: "", name: "" });
const userForm = reactive({
  name: "",
  email: "",
  password: "",
  role: "content_editor" as UserRole
});
const userEdit = reactive({
  id: "",
  name: "",
  email: "",
  password: "",
  role: "content_editor" as UserRole
});

const exportText = ref("");
const importText = ref("");
const importMode = ref<"merge" | "replace">("merge");

const isEditing = computed(() => eventForm.id !== "");
const canManageAccounts = computed(
  () => user.value?.role === "super_admin" || user.value?.role === "account_admin"
);
const canManageContent = computed(
  () => user.value?.role === "super_admin" || user.value?.role === "content_admin"
);
const canWriteContent = computed(() =>
  ["super_admin", "content_admin", "content_editor"].includes(user.value?.role ?? "")
);
const canApproveContent = computed(
  () => user.value?.role === "super_admin" || user.value?.role === "content_admin"
);
const isContentEditorRole = computed(() => user.value?.role === "content_editor");

const roleLabels: Record<UserRole, string> = {
  super_admin: "超级管理员",
  account_admin: "账号管理员",
  content_admin: "内容管理员",
  content_editor: "内容编辑"
};

const saveToken = (value: string) => {
  token.value = value;
  if (value) {
    localStorage.setItem(tokenKey, value);
  } else {
    localStorage.removeItem(tokenKey);
  }
};

const clearAuth = () => {
  saveToken("");
  user.value = null;
  users.value = [];
  userError.value = "";
  approvals.value = [];
  approvalError.value = "";
};

const request = async (path: string, options: RequestInit = {}, useAuth = false) => {
  const headers = new Headers(options.headers || {});
  if (useAuth && token.value) {
    headers.set("Authorization", `Bearer ${token.value}`);
  }
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${apiBase.replace(/\/$/, "")}${path}`, { ...options, headers });
  if (response.status === 401) {
    clearAuth();
    throw new Error("需要登录");
  }
  if (!response.ok) {
    let message = `请求失败（${response.status}）`;
    try {
      const err = await response.json();
      if (err?.message) {
        message = err.message as string;
      }
    } catch (error) {
      // ignore
    }
    throw new Error(message);
  }
  if (response.status === 204) {
    return null;
  }
  return (await response.json()) as any;
};

const loadStatus = async () => {
  try {
    await request("/health");
    status.ok = true;
    status.text = "正常";
  } catch (error) {
    status.ok = false;
    status.text = error instanceof Error ? error.message : "服务异常";
  }
};

const loadProfile = async () => {
  if (!token.value) {
    return;
  }
  try {
    const data = await request("/auth/me", {}, true);
    user.value = data.user as UserInfo;
  } catch (error) {
    clearAuth();
  }
};

const login = async () => {
  authError.value = "";
  loading.value = true;
  try {
    const data = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: loginForm.email, password: loginForm.password })
    });
    saveToken(data.token);
    user.value = data.user as UserInfo;
    view.value = "admin";
    adminTab.value = "events";
    await loadStats();
  } catch (error) {
    authError.value = error instanceof Error ? error.message : "登录失败";
  } finally {
    loading.value = false;
  }
};

const logout = async () => {
  loading.value = true;
  try {
    await request("/auth/logout", { method: "POST" }, true);
  } catch (error) {
    // ignore
  } finally {
    clearAuth();
    loading.value = false;
  }
};

const loadTags = async () => {
  const data = await request("/tags");
  tags.value = data.items;
};

const loadCategories = async () => {
  const data = await request("/categories");
  categories.value = data.items;
};

const buildQuery = () => {
  const params = new URLSearchParams();
  if (filters.timeFrom !== "") {
    params.set("timeFrom", String(filters.timeFrom));
  }
  if (filters.timeTo !== "") {
    params.set("timeTo", String(filters.timeTo));
  }
  if (filters.tagIds.length > 0) {
    params.set("tagIds", filters.tagIds.join(","));
  }
  if (filters.categoryIds.length > 0) {
    params.set("categoryIds", filters.categoryIds.join(","));
  }
  if (filters.keyword.trim()) {
    params.set("keyword", filters.keyword.trim());
  }
  const query = params.toString();
  return query ? `?${query}` : "";
};

const loadEvents = async () => {
  loading.value = true;
  try {
    const data = await request(`/events${buildQuery()}`);
    events.value = data.items as EventItem[];
    status.ok = true;
    status.text = "正常";
  } catch (error) {
    status.ok = false;
    status.text = error instanceof Error ? error.message : "加载失败";
  } finally {
    loading.value = false;
  }
};

const applyFilters = async () => {
  await loadEvents();
};

const resetFilters = async () => {
  filters.timeFrom = "";
  filters.timeTo = "";
  filters.keyword = "";
  filters.tagIds = [];
  filters.categoryIds = [];
  await loadEvents();
};

const parseIntField = (value: string | number) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const num = Number(value);
  return Number.isInteger(num) ? num : null;
};

const resetEventForm = () => {
  eventForm.id = "";
  eventForm.title = "";
  eventForm.summary = "";
  eventForm.startYear = "";
  eventForm.startMonth = "";
  eventForm.startDay = "";
  eventForm.endYear = "";
  eventForm.endMonth = "";
  eventForm.endDay = "";
  eventForm.precision = "year";
  eventForm.isApprox = false;
  eventForm.approxRangeYears = "";
  eventForm.fuzzyText = "";
  eventForm.tagIds = [];
  eventForm.categoryIds = [];
  formError.value = "";
  formNotice.value = "";
};

const submitEvent = async () => {
  formError.value = "";
  formNotice.value = "";
  const startYear = parseIntField(eventForm.startYear);
  const startMonth = parseIntField(eventForm.startMonth);
  const startDay = parseIntField(eventForm.startDay);
  const endYear = parseIntField(eventForm.endYear);
  const endMonth = parseIntField(eventForm.endMonth);
  const endDay = parseIntField(eventForm.endDay);
  const approxRangeYears = parseIntField(eventForm.approxRangeYears);

  if (!eventForm.title.trim()) {
    formError.value = "请填写事件标题";
    return;
  }
  if (startYear == null) {
    formError.value = "起始年份必须是整数";
    return;
  }
  if (startMonth != null && (startMonth < 1 || startMonth > 12)) {
    formError.value = "起始月份需要在 1-12 之间";
    return;
  }
  if (startDay != null && (startDay < 1 || startDay > 31)) {
    formError.value = "起始日期需要在 1-31 之间";
    return;
  }
  if (startDay != null && startMonth == null) {
    formError.value = "填写起始日期前需要先填写起始月份";
    return;
  }
  if (endYear != null && endYear < startYear) {
    formError.value = "结束年份不能小于起始年份";
    return;
  }
  if (endYear == null && (endMonth != null || endDay != null)) {
    formError.value = "填写结束月份/日期前需要先填写结束年份";
    return;
  }
  if (endMonth != null && (endMonth < 1 || endMonth > 12)) {
    formError.value = "结束月份需要在 1-12 之间";
    return;
  }
  if (endDay != null && (endDay < 1 || endDay > 31)) {
    formError.value = "结束日期需要在 1-31 之间";
    return;
  }
  if (endDay != null && endMonth == null) {
    formError.value = "填写结束日期前需要先填写结束月份";
    return;
  }
  if ((eventForm.precision === "month" || eventForm.precision === "day") && startMonth == null) {
    formError.value = "精度为月或日时，需要填写起始月份";
    return;
  }
  if (eventForm.precision === "day" && startDay == null) {
    formError.value = "精度为日时，需要填写起始日期";
    return;
  }
  if (eventForm.isApprox && (approxRangeYears == null || approxRangeYears <= 0)) {
    formError.value = "模糊范围需要填写大于 0 的整数";
    return;
  }

  const startTime: EventTimePoint = {
    year: startYear,
    ...(startMonth != null ? { month: startMonth } : {}),
    ...(startDay != null ? { day: startDay } : {})
  };
  const time: EventTime = {
    start: startTime,
    precision: eventForm.precision,
    fuzzy: { isApprox: false }
  };
  if (endYear != null) {
    const endTime: EventTimePoint = {
      year: endYear,
      ...(endMonth != null ? { month: endMonth } : {}),
      ...(endDay != null ? { day: endDay } : {})
    };
    time.end = endTime;
  }
  if (eventForm.isApprox) {
    time.fuzzy = {
      isApprox: true,
      ...(approxRangeYears != null ? { approxRangeYears } : {}),
      ...(eventForm.fuzzyText.trim() ? { displayText: eventForm.fuzzyText.trim() } : {})
    };
  }

  const payload = {
    title: eventForm.title.trim(),
    summary: eventForm.summary.trim(),
    time,
    tagIds: eventForm.tagIds,
    categoryIds: eventForm.categoryIds
  };

  loading.value = true;
  try {
    let result: any = null;
    if (eventForm.id) {
      result = await request(
        `/events/${eventForm.id}`,
        {
        method: "PATCH",
        body: JSON.stringify(payload)
        },
        true
      );
    } else {
      result = await request(
        "/events",
        {
        method: "POST",
        body: JSON.stringify(payload)
        },
        true
      );
    }
    resetEventForm();
    await loadEvents();
    await loadStats();
    if (result?.pending) {
      formNotice.value = "已提交审核，等待内容管理员审批";
    } else {
      formNotice.value = "操作已保存";
    }
  } catch (error) {
    formError.value = error instanceof Error ? error.message : "提交失败";
  } finally {
    loading.value = false;
  }
};

const beginEdit = (event: EventItem) => {
  eventForm.id = event.id;
  eventForm.title = event.title;
  eventForm.summary = event.summary ?? "";
  eventForm.startYear = event.time.start.year;
  eventForm.startMonth = event.time.start.month ?? "";
  eventForm.startDay = event.time.start.day ?? "";
  eventForm.endYear = event.time.end?.year ?? "";
  eventForm.endMonth = event.time.end?.month ?? "";
  eventForm.endDay = event.time.end?.day ?? "";
  eventForm.precision = event.time.precision;
  eventForm.isApprox = event.time.fuzzy?.isApprox ?? false;
  eventForm.approxRangeYears = event.time.fuzzy?.approxRangeYears ?? "";
  eventForm.fuzzyText = event.time.fuzzy?.displayText ?? "";
  eventForm.tagIds = [...event.tagIds];
  eventForm.categoryIds = [...event.categoryIds];
};

const removeEvent = async (id: string) => {
  if (!confirm("确定要删除该事件吗？")) {
    return;
  }
  loading.value = true;
  try {
    const result = await request(`/events/${id}`, { method: "DELETE" }, true);
    await loadEvents();
    await loadStats();
    if (result?.pending) {
      status.ok = true;
      status.text = "删除申请已提交，等待审批";
    } else {
      status.ok = true;
      status.text = "已删除";
    }
  } catch (error) {
    status.ok = false;
    status.text = error instanceof Error ? error.message : "删除失败";
  } finally {
    loading.value = false;
  }
};

const loadVersions = async (eventId: string) => {
  const data = await request(`/events/${eventId}/versions`);
  versions[eventId] = data.items as EventVersion[];
};

const toggleVersions = async (eventId: string) => {
  if (versions[eventId]) {
    delete versions[eventId];
    return;
  }
  await loadVersions(eventId);
};

const restoreVersion = async (eventId: string, versionId: string) => {
  if (!confirm("确定要恢复该版本吗？")) {
    return;
  }
  await request(`/events/${eventId}/restore`, {
    method: "POST",
    body: JSON.stringify({ versionId })
  }, true);
  await loadEvents();
  await loadVersions(eventId);
};

const createTag = async () => {
  if (!tagForm.name.trim()) {
    return;
  }
  await request("/tags", {
    method: "POST",
    body: JSON.stringify({ name: tagForm.name.trim() })
  }, true);
  tagForm.name = "";
  await loadTags();
};

const startEditTag = (tag: TagItem) => {
  tagEdit.id = tag.id;
  tagEdit.name = tag.name;
};

const saveTagEdit = async () => {
  if (!tagEdit.id || !tagEdit.name.trim()) {
    return;
  }
  await request(`/tags/${tagEdit.id}`, {
    method: "PATCH",
    body: JSON.stringify({ name: tagEdit.name.trim() })
  }, true);
  tagEdit.id = "";
  tagEdit.name = "";
  await loadTags();
};

const cancelTagEdit = () => {
  tagEdit.id = "";
  tagEdit.name = "";
};

const deleteTag = async (id: string) => {
  if (!confirm("确定要删除该标签吗？")) {
    return;
  }
  await request(`/tags/${id}`, { method: "DELETE" }, true);
  await Promise.all([loadTags(), loadEvents(), loadStats()]);
};

const createCategory = async () => {
  if (!categoryForm.name.trim()) {
    return;
  }
  await request("/categories", {
    method: "POST",
    body: JSON.stringify({ name: categoryForm.name.trim() })
  }, true);
  categoryForm.name = "";
  await loadCategories();
};

const startEditCategory = (cat: CategoryItem) => {
  categoryEdit.id = cat.id;
  categoryEdit.name = cat.name;
};

const saveCategoryEdit = async () => {
  if (!categoryEdit.id || !categoryEdit.name.trim()) {
    return;
  }
  await request(`/categories/${categoryEdit.id}`, {
    method: "PATCH",
    body: JSON.stringify({ name: categoryEdit.name.trim() })
  }, true);
  categoryEdit.id = "";
  categoryEdit.name = "";
  await loadCategories();
};

const cancelCategoryEdit = () => {
  categoryEdit.id = "";
  categoryEdit.name = "";
};

const deleteCategory = async (id: string) => {
  if (!confirm("确定要删除该分类吗？")) {
    return;
  }
  await request(`/categories/${id}`, { method: "DELETE" }, true);
  await Promise.all([loadCategories(), loadEvents(), loadStats()]);
};

const exportEvents = async () => {
  const data = await request("/export/events");
  exportText.value = JSON.stringify(data, null, 2);
};

const importEvents = async () => {
  importError.value = "";
  if (!importText.value.trim()) {
    importError.value = "请粘贴要导入的 JSON";
    return;
  }
  try {
    const parsed = JSON.parse(importText.value);
    const items = Array.isArray(parsed) ? parsed : parsed.items;
    if (!Array.isArray(items)) {
      importError.value = "JSON 必须是数组或包含 items 数组";
      return;
    }
    await request("/import/events", {
      method: "POST",
      body: JSON.stringify({ mode: importMode.value, items })
    }, true);
    await loadEvents();
    await loadStats();
  } catch (error) {
    importError.value = error instanceof Error ? error.message : "导入失败";
  }
};

const loadUsers = async () => {
  userError.value = "";
  users.value = [];
  if (!user.value) {
    return;
  }
  if (!canManageAccounts.value) {
    userError.value = "当前账号没有权限查看用户列表";
    return;
  }
  try {
    const data = await request("/users", {}, true);
    users.value = data.items as UserInfo[];
  } catch (error) {
    userError.value = error instanceof Error ? error.message : "用户列表加载失败";
  }
};

const resetUserForm = () => {
  userForm.name = "";
  userForm.email = "";
  userForm.password = "";
  userForm.role = "content_editor";
};

const resetUserEdit = () => {
  userEdit.id = "";
  userEdit.name = "";
  userEdit.email = "";
  userEdit.password = "";
  userEdit.role = "content_editor";
};

const createUser = async () => {
  userError.value = "";
  if (!canManageAccounts.value) {
    userError.value = "当前账号没有账号管理权限";
    return;
  }
  if (!userForm.name.trim() || !userForm.email.trim() || !userForm.password.trim()) {
    userError.value = "请完整填写用户名、邮箱和密码";
    return;
  }
  try {
    await request(
      "/users",
      {
        method: "POST",
        body: JSON.stringify({
          name: userForm.name.trim(),
          email: userForm.email.trim(),
          password: userForm.password,
          role: userForm.role
        })
      },
      true
    );
    resetUserForm();
    await loadUsers();
  } catch (error) {
    userError.value = error instanceof Error ? error.message : "创建用户失败";
  }
};

const startEditUser = (item: UserInfo) => {
  userEdit.id = item.id;
  userEdit.name = item.name;
  userEdit.email = item.email;
  userEdit.role = item.role;
  userEdit.password = "";
};

const saveUserEdit = async () => {
  userError.value = "";
  if (!userEdit.id) {
    return;
  }
  if (!userEdit.name.trim() || !userEdit.email.trim()) {
    userError.value = "请完整填写用户名和邮箱";
    return;
  }
  try {
    const payload: Record<string, string> = {
      name: userEdit.name.trim(),
      email: userEdit.email.trim(),
      role: userEdit.role
    };
    if (userEdit.password.trim()) {
      payload.password = userEdit.password;
    }
    await request(
      `/users/${userEdit.id}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload)
      },
      true
    );
    resetUserEdit();
    await loadUsers();
  } catch (error) {
    userError.value = error instanceof Error ? error.message : "保存用户失败";
  }
};

const cancelUserEdit = () => {
  resetUserEdit();
};

const deleteUser = async (id: string) => {
  userError.value = "";
  if (!confirm("确定要删除该账号吗？")) {
    return;
  }
  try {
    await request(`/users/${id}`, { method: "DELETE" }, true);
    await loadUsers();
  } catch (error) {
    userError.value = error instanceof Error ? error.message : "删除用户失败";
  }
};

const loadApprovals = async () => {
  approvalError.value = "";
  approvals.value = [];
  if (!user.value || !canApproveContent.value) {
    return;
  }
  try {
    const data = await request("/events/approvals?status=pending", {}, true);
    approvals.value = data.items as EventApproval[];
  } catch (error) {
    approvalError.value = error instanceof Error ? error.message : "审批列表加载失败";
  }
};

const approveEventChange = async (id: string) => {
  approvalError.value = "";
  if (!confirm("确定通过该审批吗？")) {
    return;
  }
  try {
    await request(`/events/approvals/${id}/approve`, { method: "POST", body: "{}" }, true);
    await Promise.all([loadApprovals(), loadEvents(), loadStats()]);
  } catch (error) {
    approvalError.value = error instanceof Error ? error.message : "审批失败";
  }
};

const rejectEventChange = async (id: string) => {
  approvalError.value = "";
  if (!confirm("确定拒绝该审批吗？")) {
    return;
  }
  try {
    await request(`/events/approvals/${id}/reject`, { method: "POST", body: "{}" }, true);
    await loadApprovals();
  } catch (error) {
    approvalError.value = error instanceof Error ? error.message : "拒绝失败";
  }
};

const loadStats = async () => {
  try {
    const data = await request("/events/aggregations");
    stats.value = data as Stats;
  } catch (error) {
    stats.value = null;
  }
};

const formatTimePoint = (point: EventTimePoint) => {
  const parts = [formatYear(point.year)];
  if (point.month != null) {
    parts.push(`${point.month} 月`);
  }
  if (point.day != null) {
    parts.push(`${point.day} 日`);
  }
  return parts.join(" ");
};

const formatEventTime = (time: EventTime) => {
  const base = time.end ? `${formatTimePoint(time.start)} ~ ${formatTimePoint(time.end)}` : formatTimePoint(time.start);
  if (!time.fuzzy?.isApprox) {
    return base;
  }
  const rangeText = time.fuzzy.approxRangeYears ? ` ±${time.fuzzy.approxRangeYears} 年` : "";
  const noteText = time.fuzzy.displayText ? `（${time.fuzzy.displayText}）` : "";
  return `约 ${base}${rangeText}${noteText}`;
};

const formatYear = (year: number) => {
  if (year <= 0) {
    return `公元前 ${Math.abs(year - 1)} 年`;
  }
  return `${year} 年`;
};

const formatDateTime = (value: string) => {
  return new Date(value).toLocaleString();
};

const formatRole = (role: UserRole) => {
  return roleLabels[role] || role;
};

const approvalActionLabel = (action: EventApproval["action"]) => {
  if (action === "create") {
    return "新增";
  }
  if (action === "update") {
    return "修改";
  }
  if (action === "delete") {
    return "删除";
  }
  return action;
};

const approvalTitle = (approval: EventApproval) => {
  return approval.draft?.title || approval.snapshot?.title || "未命名事件";
};

const mapTags = (ids: string[]) => {
  return ids.map((id) => tags.value.find((tag) => tag.id === id)?.name || id);
};

const mapCategories = (ids: string[]) => {
  return ids.map((id) => categories.value.find((cat) => cat.id === id)?.name || id);
};

watch([adminTab, user], async ([tab, currentUser]) => {
  if (tab === "users" && currentUser) {
    await loadUsers();
  }
  if (tab === "events" && currentUser) {
    await loadApprovals();
  }
});

onMounted(async () => {
  await loadStatus();
  await Promise.all([loadTags(), loadCategories()]);
  await loadEvents();
  await loadProfile();
  if (user.value) {
    await loadStats();
  }
});
</script>
