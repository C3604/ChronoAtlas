import fs from "fs";
import path from "path";
import { createServer } from "http";
import crypto from "crypto";

const port = 3000;
const bodySizeLimit = 1_000_000;
const sessionHours = 24 * 7;

type TimePoint = {
  year: number;
  month?: number;
  day?: number;
};

type FuzzyTime = {
  isApprox: boolean;
  approxRangeYears?: number;
  displayText?: string;
};

type EventTime = {
  start: TimePoint;
  end?: TimePoint;
  precision: "century" | "decade" | "year" | "month" | "day";
  fuzzy?: FuzzyTime;
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
  createdBy?: string;
};

type TagItem = {
  id: string;
  name: string;
  parentId?: string | null;
};

type CategoryItem = {
  id: string;
  name: string;
  parentId?: string | null;
};

type UserRole = "super_admin" | "account_admin" | "content_admin" | "content_editor";

type UserItem = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  salt: string;
  createdAt: string;
};

type SessionItem = {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
};

type EventVersion = {
  id: string;
  eventId: string;
  snapshot: EventItem;
  action: "create" | "update" | "delete" | "restore" | "import";
  changedAt: string;
  changedBy?: string;
  note?: string;
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
  requestedBy?: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
  decidedBy?: string;
  decidedAt?: string;
  note?: string;
  resultEventId?: string;
};

type Database = {
  events: EventItem[];
  tags: TagItem[];
  categories: CategoryItem[];
  users: UserItem[];
  sessions: SessionItem[];
  eventVersions: EventVersion[];
  eventApprovals: EventApproval[];
};

const dataDir = path.resolve(__dirname, "..", "data");
const dataFile = path.resolve(dataDir, "db.json");

const defaultAdminEmail = "admin@chronoatlas.local";
const defaultAdminPassword = "admin123";
const defaultAdminName = "管理员";
const defaultAdminSalt = "chronoatlas-admin-salt";

const nowIso = () => new Date().toISOString();

const hashPassword = (password: string, salt: string) => {
  return crypto.createHash("sha256").update(`${password}:${salt}`, "utf-8").digest("hex");
};

const buildDefaultAdmin = (): UserItem => {
  return {
    id: "user_admin_1",
    name: defaultAdminName,
    email: defaultAdminEmail,
    role: "super_admin",
    salt: defaultAdminSalt,
    passwordHash: hashPassword(defaultAdminPassword, defaultAdminSalt),
    createdAt: nowIso()
  };
};

const buildSeedData = (): Database => {
  return {
    events: [],
    tags: [
      { id: "tag_1", name: "战争" },
      { id: "tag_2", name: "制度" },
      { id: "tag_3", name: "技术" },
      { id: "tag_4", name: "文化" },
      { id: "tag_5", name: "改革" }
    ],
    categories: [
      { id: "cat_1", name: "中国史" },
      { id: "cat_2", name: "世界史" },
      { id: "cat_3", name: "科技史" }
    ],
    users: [buildDefaultAdmin()],
    sessions: [],
    eventVersions: [],
    eventApprovals: []
  };
};

const writeData = (data: Database) => {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), "utf-8");
};

const normalizeRole = (value: any): UserRole => {
  if (
    value === "super_admin" ||
    value === "account_admin" ||
    value === "content_admin" ||
    value === "content_editor"
  ) {
    return value;
  }
  if (value === "admin") {
    return "super_admin";
  }
  if (value === "editor") {
    return "content_editor";
  }
  return "content_editor";
};

const ensureDataFile = () => {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    writeData(buildSeedData());
    return;
  }

  const raw = fs.readFileSync(dataFile, "utf-8");
  const parsed = (raw.trim() ? JSON.parse(raw) : {}) as Partial<Database>;
  const normalizedUsers: UserItem[] = Array.isArray(parsed.users)
    ? parsed.users.map((user) => ({ ...(user as UserItem), role: normalizeRole((user as any)?.role) }))
    : [];

  let changed = false;
  let hasSuperAdmin = false;
  const normalizedUsersWithRoles = normalizedUsers.map((user) => {
    if (user.role === "super_admin") {
      if (hasSuperAdmin) {
        changed = true;
        return { ...user, role: "account_admin" as UserRole };
      }
      hasSuperAdmin = true;
    }
    return user;
  });

  const normalized: Database = {
    events: Array.isArray(parsed.events) ? parsed.events : [],
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    categories: Array.isArray(parsed.categories) ? parsed.categories : [],
    users: normalizedUsersWithRoles,
    sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    eventVersions: Array.isArray(parsed.eventVersions) ? parsed.eventVersions : [],
    eventApprovals: Array.isArray(parsed.eventApprovals) ? parsed.eventApprovals : []
  };

  if (!Array.isArray(parsed.events)) {
    changed = true;
  }
  if (!Array.isArray(parsed.tags)) {
    changed = true;
  }
  if (!Array.isArray(parsed.categories)) {
    changed = true;
  }
  if (!Array.isArray(parsed.users)) {
    changed = true;
  }
  if (!Array.isArray(parsed.sessions)) {
    changed = true;
  }
  if (!Array.isArray(parsed.eventVersions)) {
    changed = true;
  }
  if (!Array.isArray(parsed.eventApprovals)) {
    changed = true;
  }

  if (!hasSuperAdmin) {
    const defaultIndex = normalized.users.findIndex((user) => user.email === defaultAdminEmail);
    if (defaultIndex >= 0) {
      normalized.users[defaultIndex] = { ...normalized.users[defaultIndex], role: "super_admin" };
      changed = true;
    } else {
      normalized.users.push(buildDefaultAdmin());
      changed = true;
    }
  }

  if (changed) {
    writeData(normalized);
  }
};

const readData = (): Database => {
  ensureDataFile();
  const raw = fs.readFileSync(dataFile, "utf-8");
  return JSON.parse(raw) as Database;
};
const precisionOrder: Record<EventTime["precision"], number> = {
  century: 1,
  decade: 2,
  year: 3,
  month: 4,
  day: 5
};

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE" | "OPTIONS";

