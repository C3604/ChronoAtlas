import { computed, reactive, ref } from "vue";

export type TagItem = { id: string; name: string; parentId?: string | null };
export type TagMatchMode = "any" | "all";

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
  tags?: TagItem[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
};

export type RoleName = "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "USER";

export type UserInfo = {
  id: string;
  email: string;
  displayName: string;
  roles: RoleName[];
  isActive: boolean;
  emailVerified: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
};

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
};

export type SmtpSettings = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromAddress: string;
  hasPassword: boolean;
  updatedAt: string | null;
};

export type EventDraft = {
  title: string;
  summary?: string;
  time: EventTime;
  tagIds: string[];
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
const csrfCookieName = (import.meta.env.VITE_CSRF_COOKIE_NAME as string) || "csrf_token";

const status = reactive({
  ok: false,
  text: "未检测"
});

const user = ref<UserInfo | null>(null);
const profileLoaded = ref(false);

const tags = ref<TagItem[]>([]);
const events = ref<EventItem[]>([]);
const versions = reactive<Record<string, EventVersion[]>>({});
const stats = ref<Stats | null>(null);
const users = ref<UserInfo[]>([]);
const approvals = ref<EventApproval[]>([]);
const smtpSettings = ref<SmtpSettings | null>(null);

const filters = reactive({
  timeFrom: "" as string | number,
  timeTo: "" as string | number,
  keyword: "",
  tagIds: [] as string[],
  tagMatch: "all" as TagMatchMode
});

const roleLabels: Record<RoleName, string> = {
  SUPER_ADMIN: "超级管理员",
  ADMIN: "管理员",
  EDITOR: "内容编辑",
  USER: "普通用户"
};

const pickPrimaryRole = (roles: RoleName[]) => {
  if (roles.includes("SUPER_ADMIN")) {
    return "SUPER_ADMIN";
  }
  if (roles.includes("ADMIN")) {
    return "ADMIN";
  }
  if (roles.includes("EDITOR")) {
    return "EDITOR";
  }
  return "USER";
};

const clearAuth = () => {
  user.value = null;
  users.value = [];
  approvals.value = [];
  smtpSettings.value = null;
  profileLoaded.value = false;
};

const readCookie = (name: string) => {
  if (typeof document === "undefined") {
    return "";
  }
  const target = `${name}=`;
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(target)) {
      return decodeURIComponent(trimmed.slice(target.length));
    }
  }
  return "";
};

const shouldAttachCsrf = (method: string) => {
  return !["GET", "HEAD", "OPTIONS"].includes(method);
};

const refreshExcluded = new Set([
  "/auth/login",
  "/auth/refresh",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email"
]);

let refreshPromise: Promise<void> | null = null;

const refreshSession = async () => {
  if (refreshPromise) {
    return refreshPromise;
  }
  refreshPromise = (async () => {
    await request(
      "/auth/refresh",
      {
        method: "POST",
        body: "{}"
      },
      { skipRefresh: true }
    );
    await loadProfile();
  })()
    .catch(() => {
      clearAuth();
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
};

const request = async (
  path: string,
  options: RequestInit = {},
  config: { skipRefresh?: boolean } = {}
) => {
  const headers = new Headers(options.headers || {});
  const method = (options.method || "GET").toUpperCase();
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (shouldAttachCsrf(method)) {
    const csrfToken = readCookie(csrfCookieName);
    if (csrfToken) {
      headers.set("X-CSRF-Token", csrfToken);
    }
  }
  const response = await fetch(`${apiBase.replace(/\/$/, "")}${path}`, {
    ...options,
    headers,
    credentials: "include"
  });

  if (
    response.status === 401 &&
    !config.skipRefresh &&
    !refreshExcluded.has(path)
  ) {
    await refreshSession();
    return request(path, options, { skipRefresh: true });
  }

  if (response.status === 204) {
    return null;
  }

  let payload: any = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.message || `请求失败（${response.status}）`;
    throw new Error(message);
  }

  if (payload?.code && payload.code !== "OK") {
    throw new Error(payload.message || "请求失败");
  }

  return payload?.data ?? null;
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
  try {
    const data = await request("/auth/me");
    user.value = data.user as UserInfo;
  } catch (error) {
    clearAuth();
  } finally {
    profileLoaded.value = true;
  }
};

const ensureProfileLoaded = async () => {
  if (profileLoaded.value) {
    return;
  }
  await loadProfile();
};

const login = async (email: string, password: string) => {
  const data = await request(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password })
    },
    { skipRefresh: true }
  );
  user.value = data.user as UserInfo;
  profileLoaded.value = true;
  return data as { user: UserInfo };
};

const logout = async () => {
  try {
    await request(
      "/auth/logout",
      { method: "POST", body: "{}" },
      { skipRefresh: true }
    );
  } catch (error) {
    // ignore
  } finally {
    clearAuth();
  }
};

const register = async (email: string, displayName: string, password: string) => {
  return await request(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ email, displayName, password })
    },
    { skipRefresh: true }
  );
};

const verifyEmail = async (token: string) => {
  return await request(
    "/auth/verify-email",
    {
      method: "POST",
      body: JSON.stringify({ token })
    },
    { skipRefresh: true }
  );
};

