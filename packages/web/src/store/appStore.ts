import { computed, reactive, ref } from "vue";

export type TagItem = { id: string; name: string; parentId?: string | null };

export type CategoryItem = { id: string; name: string; parentId?: string | null };

export type EventTimePoint = { year: number; month?: number; day?: number };

export type EventFuzzy = {
  isApprox: boolean;
  approxRangeYears?: number;
  displayText?: string;
};

export type EventTime = {
  start: EventTimePoint;
  end?: EventTimePoint;
  precision: string;
  fuzzy?: EventFuzzy;
};

export type EventItem = {
  id: string;
  title: string;
  summary?: string;
  time: EventTime;
  tagIds: string[];
  categoryIds: string[];
  tags?: TagItem[];
  categories?: CategoryItem[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
};

export type UserRole = "super_admin" | "account_admin" | "content_admin" | "content_editor";

export type UserProfile = {
  phone?: string;
  title?: string;
  organization?: string;
  location?: string;
  bio?: string;
};

export type UserInfo = { id: string; name: string; email: string; role: UserRole; profile?: UserProfile };

export type EventVersion = {
  id: string;
  action: string;
  changedAt: string;
  changedBy?: string;
  note?: string;
  snapshot: EventItem;
};

export type Stats = {
  total: number;
  years: { min: number | null; max: number | null };
  tags: { id: string; name: string; count: number }[];
  categories: { id: string; name: string; count: number }[];
};

export type EventDraft = {
  title: string;
  summary?: string;
  time: EventTime;
  tagIds: string[];
  categoryIds: string[];
};

export type EventApproval = {
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

const token = ref(localStorage.getItem(tokenKey) || "");
const user = ref<UserInfo | null>(null);

const tags = ref<TagItem[]>([]);
const categories = ref<CategoryItem[]>([]);
const events = ref<EventItem[]>([]);
const versions = reactive<Record<string, EventVersion[]>>({});
const stats = ref<Stats | null>(null);
const users = ref<UserInfo[]>([]);
const approvals = ref<EventApproval[]>([]);

const filters = reactive({
  timeFrom: "" as string | number,
  timeTo: "" as string | number,
  keyword: "",
  tagIds: [] as string[],
  categoryIds: [] as string[]
});

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
  approvals.value = [];
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

const login = async (email: string, password: string) => {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  saveToken(data.token);
  user.value = data.user as UserInfo;
  return data as { token: string; user: UserInfo; expiresAt: string };
};

const logout = async () => {
  try {
    await request("/auth/logout", { method: "POST" }, true);
  } catch (error) {
    // ignore
  } finally {
    clearAuth();
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
  const data = await request(`/events${buildQuery()}`);
  events.value = data.items as EventItem[];
};

const resetFilters = () => {
  filters.timeFrom = "";
  filters.timeTo = "";
  filters.keyword = "";
  filters.tagIds = [];
  filters.categoryIds = [];
};

const createEvent = async (payload: EventDraft) => {
  return await request(
    "/events",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    true
  );
};

const updateEvent = async (id: string, payload: EventDraft) => {
  return await request(
    `/events/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    },
    true
  );
};

const deleteEvent = async (id: string) => {
  return await request(`/events/${id}`, { method: "DELETE" }, true);
};

const loadVersions = async (eventId: string) => {
  const data = await request(`/events/${eventId}/versions`);
  versions[eventId] = data.items as EventVersion[];
};

const restoreVersion = async (eventId: string, versionId: string) => {
  return await request(
    `/events/${eventId}/restore`,
    {
      method: "POST",
      body: JSON.stringify({ versionId })
    },
    true
  );
};

const loadStats = async () => {
  try {
    const data = await request("/events/aggregations");
    stats.value = data as Stats;
  } catch (error) {
    stats.value = null;
  }
};

const exportEvents = async () => {
  return await request("/export/events");
};

const importEvents = async (mode: "merge" | "replace", items: EventItem[]) => {
  return await request(
    "/import/events",
    {
      method: "POST",
      body: JSON.stringify({ mode, items })
    },
    true
  );
};

const createTag = async (payload: { name: string; parentId?: string | null }) => {
  return await request(
    "/tags",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    true
  );
};

const updateTag = async (id: string, payload: { name?: string; parentId?: string | null }) => {
  return await request(
    `/tags/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    },
    true
  );
};

const deleteTag = async (id: string) => {
  return await request(`/tags/${id}`, { method: "DELETE" }, true);
};

const createCategory = async (payload: { name: string; parentId?: string | null }) => {
  return await request(
    "/categories",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    true
  );
};

const updateCategory = async (id: string, payload: { name?: string; parentId?: string | null }) => {
  return await request(
    `/categories/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    },
    true
  );
};

const deleteCategory = async (id: string) => {
  return await request(`/categories/${id}`, { method: "DELETE" }, true);
};

const loadUsers = async () => {
  const data = await request("/users", {}, true);
  users.value = data.items as UserInfo[];
};

const createUser = async (payload: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  profile?: UserProfile;
}) => {
  return await request(
    "/users",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    true
  );
};

const updateUser = async (id: string, payload: Partial<UserInfo> & { password?: string }) => {
  return await request(
    `/users/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    },
    true
  );
};

const deleteUser = async (id: string) => {
  return await request(`/users/${id}`, { method: "DELETE" }, true);
};

const loadApprovals = async () => {
  const data = await request("/events/approvals?status=pending", {}, true);
  approvals.value = data.items as EventApproval[];
};

const approveEventChange = async (id: string) => {
  return await request(`/events/approvals/${id}/approve`, { method: "POST", body: "{}" }, true);
};

const rejectEventChange = async (id: string) => {
  return await request(`/events/approvals/${id}/reject`, { method: "POST", body: "{}" }, true);
};

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

const formatYear = (year: number) => {
  if (year <= 0) {
    return `公元前 ${Math.abs(year - 1)} 年`;
  }
  return `${year} 年`;
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

const formatDateTime = (value: string) => {
  return new Date(value).toLocaleString();
};

const formatRole = (role: UserRole) => {
  return roleLabels[role] || role;
};

const mapTags = (ids: string[]) => {
  return ids.map((id) => tags.value.find((tag) => tag.id === id)?.name || id);
};

const mapCategories = (ids: string[]) => {
  return ids.map((id) => categories.value.find((cat) => cat.id === id)?.name || id);
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

export const useAppStore = () => {
  return {
    apiBase,
    status,
    token,
    user,
    tags,
    categories,
    events,
    versions,
    stats,
    users,
    approvals,
    filters,
    loadStatus,
    loadProfile,
    login,
    logout,
    loadTags,
    loadCategories,
    loadEvents,
    resetFilters,
    createEvent,
    updateEvent,
    deleteEvent,
    loadVersions,
    restoreVersion,
    loadStats,
    exportEvents,
    importEvents,
    createTag,
    updateTag,
    deleteTag,
    createCategory,
    updateCategory,
    deleteCategory,
    loadUsers,
    createUser,
    updateUser,
    deleteUser,
    loadApprovals,
    approveEventChange,
    rejectEventChange,
    canManageAccounts,
    canManageContent,
    canWriteContent,
    canApproveContent,
    isContentEditorRole,
    formatYear,
    formatEventTime,
    formatDateTime,
    formatRole,
    mapTags,
    mapCategories,
    approvalActionLabel,
    approvalTitle
  };
};