const sendJson = (res: any, status: number, payload: unknown) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
};

const sendError = (
  res: any,
  status: number,
  code: string,
  message: string,
  details?: Record<string, string>
) => {
  const payload = details ? { code, message, details } : { code, message };
  sendJson(res, status, payload);
};

const parseIntSafe = (value: string | null) => {
  if (value == null || value.trim() === "") {
    return null;
  }
  const num = Number(value);
  return Number.isInteger(num) ? num : null;
};

const parseIds = (value: string | null) => {
  if (!value) {
    return [] as string[];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const readJsonBody = async (req: any) => {
  return await new Promise<any>((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => {
      data += chunk.toString("utf-8");
      if (data.length > bodySizeLimit) {
        reject(new Error("PAYLOAD_TOO_LARGE"));
      }
    });
    req.on("end", () => {
      if (data.trim() === "") {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(new Error("BAD_JSON"));
      }
    });
  });
};

const validateTimePoint = (point: any) => {
  if (!point || typeof point !== "object") {
    return "time.start 缺失";
  }
  if (!Number.isInteger(point.year)) {
    return "year 必须是整数";
  }
  if (point.month != null && !Number.isInteger(point.month)) {
    return "month 必须是整数";
  }
  if (point.day != null && !Number.isInteger(point.day)) {
    return "day 必须是整数";
  }
  return null;
};

const validateEventTime = (time: EventTime) => {
  const startError = validateTimePoint(time.start);
  if (startError) {
    return startError;
  }
  if (time.end) {
    const endError = validateTimePoint(time.end);
    if (endError) {
      return endError;
    }
  }
  if (!time.precision || !(time.precision in precisionOrder)) {
    return "precision 不合法";
  }
  const maxPrecision = time.start.day ? "day" : time.start.month ? "month" : "year";
  if (precisionOrder[time.precision] > precisionOrder[maxPrecision]) {
    return "precision 超出时间字段";
  }
  if (time.end && time.start.year > time.end.year) {
    return "start 不能大于 end";
  }
  if (time.fuzzy && time.fuzzy.isApprox) {
    if (!Number.isFinite(time.fuzzy.approxRangeYears) || (time.fuzzy.approxRangeYears ?? 0) <= 0) {
      return "approxRangeYears 需要大于 0";
    }
  }
  return null;
};

const ensureTagsExist = (data: Database, tagIds: string[]) => {
  const tagSet = new Set(data.tags.map((tag) => tag.id));
  return tagIds.filter((id) => !tagSet.has(id));
};

const ensureCategoriesExist = (data: Database, categoryIds: string[]) => {
  const categorySet = new Set(data.categories.map((cat) => cat.id));
  return categoryIds.filter((id) => !categorySet.has(id));
};

const mergeEventTime = (current: EventTime, update: Partial<EventTime>) => {
  return {
    start: update.start ?? current.start,
    end: update.end ?? current.end,
    precision: update.precision ?? current.precision,
    fuzzy: update.fuzzy ?? current.fuzzy
  } as EventTime;
};

const createId = (prefix: string) => {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
};

const cloneEvent = (event: EventItem) => {
  return JSON.parse(JSON.stringify(event)) as EventItem;
};

const recordVersion = (
  data: Database,
  event: EventItem,
  action: EventVersion["action"],
  userId?: string,
  note?: string
) => {
  const version: EventVersion = {
    id: createId("ver"),
    eventId: event.id,
    snapshot: cloneEvent(event),
    action,
    changedAt: nowIso(),
    changedBy: userId,
    note
  };
  data.eventVersions.push(version);
};

const recordApproval = (
  data: Database,
  action: EventApproval["action"],
  payload: {
    eventId?: string;
    draft?: EventDraft;
    snapshot?: EventItem;
    requestedBy?: string;
  }
) => {
  const approval: EventApproval = {
    id: createId("approval"),
    action,
    eventId: payload.eventId,
    draft: payload.draft,
    snapshot: payload.snapshot ? cloneEvent(payload.snapshot) : undefined,
    requestedBy: payload.requestedBy,
    requestedAt: nowIso(),
    status: "pending"
  };
  data.eventApprovals.push(approval);
  return approval;
};
const getAuthToken = (req: any) => {
  const raw = req.headers["authorization"];
  if (!raw) {
    return null;
  }
  const value = Array.isArray(raw) ? raw[0] : raw;
  const text = value.trim();
  if (text.toLowerCase().startsWith("bearer ")) {
    return text.slice(7).trim();
  }
  return text;
};

const getAuthContext = (req: any, data: Database) => {
  const token = getAuthToken(req);
  if (!token) {
    return null;
  }
  const sessionIndex = data.sessions.findIndex((session) => session.token === token);
  if (sessionIndex < 0) {
    return null;
  }
  const session = data.sessions[sessionIndex];
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    data.sessions.splice(sessionIndex, 1);
    writeData(data);
    return null;
  }
  const user = data.users.find((item) => item.id === session.userId);
  if (!user) {
    return null;
  }
  return { user, session, token };
};

const requireAuth = (req: any, res: any, data: Database) => {
  const auth = getAuthContext(req, data);
  if (!auth) {
    sendError(res, 401, "UNAUTHORIZED", "需要登录后操作");
    return null;
  }
  return auth;
};

const hasAccountPermission = (role: UserRole) => role === "super_admin" || role === "account_admin";
const hasContentManagePermission = (role: UserRole) => role === "super_admin" || role === "content_admin";
const hasContentWritePermission = (role: UserRole) =>
  role === "super_admin" || role === "content_admin" || role === "content_editor";
const hasContentApprovePermission = (role: UserRole) => role === "super_admin" || role === "content_admin";
const isContentEditor = (role: UserRole) => role === "content_editor";