const forgotPassword = async (email: string) => {
  return await request(
    "/auth/forgot-password",
    {
      method: "POST",
      body: JSON.stringify({ email })
    },
    { skipRefresh: true }
  );
};

const resetPassword = async (token: string, newPassword: string) => {
  return await request(
    "/auth/reset-password",
    {
      method: "POST",
      body: JSON.stringify({ token, newPassword })
    },
    { skipRefresh: true }
  );
};

const changePassword = async (currentPassword: string, newPassword: string) => {
  return await request("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword })
  });
};

const updateProfile = async (displayName: string) => {
  const data = await request("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify({ displayName })
  });
  user.value = data.user as UserInfo;
  profileLoaded.value = true;
  return data as { user: UserInfo };
};

const loadTags = async () => {
  const data = await request("/tags");
  tags.value = data.items;
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
  if (filters.tagMatch) {
    params.set("tagMatch", filters.tagMatch);
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
  filters.tagMatch = "all";
};

const createEvent = async (payload: EventDraft) => {
  return await request(
    "/events",
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
};

const updateEvent = async (id: string, payload: EventDraft) => {
  return await request(
    `/events/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    }
  );
};

const deleteEvent = async (id: string) => {
  return await request(`/events/${id}`, { method: "DELETE" });
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
    }
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
    }
  );
};

const createTag = async (payload: { name: string; parentId?: string | null }) => {
  return await request(
    "/tags",
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
};

const updateTag = async (id: string, payload: { name?: string; parentId?: string | null }) => {
  return await request(
    `/tags/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    }
  );
};

const deleteTag = async (id: string) => {
  return await request(`/tags/${id}`, { method: "DELETE" });
};

const loadUsers = async () => {
  const data = await request("/users");
  users.value = data.items as UserInfo[];
};

const createUser = async (payload: {
  displayName: string;
  email: string;
  password: string;
  roles?: RoleName[];
  isActive?: boolean;
}) => {
  return await request("/users", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

const updateUser = async (
  id: string,
  payload: Partial<UserInfo> & { password?: string; roles?: RoleName[]; isActive?: boolean }
) => {
  return await request(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
};

const disableUser = async (id: string) => {
  return await updateUser(id, { isActive: false });
};

const loadApprovals = async () => {
  const data = await request("/events/approvals?status=pending");
  approvals.value = data.items as EventApproval[];
};

const approveEventChange = async (id: string) => {
  return await request(`/events/approvals/${id}/approve`, { method: "POST", body: "{}" });
};

const rejectEventChange = async (id: string) => {
  return await request(`/events/approvals/${id}/reject`, { method: "POST", body: "{}" });
};

const loadSmtpSettings = async () => {
  const data = await request("/settings/smtp");
  smtpSettings.value = data.settings as SmtpSettings;
};

const updateSmtpSettings = async (payload: {
  enabled: boolean;
  host?: string;
  port?: number;
  secure?: boolean;
  username?: string;
  password?: string;
  fromAddress?: string;
}) => {
  const data = await request("/settings/smtp", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  smtpSettings.value = data.settings as SmtpSettings;
  return data as { settings: SmtpSettings };
};

const hasRole = (role: RoleName) => user.value?.roles?.includes(role) ?? false;

const canManageAccounts = computed(() => hasRole("SUPER_ADMIN") || hasRole("ADMIN"));
const canManageContent = computed(() => hasRole("SUPER_ADMIN") || hasRole("ADMIN"));
const canWriteContent = computed(() =>
  hasRole("SUPER_ADMIN") || hasRole("ADMIN") || hasRole("EDITOR")
);
const canApproveContent = computed(() => hasRole("SUPER_ADMIN") || hasRole("ADMIN"));
const canManageSystem = computed(() => hasRole("SUPER_ADMIN"));
const isContentEditorRole = computed(
  () => hasRole("EDITOR") && !hasRole("ADMIN") && !hasRole("SUPER_ADMIN")
);

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

const formatRole = (roles: RoleName[] | RoleName) => {
  const role = Array.isArray(roles) ? pickPrimaryRole(roles) : roles;
  return roleLabels[role] || role;
};

const mapTags = (ids: string[]) => {
  return ids.map((id) => tags.value.find((tag) => tag.id === id)?.name || id);
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
    user,
    profileLoaded,
    tags,
    events,
    versions,
    stats,
    users,
    approvals,
    smtpSettings,
    filters,
    loadStatus,
    loadProfile,
    ensureProfileLoaded,
    login,
    logout,
    register,
    verifyEmail,
    forgotPassword,
    resetPassword,
    changePassword,
    updateProfile,
    loadTags,
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
    loadUsers,
    createUser,
    updateUser,
    disableUser,
    loadApprovals,
    approveEventChange,
    rejectEventChange,
    loadSmtpSettings,
    updateSmtpSettings,
    canManageAccounts,
    canManageContent,
    canWriteContent,
    canApproveContent,
    canManageSystem,
    isContentEditorRole,
    formatYear,
    formatEventTime,
    formatDateTime,
    formatRole,
    mapTags,
    approvalActionLabel,
    approvalTitle
  };
};