const requireAccountAdmin = (req: any, res: any, data: Database) => {
  const auth = requireAuth(req, res, data);
  if (!auth) {
    return null;
  }
  if (!hasAccountPermission(auth.user.role)) {
    sendError(res, 403, "FORBIDDEN", "没有账号管理权限");
    return null;
  }
  return auth;
};

const requireContentWriter = (req: any, res: any, data: Database) => {
  const auth = requireAuth(req, res, data);
  if (!auth) {
    return null;
  }
  if (!hasContentWritePermission(auth.user.role)) {
    sendError(res, 403, "FORBIDDEN", "没有内容权限");
    return null;
  }
  return auth;
};

const requireContentApprover = (req: any, res: any, data: Database) => {
  const auth = requireAuth(req, res, data);
  if (!auth) {
    return null;
  }
  if (!hasContentApprovePermission(auth.user.role)) {
    sendError(res, 403, "FORBIDDEN", "没有审批权限");
    return null;
  }
  return auth;
};

const requireContentManager = (req: any, res: any, data: Database) => {
  const auth = requireAuth(req, res, data);
  if (!auth) {
    return null;
  }
  if (!hasContentManagePermission(auth.user.role)) {
    sendError(res, 403, "FORBIDDEN", "没有内容管理权限");
    return null;
  }
  return auth;
};

const toPublicUser = (user: UserItem) => {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
};

const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const requestUrl = new URL(req.url ?? "/", "http://localhost");
  const method = (req.method || "GET") as HttpMethod;
  const pathParts = requestUrl.pathname.split("/").filter(Boolean);

  if (method === "GET" && requestUrl.pathname === "/") {
    const target = "http://localhost:5173";
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="1; url=${target}" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ChronoAtlas</title>
    <style>
      body { font-family: "Microsoft YaHei", Arial, sans-serif; margin: 0; background: #f5f6f7; color: #1f2937; }
      .wrap { max-width: 720px; margin: 18vh auto 0; padding: 24px; text-align: center; }
      .card { background: #ffffff; border-radius: 12px; padding: 28px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); }
      h1 { font-size: 24px; margin: 0 0 12px; }
      p { margin: 6px 0; }
      a { color: #0f766e; text-decoration: none; font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>正在前往 ChronoAtlas 前端页面</h1>
        <p>如果没有自动跳转，请点击：</p>
        <p><a href="${target}">${target}</a></p>
      </div>
    </div>
  </body>
</html>`);
    return;
  }

  if (method === "GET" && requestUrl.pathname === "/favicon.ico") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (method === "GET" && requestUrl.pathname === "/health") {
    sendJson(res, 200, { status: "ok", time: nowIso() });
    return;
  }

  if (method === "GET" && requestUrl.pathname === "/api/hello") {
    sendJson(res, 200, { message: "你好，世界", time: nowIso() });
    return;
  }

  if (pathParts[0] === "auth") {
    const data = readData();

    if (pathParts[1] === "login" && method === "POST") {
      try {
        const payload = await readJsonBody(req);
        if (typeof payload.email !== "string" || payload.email.trim() === "") {
          sendError(res, 400, "BAD_REQUEST", "email 必须填写", { field: "email" });
          return;
        }
        if (typeof payload.password !== "string" || payload.password.trim() === "") {
          sendError(res, 400, "BAD_REQUEST", "password 必须填写", { field: "password" });
          return;
        }
        const email = payload.email.trim().toLowerCase();
        const user = data.users.find((item) => item.email.toLowerCase() === email);
        if (!user) {
          sendError(res, 401, "UNAUTHORIZED", "账号或密码错误");
          return;
        }
        const hash = hashPassword(payload.password, user.salt);
        if (hash !== user.passwordHash) {
          sendError(res, 401, "UNAUTHORIZED", "账号或密码错误");
          return;
        }
        const token = crypto.randomBytes(24).toString("hex");
        const now = nowIso();
        const expiresAt = new Date(Date.now() + sessionHours * 60 * 60 * 1000).toISOString();
        data.sessions.push({ token, userId: user.id, createdAt: now, expiresAt });
        writeData(data);
        sendJson(res, 200, { token, expiresAt, user: toPublicUser(user) });
        return;
      } catch (error: any) {
        const message = error?.message === "BAD_JSON" ? "请求体不是合法 JSON" : "请求参数错误";
        sendError(res, 400, "BAD_REQUEST", message);
        return;
      }
    }

    if (pathParts[1] === "me" && method === "GET") {
      const auth = requireAuth(req, res, data);
      if (!auth) {
        return;
      }
      sendJson(res, 200, { user: toPublicUser(auth.user) });
      return;
    }

    if (pathParts[1] === "logout" && method === "POST") {
      const auth = getAuthContext(req, data);
      if (!auth) {
        sendError(res, 401, "UNAUTHORIZED", "还没有登录");
        return;
      }
      data.sessions = data.sessions.filter((session) => session.token !== auth.token);
      writeData(data);
      sendJson(res, 200, { ok: true });
      return;
    }

    sendError(res, 404, "NOT_FOUND", "接口不存在");
    return;
  }
  if (pathParts[0] === "users") {
    const data = readData();

    if (method === "GET") {
      const auth = requireAccountAdmin(req, res, data);
      if (!auth) {
        return;
      }
      sendJson(res, 200, { items: data.users.map(toPublicUser) });
      return;
    }

    if (method === "POST") {
      const auth = requireAccountAdmin(req, res, data);
      if (!auth) {
        return;
      }
      try {
        const payload = await readJsonBody(req);
        const name = typeof payload.name === "string" ? payload.name.trim() : "";
        const email = typeof payload.email === "string" ? payload.email.trim() : "";
        const password = typeof payload.password === "string" ? payload.password.trim() : "";
        const role = payload.role as UserRole;

        if (!name) {
          sendError(res, 400, "BAD_REQUEST", "name 必须填写", { field: "name" });
          return;
        }
        if (!email) {
          sendError(res, 400, "BAD_REQUEST", "email 必须填写", { field: "email" });
          return;
        }
        if (!password) {
          sendError(res, 400, "BAD_REQUEST", "password 必须填写", { field: "password" });
          return;
        }
        if (!["account_admin", "content_admin", "content_editor"].includes(role)) {
          sendError(res, 400, "BAD_REQUEST", "role 不合法", { field: "role" });
          return;
        }

        const exists = data.users.some((user) => user.email.toLowerCase() === email.toLowerCase());
        if (exists) {
          sendError(res, 400, "BAD_REQUEST", "email 已存在", { field: "email" });
          return;
        }

        const salt = crypto.randomBytes(8).toString("hex");
        const user: UserItem = {
          id: createId("user"),
          name,
          email,
          role,
          salt,
          passwordHash: hashPassword(password, salt),
          createdAt: nowIso()
        };
        data.users.push(user);
        writeData(data);
        sendJson(res, 201, { user: toPublicUser(user) });
        return;
      } catch (error: any) {
        const message = error?.message === "BAD_JSON" ? "请求体不是合法 JSON" : "请求参数错误";
        sendError(res, 400, "BAD_REQUEST", message);
        return;
      }
    }

    if (pathParts.length === 2 && method === "PATCH") {
      const auth = requireAuth(req, res, data);
      if (!auth) {
        return;
      }
      const userId = pathParts[1];
      const targetIndex = data.users.findIndex((item) => item.id === userId);
      if (targetIndex < 0) {
        sendError(res, 404, "NOT_FOUND", "用户不存在");
        return;
      }
      const target = data.users[targetIndex];
      const isSelf = auth.user.id === target.id;
      const canManageAccount = hasAccountPermission(auth.user.role);
      if (!canManageAccount && !isSelf) {
        sendError(res, 403, "FORBIDDEN", "没有账号管理权限");
        return;
      }
      try {
        const payload = await readJsonBody(req);
        const name = payload.name !== undefined ? String(payload.name).trim() : target.name;
        const email = payload.email !== undefined ? String(payload.email).trim() : target.email;
        const role = payload.role !== undefined ? (payload.role as UserRole) : target.role;
        const password = payload.password !== undefined ? String(payload.password).trim() : "";

        if (!name) {
          sendError(res, 400, "BAD_REQUEST", "name 必须填写", { field: "name" });
          return;
        }
        if (!email) {
          sendError(res, 400, "BAD_REQUEST", "email 必须填写", { field: "email" });
          return;
        }
        if (payload.role !== undefined) {
          if (!canManageAccount) {
            sendError(res, 403, "FORBIDDEN", "没有权限修改角色");
            return;
          }
          if (target.role === "super_admin") {
            sendError(res, 400, "BAD_REQUEST", "超级管理员角色不可修改");
            return;
          }
          if (!["account_admin", "content_admin", "content_editor"].includes(role)) {
            sendError(res, 400, "BAD_REQUEST", "role 不合法", { field: "role" });
            return;
          }
        }

        const emailExists = data.users.some(
          (user) => user.email.toLowerCase() === email.toLowerCase() && user.id !== target.id
        );
        if (emailExists) {
          sendError(res, 400, "BAD_REQUEST", "email 已存在", { field: "email" });
          return;
        }

        const updated: UserItem = { ...target, name, email, role };
        if (payload.password !== undefined) {
          if (!password) {
            sendError(res, 400, "BAD_REQUEST", "password 必须填写", { field: "password" });
            return;
          }
          const salt = crypto.randomBytes(8).toString("hex");
          updated.salt = salt;
          updated.passwordHash = hashPassword(password, salt);
        }
        data.users[targetIndex] = updated;
        writeData(data);
        sendJson(res, 200, { user: toPublicUser(updated) });
        return;
      } catch (error: any) {
        const message = error?.message === "BAD_JSON" ? "请求体不是合法 JSON" : "请求参数错误";
        sendError(res, 400, "BAD_REQUEST", message);
        return;
      }
    }

    if (pathParts.length === 2 && method === "DELETE") {
      const auth = requireAccountAdmin(req, res, data);
      if (!auth) {
        return;
      }
      const userId = pathParts[1];
      const targetIndex = data.users.findIndex((item) => item.id === userId);
      if (targetIndex < 0) {
        sendError(res, 404, "NOT_FOUND", "用户不存在");
        return;
      }
      const target = data.users[targetIndex];
      if (target.role === "super_admin") {
        sendError(res, 400, "BAD_REQUEST", "超级管理员不可删除");
        return;
      }
      if (auth.user.id === target.id) {
        sendError(res, 400, "BAD_REQUEST", "不能删除自己的账号");
        return;
      }
      data.users.splice(targetIndex, 1);
      data.sessions = data.sessions.filter((session) => session.userId !== target.id);
      writeData(data);
      res.writeHead(204);
      res.end();
      return;
    }

    sendError(res, 405, "BAD_REQUEST", "不支持的请求方法");
    return;
  }

  if (pathParts[0] === "import" && pathParts[1] === "events" && method === "POST") {
    const data = readData();
    const auth = requireContentManager(req, res, data);
    if (!auth) {
      return;
    }
    try {
      const payload = await readJsonBody(req);
      const mode = payload.mode === "replace" ? "replace" : "merge";
      const items = Array.isArray(payload.items) ? payload.items : null;
      if (!items) {
        sendError(res, 400, "BAD_REQUEST", "items 必须是数组", { field: "items" });
        return;
      }
      if (mode === "replace") {
        data.events = [];
        data.eventVersions = [];
      }
      const now = nowIso();
      const created: EventItem[] = [];
      for (const item of items) {
        if (typeof item.title !== "string" || item.title.trim() === "") {
          sendError(res, 400, "BAD_REQUEST", "title 必须是非空字符串", { field: "title" });
          return;
        }
        const time = item.time as EventTime | undefined;
        if (!time) {
          sendError(res, 400, "BAD_REQUEST", "time 缺失", { field: "time" });
          return;
        }
        const timeError = validateEventTime(time);
        if (timeError) {
          sendError(res, 400, "BAD_REQUEST", timeError, { field: "time" });
          return;
        }
        const tagIds = Array.isArray(item.tagIds) ? item.tagIds : [];
        const categoryIds = Array.isArray(item.categoryIds) ? item.categoryIds : [];

        const missingTags = ensureTagsExist(data, tagIds);
        if (missingTags.length > 0) {
          sendError(res, 400, "BAD_REQUEST", "tagIds 无法识别", { field: missingTags.join(",") });
          return;
        }
        const missingCategories = ensureCategoriesExist(data, categoryIds);
        if (missingCategories.length > 0) {
          sendError(res, 400, "BAD_REQUEST", "categoryIds 无法识别", { field: missingCategories.join(",") });
          return;
        }

        const event: EventItem = {
          id: createId("evt"),
          title: item.title.trim(),
          summary: typeof item.summary === "string" ? item.summary.trim() : "",
          time,
          tagIds,
          categoryIds,
          createdAt: now,
          updatedAt: now,
          createdBy: auth.user.id
        };
        data.events.push(event);
        recordVersion(data, event, "import", auth.user.id);
        created.push(event);
      }
      writeData(data);
      sendJson(res, 200, { mode, imported: created.length });
      return;
    } catch (error: any) {
      const message = error?.message === "BAD_JSON" ? "请求体不是合法 JSON" : "请求参数错误";
      sendError(res, 400, "BAD_REQUEST", message);
      return;
    }
  }

  if (pathParts[0] === "export" && pathParts[1] === "events" && method === "GET") {
    const data = readData();
    sendJson(res, 200, { exportedAt: nowIso(), total: data.events.length, items: data.events });
    return;
  }

  if (pathParts[0] === "events") {
    const data = readData();

    if (pathParts.length >= 2 && pathParts[1] === "approvals") {
      if (pathParts.length === 2 && method === "GET") {
        const auth = requireContentApprover(req, res, data);
        if (!auth) {
          return;
        }
        const statusRaw = requestUrl.searchParams.get("status");
        const status = statusRaw === "approved" || statusRaw === "rejected" ? statusRaw : "pending";
        const items = data.eventApprovals
          .filter((item) => item.status === status)
          .map((item) => {
            const requester = data.users.find((user) => user.id === item.requestedBy);
            return {
              ...item,
              requestedByName: requester?.name
            };
          });
        sendJson(res, 200, { items });
        return;
      }

      if (pathParts.length === 4 && method === "POST") {
        const auth = requireContentApprover(req, res, data);
        if (!auth) {
          return;
        }
        const approvalId = pathParts[2];
        const action = pathParts[3];
        const approvalIndex = data.eventApprovals.findIndex((item) => item.id === approvalId);
        if (approvalIndex < 0) {
          sendError(res, 404, "NOT_FOUND", "审批记录不存在");
          return;
        }
        const approval = data.eventApprovals[approvalIndex];
        if (approval.status !== "pending") {
          sendError(res, 400, "BAD_REQUEST", "审批已处理");
          return;
        }
        try {
          const payload = await readJsonBody(req);
          const note = typeof payload.note === "string" ? payload.note.trim() : "";
          const decidedAt = nowIso();

          if (action === "approve") {
            if (approval.action === "create") {
              if (!approval.draft) {
                sendError(res, 400, "BAD_REQUEST", "审批内容缺失");
                return;
              }
              const now = nowIso();
              const event: EventItem = {
                id: createId("evt"),
                title: approval.draft.title,
                summary: approval.draft.summary ?? "",
                time: approval.draft.time,
                tagIds: approval.draft.tagIds,
                categoryIds: approval.draft.categoryIds,
                createdAt: now,
                updatedAt: now,
                createdBy: approval.requestedBy
              };
              data.events.push(event);
              recordVersion(data, event, "create", auth.user.id, `approval:${approval.id}`);
              approval.resultEventId = event.id;
            } else if (approval.action === "update") {
              if (!approval.eventId || !approval.draft) {
                sendError(res, 400, "BAD_REQUEST", "审批内容缺失");
                return;
              }
              const eventIndex = data.events.findIndex((item) => item.id === approval.eventId);
              if (eventIndex < 0) {
                sendError(res, 404, "NOT_FOUND", "事件不存在");
                return;
              }
              const current = data.events[eventIndex];
              recordVersion(data, current, "update", auth.user.id, `approval:${approval.id}`);
              data.events[eventIndex] = {
                ...current,
                title: approval.draft.title,
                summary: approval.draft.summary ?? "",
                time: approval.draft.time,
                tagIds: approval.draft.tagIds,
                categoryIds: approval.draft.categoryIds,
                updatedAt: nowIso()
              };
            } else if (approval.action === "delete") {
              if (!approval.eventId) {
                sendError(res, 400, "BAD_REQUEST", "审批内容缺失");
                return;
              }
              const eventIndex = data.events.findIndex((item) => item.id === approval.eventId);
              if (eventIndex < 0) {
                sendError(res, 404, "NOT_FOUND", "事件不存在");
                return;
              }
              const current = data.events[eventIndex];
              recordVersion(data, current, "delete", auth.user.id, `approval:${approval.id}`);
              data.events.splice(eventIndex, 1);
            } else {
              sendError(res, 400, "BAD_REQUEST", "不支持的审批动作");
              return;
            }

            approval.status = "approved";
            approval.decidedBy = auth.user.id;
            approval.decidedAt = decidedAt;
            approval.note = note || approval.note;
            writeData(data);
            sendJson(res, 200, { ok: true, approval });
            return;
          }

          if (action === "reject") {
            approval.status = "rejected";
            approval.decidedBy = auth.user.id;
            approval.decidedAt = decidedAt;
            approval.note = note || approval.note;
            writeData(data);
            sendJson(res, 200, { ok: true, approval });
            return;
          }

          sendError(res, 400, "BAD_REQUEST", "不支持的审批动作");
          return;
        } catch (error: any) {
          const message = error?.message === "BAD_JSON" ? "请求体不是合法 JSON" : "请求参数错误";
          sendError(res, 400, "BAD_REQUEST", message);
          return;
        }
      }

      sendError(res, 405, "BAD_REQUEST", "不支持的请求方法");
      return;
    }

    if (pathParts.length === 1 && method === "GET") {
      const timeFromRaw = requestUrl.searchParams.get("timeFrom");
      const timeToRaw = requestUrl.searchParams.get("timeTo");
      const timeFrom = parseIntSafe(timeFromRaw);
      const timeTo = parseIntSafe(timeToRaw);

      if (timeFromRaw != null && timeFrom == null) {
        sendError(res, 400, "BAD_REQUEST", "timeFrom 必须是整数", { field: "timeFrom" });
        return;
      }
      if (timeToRaw != null && timeTo == null) {
        sendError(res, 400, "BAD_REQUEST", "timeTo 必须是整数", { field: "timeTo" });
        return;
      }

      const tagIds = parseIds(requestUrl.searchParams.get("tagIds"));
      const categoryIds = parseIds(requestUrl.searchParams.get("categoryIds"));
      const keywordRaw =
        requestUrl.searchParams.get("keyword") ?? requestUrl.searchParams.get("q") ?? "";
      const keyword = keywordRaw.trim().toLowerCase();

      let items = [...data.events];
      if (timeFrom != null || timeTo != null) {
        items = items.filter((event) => {
          const startYear = event.time.start.year;
          const endYear = event.time.end?.year ?? startYear;
          if (timeFrom != null && endYear < timeFrom) {
            return false;
          }
          if (timeTo != null && startYear > timeTo) {
            return false;
          }
          return true;
        });
      }
      if (tagIds.length > 0) {
        items = items.filter((event) => tagIds.some((id) => event.tagIds.includes(id)));
      }
      if (categoryIds.length > 0) {
        items = items.filter((event) => categoryIds.some((id) => event.categoryIds.includes(id)));
      }
      if (keyword) {
        items = items.filter((event) => {
          const titleMatch = event.title.toLowerCase().includes(keyword);
          const summaryMatch = (event.summary ?? "").toLowerCase().includes(keyword);
          return titleMatch || summaryMatch;
        });
      }

      items.sort((a, b) => a.time.start.year - b.time.start.year);

      sendJson(res, 200, { items, total: items.length });
      return;
    }

    if (pathParts.length === 2 && pathParts[1] === "search" && method === "GET") {
      const keyword = requestUrl.searchParams.get("q")?.trim() ?? "";
      if (!keyword) {
        sendError(res, 400, "BAD_REQUEST", "q 不能为空", { field: "q" });
        return;
      }
      const lowered = keyword.toLowerCase();
      const items = data.events.filter((event) => {
        const titleMatch = event.title.toLowerCase().includes(lowered);
        const summaryMatch = (event.summary ?? "").toLowerCase().includes(lowered);
        return titleMatch || summaryMatch;
      });
      sendJson(res, 200, { items, total: items.length });
      return;
    }

    if (pathParts.length === 2 && pathParts[1] === "aggregations" && method === "GET") {
      const tagStats = data.tags.map((tag) => {
        const count = data.events.filter((event) => event.tagIds.includes(tag.id)).length;
        return { id: tag.id, name: tag.name, count };
      });
      const categoryStats = data.categories.map((cat) => {
        const count = data.events.filter((event) => event.categoryIds.includes(cat.id)).length;
        return { id: cat.id, name: cat.name, count };
      });
      let minYear: number | null = null;
      let maxYear: number | null = null;
      data.events.forEach((event) => {
        const startYear = event.time.start.year;
        const endYear = event.time.end?.year ?? startYear;
        minYear = minYear == null ? startYear : Math.min(minYear, startYear);
        maxYear = maxYear == null ? endYear : Math.max(maxYear, endYear);
      });
      sendJson(res, 200, {
        total: data.events.length,
        years: { min: minYear, max: maxYear },
        tags: tagStats,
        categories: categoryStats
      });
      return;
    }

    if (pathParts.length === 1 && method === "POST") {
      const auth = requireContentWriter(req, res, data);
      if (!auth) {
        return;
      }
      try {
        const payload = await readJsonBody(req);
        if (typeof payload.title !== "string" || payload.title.trim() === "") {
          sendError(res, 400, "BAD_REQUEST", "title 必须填写", { field: "title" });
          return;
        }

        const time = payload.time as EventTime | undefined;
        if (!time) {
          sendError(res, 400, "BAD_REQUEST", "time 缺失", { field: "time" });
          return;
        }
        const timeError = validateEventTime(time);
        if (timeError) {
          sendError(res, 400, "BAD_REQUEST", timeError, { field: "time" });
          return;
        }

        const tagIds = Array.isArray(payload.tagIds) ? payload.tagIds : [];
        const categoryIds = Array.isArray(payload.categoryIds) ? payload.categoryIds : [];

        const missingTags = ensureTagsExist(data, tagIds);
        if (missingTags.length > 0) {
          sendError(res, 400, "BAD_REQUEST", "tagIds 无法识别", { field: missingTags.join(",") });
          return;
        }
        const missingCategories = ensureCategoriesExist(data, categoryIds);
        if (missingCategories.length > 0) {
          sendError(res, 400, "BAD_REQUEST", "categoryIds 无法识别", { field: missingCategories.join(",") });
          return;
        }

        const draft: EventDraft = {
          title: payload.title.trim(),
          summary: typeof payload.summary === "string" ? payload.summary.trim() : "",
          time,
          tagIds,
          categoryIds
        };

        if (isContentEditor(auth.user.role)) {
          const approval = recordApproval(data, "create", {
            draft,
            requestedBy: auth.user.id
          });
          writeData(data);
          sendJson(res, 202, { pending: true, approvalId: approval.id });
          return;
        }

        const now = nowIso();
        const event: EventItem = {
          id: createId("evt"),
          title: draft.title,
          summary: draft.summary ?? "",
          time: draft.time,
          tagIds: draft.tagIds,
          categoryIds: draft.categoryIds,
          createdAt: now,
          updatedAt: now,
          createdBy: auth.user.id
        };

        data.events.push(event);
        recordVersion(data, event, "create", auth.user.id);
        writeData(data);
        sendJson(res, 201, event);
        return;
      } catch (error: any) {
        const message = error?.message === "PAYLOAD_TOO_LARGE" ? "请求体太大" : "请求参数错误";
        sendError(res, 400, "BAD_REQUEST", message);
        return;
      }
    }
    if (pathParts.length === 3 && pathParts[2] === "versions" && method === "GET") {
      const eventId = pathParts[1];
      const versions = data.eventVersions.filter((item) => item.eventId === eventId);
      sendJson(res, 200, { items: versions });
      return;
    }

    if (pathParts.length === 3 && pathParts[2] === "restore" && method === "POST") {
      const auth = requireContentManager(req, res, data);
      if (!auth) {
        return;
      }
      const eventId = pathParts[1];
      try {
        const payload = await readJsonBody(req);
        if (typeof payload.versionId !== "string" || payload.versionId.trim() === "") {
          sendError(res, 400, "BAD_REQUEST", "versionId 必须填写", { field: "versionId" });
          return;
        }
        const version = data.eventVersions.find(
          (item) => item.id === payload.versionId && item.eventId === eventId
        );
        if (!version) {
          sendError(res, 404, "NOT_FOUND", "版本不存在");
          return;
        }
        const currentIndex = data.events.findIndex((item) => item.id === eventId);
        const restored: EventItem = {
          ...version.snapshot,
          updatedAt: nowIso()
        };
        if (currentIndex >= 0) {
          data.events[currentIndex] = restored;
        } else {
          data.events.push(restored);
        }
        recordVersion(data, restored, "restore", auth.user.id, `restore:${version.id}`);
        writeData(data);
        sendJson(res, 200, restored);
        return;
      } catch (error: any) {
        const message = error?.message === "BAD_JSON" ? "请求体不是合法 JSON" : "请求参数错误";
        sendError(res, 400, "BAD_REQUEST", message);
        return;
      }
    }

    if (pathParts.length === 2) {
      const eventId = pathParts[1];
      const eventIndex = data.events.findIndex((item) => item.id === eventId);

      if (method === "GET") {
        if (eventIndex < 0) {
          sendError(res, 404, "NOT_FOUND", "事件不存在");
          return;
        }
        sendJson(res, 200, data.events[eventIndex]);
        return;
      }

      if (method === "PATCH") {
        const auth = requireContentWriter(req, res, data);
        if (!auth) {
          return;
        }
        if (eventIndex < 0) {
          sendError(res, 404, "NOT_FOUND", "事件不存在");
          return;
        }
        try {
          const payload = await readJsonBody(req);
          const current = data.events[eventIndex];
          const updated: EventItem = {
            ...current,
            title: payload.title !== undefined ? payload.title : current.title,
            summary: payload.summary !== undefined ? payload.summary : current.summary,
            tagIds: Array.isArray(payload.tagIds) ? payload.tagIds : current.tagIds,
            categoryIds: Array.isArray(payload.categoryIds) ? payload.categoryIds : current.categoryIds,
            time: payload.time ? mergeEventTime(current.time, payload.time) : current.time,
            updatedAt: nowIso()
          };

          if (typeof updated.title !== "string" || updated.title.trim() === "") {
            sendError(res, 400, "BAD_REQUEST", "title 必须填写", { field: "title" });
            return;
          }

          const timeError = validateEventTime(updated.time);
          if (timeError) {
            sendError(res, 400, "BAD_REQUEST", timeError, { field: "time" });
            return;
          }

          const missingTags = ensureTagsExist(data, updated.tagIds);
          if (missingTags.length > 0) {
            sendError(res, 400, "BAD_REQUEST", "tagIds 无法识别", { field: missingTags.join(",") });
            return;
          }

          const missingCategories = ensureCategoriesExist(data, updated.categoryIds);
          if (missingCategories.length > 0) {
            sendError(res, 400, "BAD_REQUEST", "categoryIds 无法识别", {
              field: missingCategories.join(",")
            });
            return;
          }

          const draft: EventDraft = {
            title: updated.title.trim(),
            summary: updated.summary ? updated.summary.trim() : "",
            time: updated.time,
            tagIds: updated.tagIds,
            categoryIds: updated.categoryIds
          };

          if (isContentEditor(auth.user.role)) {
            const approval = recordApproval(data, "update", {
              eventId,
              draft,
              snapshot: current,
              requestedBy: auth.user.id
            });
            writeData(data);
            sendJson(res, 202, { pending: true, approvalId: approval.id });
            return;
          }

          recordVersion(data, current, "update", auth.user.id);
          data.events[eventIndex] = {
            ...updated,
            title: draft.title,
            summary: draft.summary ?? ""
          };
          writeData(data);
          sendJson(res, 200, data.events[eventIndex]);
          return;
        } catch (error: any) {
          sendError(res, 400, "BAD_REQUEST", "请求参数错误");
          return;
        }
      }

      if (method === "DELETE") {
        const auth = requireContentWriter(req, res, data);
        if (!auth) {
          return;
        }
        if (eventIndex < 0) {
          sendError(res, 404, "NOT_FOUND", "事件不存在");
          return;
        }
        const current = data.events[eventIndex];
        if (isContentEditor(auth.user.role)) {
          const approval = recordApproval(data, "delete", {
            eventId,
            snapshot: current,
            requestedBy: auth.user.id
          });
          writeData(data);
          sendJson(res, 202, { pending: true, approvalId: approval.id });
          return;
        }
        recordVersion(data, current, "delete", auth.user.id);
        data.events.splice(eventIndex, 1);
        writeData(data);
        res.writeHead(204);
        res.end();
        return;
      }
    }

    sendError(res, 405, "BAD_REQUEST", "不支持的请求方法");
    return;
  }

  if (pathParts[0] === "tags") {
    const data = readData();

    if (method === "GET") {
      sendJson(res, 200, { items: data.tags });
      return;
    }

    if (method === "POST") {
      const auth = requireContentManager(req, res, data);
      if (!auth) {
        return;
      }
      try {
        const payload = await readJsonBody(req);
        if (typeof payload.name !== "string" || payload.name.trim() === "") {
          sendError(res, 400, "BAD_REQUEST", "name 必须填写", { field: "name" });
          return;
        }
        const tag: TagItem = {
          id: createId("tag"),
          name: payload.name.trim(),
          parentId: payload.parentId ?? null
        };
        data.tags.push(tag);
        writeData(data);
        sendJson(res, 201, tag);
        return;
      } catch (error: any) {
        sendError(res, 400, "BAD_REQUEST", "请求参数错误");
        return;
      }
    }

    if (pathParts.length === 2 && method === "PATCH") {
      const auth = requireContentManager(req, res, data);
      if (!auth) {
        return;
      }
      const tagId = pathParts[1];
      const tagIndex = data.tags.findIndex((item) => item.id === tagId);
      if (tagIndex < 0) {
        sendError(res, 404, "NOT_FOUND", "标签不存在");
        return;
      }
      try {
        const payload = await readJsonBody(req);
        const updated: TagItem = {
          ...data.tags[tagIndex],
          name: payload.name !== undefined ? payload.name : data.tags[tagIndex].name,
          parentId: payload.parentId !== undefined ? payload.parentId : data.tags[tagIndex].parentId
        };
        if (typeof updated.name !== "string" || updated.name.trim() === "") {
          sendError(res, 400, "BAD_REQUEST", "name 必须填写", { field: "name" });
          return;
        }
        data.tags[tagIndex] = { ...updated, name: updated.name.trim() };
        writeData(data);
        sendJson(res, 200, data.tags[tagIndex]);
        return;
      } catch (error: any) {
        sendError(res, 400, "BAD_REQUEST", "请求参数错误");
        return;
      }
    }

    if (pathParts.length === 2 && method === "DELETE") {
      const auth = requireContentManager(req, res, data);
      if (!auth) {
        return;
      }
      const tagId = pathParts[1];
      const tagIndex = data.tags.findIndex((item) => item.id === tagId);
      if (tagIndex < 0) {
        sendError(res, 404, "NOT_FOUND", "标签不存在");
        return;
      }
      data.tags.splice(tagIndex, 1);
      data.events = data.events.map((event) => {
        if (!event.tagIds.includes(tagId)) {
          return event;
        }
        return { ...event, tagIds: event.tagIds.filter((id) => id !== tagId), updatedAt: nowIso() };
      });
      writeData(data);
      res.writeHead(204);
      res.end();
      return;
    }

    sendError(res, 405, "BAD_REQUEST", "不支持的请求方法");
    return;
  }

  if (pathParts[0] === "categories") {
    const data = readData();

    if (method === "GET") {
      sendJson(res, 200, { items: data.categories });
      return;
    }

    if (method === "POST") {
      const auth = requireContentManager(req, res, data);
      if (!auth) {
        return;
      }
      try {
        const payload = await readJsonBody(req);
        if (typeof payload.name !== "string" || payload.name.trim() === "") {
          sendError(res, 400, "BAD_REQUEST", "name 必须填写", { field: "name" });
          return;
        }
        const category: CategoryItem = {
          id: createId("cat"),
          name: payload.name.trim(),
          parentId: payload.parentId ?? null
        };
        data.categories.push(category);
        writeData(data);
        sendJson(res, 201, category);
        return;
      } catch (error: any) {
        sendError(res, 400, "BAD_REQUEST", "请求参数错误");
        return;
      }
    }

    if (pathParts.length === 2 && method === "PATCH") {
      const auth = requireContentManager(req, res, data);
      if (!auth) {
        return;
      }
      const categoryId = pathParts[1];
      const categoryIndex = data.categories.findIndex((item) => item.id === categoryId);
      if (categoryIndex < 0) {
        sendError(res, 404, "NOT_FOUND", "分类不存在");
        return;
      }
      try {
        const payload = await readJsonBody(req);
        const updated: CategoryItem = {
          ...data.categories[categoryIndex],
          name: payload.name !== undefined ? payload.name : data.categories[categoryIndex].name,
          parentId: payload.parentId !== undefined ? payload.parentId : data.categories[categoryIndex].parentId
        };
        if (typeof updated.name !== "string" || updated.name.trim() === "") {
          sendError(res, 400, "BAD_REQUEST", "name 必须填写", { field: "name" });
          return;
        }
        data.categories[categoryIndex] = { ...updated, name: updated.name.trim() };
        writeData(data);
        sendJson(res, 200, data.categories[categoryIndex]);
        return;
      } catch (error: any) {
        sendError(res, 400, "BAD_REQUEST", "请求参数错误");
        return;
      }
    }

    if (pathParts.length === 2 && method === "DELETE") {
      const auth = requireContentManager(req, res, data);
      if (!auth) {
        return;
      }
      const categoryId = pathParts[1];
      const categoryIndex = data.categories.findIndex((item) => item.id === categoryId);
      if (categoryIndex < 0) {
        sendError(res, 404, "NOT_FOUND", "分类不存在");
        return;
      }
      data.categories.splice(categoryIndex, 1);
      data.events = data.events.map((event) => {
        if (!event.categoryIds.includes(categoryId)) {
          return event;
        }
        return {
          ...event,
          categoryIds: event.categoryIds.filter((id) => id !== categoryId),
          updatedAt: nowIso()
        };
      });
      writeData(data);
      res.writeHead(204);
      res.end();
      return;
    }

    sendError(res, 405, "BAD_REQUEST", "不支持的请求方法");
    return;
  }

  sendError(res, 404, "NOT_FOUND", "接口不存在");
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
