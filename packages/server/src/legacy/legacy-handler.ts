import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Pool } from "pg";
import { readRuntimeConfig } from "../config/app-config";
import { RoleName } from "../common/roles.enum";
import { ACCESS_TOKEN_COOKIE } from "../auth/auth.constants";
const bodySizeLimit = 1_000_000;

const runtimeConfig = readRuntimeConfig();
const frontendBaseUrl = String(
  runtimeConfig.APP_URL || runtimeConfig.WEB_ORIGIN || ""
)
  .trim()
  .replace(/\/$/, "");

const readRequiredConfig = (key: keyof typeof runtimeConfig) => {
  const value = runtimeConfig[key];
  const text = value == null ? "" : String(value).trim();
  if (!text) {
    throw new Error(`缺少配置 ${key}`);
  }
  return text;
};
const normalizeIdentifier = (value: string, label: string) => {
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    throw new Error(`${label} 只能包含字母、数字或下划线`);
  }
  return trimmed.toLowerCase();
};

const pgPortRaw = String(runtimeConfig.PG_PORT ?? "5432");
const pgPort = Number(pgPortRaw);
if (!Number.isInteger(pgPort)) {
  throw new Error("PG_PORT 必须是数字");
}

const pgSslEnabled = String(runtimeConfig.PG_SSL ?? "").toLowerCase() === "true";
const pgSsl = pgSslEnabled ? { rejectUnauthorized: false } : undefined;
const schemaName = normalizeIdentifier(runtimeConfig.PG_SCHEMA ?? "public", "PG_SCHEMA");
const tableName = normalizeIdentifier(runtimeConfig.PG_TABLE ?? "app_data", "PG_TABLE");
const qualifiedAppDataTable = `"${schemaName}"."${tableName}"`;

const pool = new Pool({
  host: readRequiredConfig("PG_HOST"),
  port: pgPort,
  user: readRequiredConfig("PG_USER"),
  password: readRequiredConfig("PG_PASSWORD"),
  database: readRequiredConfig("PG_DATABASE"),
  ssl: pgSsl
});

const execQuery = async (sql: string, params: any[] = []) => {
  try {
    return await pool.query(sql, params);
  } catch (error) {
    console.error("SQL 执行失败：", sql, params);
    throw error;
  }
};

const logDbRoles = async () => {
  const result = await execQuery("SELECT current_user, session_user, current_role");
  const row = result.rows[0] ?? {};
  console.log("数据库身份：", row);
};

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
  categoryIds?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
};

type TagItem = {
  id: string;
  name: string;
  parentId?: string | null;
};

type CategoryItem = TagItem;

type UserRole = RoleName;

type UserProfile = {
  phone?: string;
  title?: string;
  organization?: string;
  location?: string;
  bio?: string;
};

type UserItem = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  salt: string;
  createdAt: string;
  profile?: UserProfile;
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
  categoryIds?: string[];
  tags?: TagItem[];
  categories?: CategoryItem[];
};

type EventApproval = {
  id: string;
  action: "create" | "update" | "delete";
  eventId?: string;
  draft?: EventDraft;
  snapshot?: EventItem;
  requestedBy?: string;
  requestedByName?: string;
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

const legacyDataFile = path.resolve(__dirname, "..", "data", "db.json");
const appDataTable = qualifiedAppDataTable;
const appDataId = 1;

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
    role: RoleName.SUPER_ADMIN,
    salt: defaultAdminSalt,
    passwordHash: hashPassword(defaultAdminPassword, defaultAdminSalt),
    createdAt: nowIso(),
    profile: {}
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
    categories: [],
    users: [buildDefaultAdmin()],
    sessions: [],
    eventVersions: [],
    eventApprovals: []
  };
};

const normalizeRole = (value: any): UserRole => {
  if (value === RoleName.SUPER_ADMIN || value === "super_admin") {
    return RoleName.SUPER_ADMIN;
  }
  if (value === RoleName.ADMIN || value === "account_admin" || value === "content_admin" || value === "admin") {
    return RoleName.ADMIN;
  }
  if (value === RoleName.EDITOR || value === "content_editor" || value === "editor") {
    return RoleName.EDITOR;
  }
  return RoleName.USER;
};

type NormalizeResult = {
  data: Database;
  changed: boolean;
};

const normalizeDatabase = (parsed: Partial<Database>): NormalizeResult => {
  let changed = false;
  const normalizedUsers: UserItem[] = Array.isArray(parsed.users)
    ? parsed.users.map((user) => {
        const currentRole = (user as any)?.role;
        const role = normalizeRole(currentRole);
        const profile =
          (user as any)?.profile && typeof (user as any).profile === "object"
            ? (user as any).profile
            : {};
        if (currentRole !== role) {
          changed = true;
        }
        if (!(user as any)?.profile || typeof (user as any).profile !== "object") {
          changed = true;
        }
        return { ...(user as UserItem), role, profile };
      })
    : [];
  let hasSuperAdmin = false;
  const normalizedUsersWithRoles = normalizedUsers.map((user) => {
    if (user.role === RoleName.SUPER_ADMIN) {
      if (hasSuperAdmin) {
        changed = true;
        return { ...user, role: RoleName.ADMIN };
      }
      hasSuperAdmin = true;
    }
    return user;
  });

  const rawEvents = Array.isArray(parsed.events) ? parsed.events : [];
  const rawTags = Array.isArray(parsed.tags) ? parsed.tags : [];
  const rawCategories = Array.isArray(parsed.categories) ? parsed.categories : [];

  const normalized: Database = {
    events: rawEvents,
    tags: rawTags,
    categories: [],
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

  const hasLegacyCategoryIds =
    rawEvents.some((event) => Array.isArray((event as any).categoryIds) && (event as any).categoryIds.length > 0) ||
    normalized.eventVersions.some(
      (version) =>
        Array.isArray((version.snapshot as any)?.categoryIds) &&
        (version.snapshot as any).categoryIds.length > 0
    ) ||
    normalized.eventApprovals.some(
      (approval) =>
        (Array.isArray((approval.draft as any)?.categoryIds) &&
          (approval.draft as any).categoryIds.length > 0) ||
        (Array.isArray((approval.snapshot as any)?.categoryIds) &&
          (approval.snapshot as any).categoryIds.length > 0)
    );

  if (rawCategories.length > 0 || hasLegacyCategoryIds) {
    const tagByName = new Map<string, TagItem>();
    const tagById = new Map<string, TagItem>();
    normalized.tags.forEach((tag) => {
      tagByName.set(normalizeNameKey(tag.name), tag);
      tagById.set(tag.id, tag);
    });

    const createMergedTagId = () => {
      return `tag_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    };

    const categoryIdMap = new Map<string, string>();
    rawCategories.forEach((category) => {
      const rawName = typeof category?.name === "string" ? category.name.trim() : "";
      const name = rawName || category?.id || "未命名标签";
      const key = normalizeNameKey(name);
      if (!key) {
        return;
      }
      let tag = tagByName.get(key);
      if (!tag) {
        let nextId = typeof category?.id === "string" && category.id.trim()
          ? category.id.trim()
          : createMergedTagId();
        if (tagById.has(nextId)) {
          nextId = createMergedTagId();
        }
        tag = {
          id: nextId,
          name,
          parentId: category?.parentId ?? null
        };
        normalized.tags.push(tag);
        tagByName.set(key, tag);
        tagById.set(tag.id, tag);
      }
      if (typeof category?.id === "string" && category.id.trim()) {
        categoryIdMap.set(category.id, tag.id);
      }
    });
    changed = true;

    const mergeTagIds = (tagIds: any, categoryIds: any) => {
      const result: string[] = [];
      const seen = new Set<string>();
      const inputTags = Array.isArray(tagIds) ? tagIds : [];
      const inputCategories = Array.isArray(categoryIds) ? categoryIds : [];
      inputTags.forEach((id) => {
        if (typeof id !== "string") {
          return;
        }
        const trimmed = id.trim();
        if (!trimmed || seen.has(trimmed)) {
          return;
        }
        seen.add(trimmed);
        result.push(trimmed);
      });
      inputCategories.forEach((id) => {
        if (typeof id !== "string") {
          return;
        }
        const trimmed = id.trim();
        if (!trimmed) {
          return;
        }
        const mapped = categoryIdMap.get(trimmed) ?? trimmed;
        if (seen.has(mapped)) {
          return;
        }
        seen.add(mapped);
        result.push(mapped);
      });
      return result;
    };

    normalized.events = normalized.events.map((event) => {
      const mergedTagIds = mergeTagIds(event.tagIds, event.categoryIds);
      if ((event.categoryIds ?? []).length > 0) {
        changed = true;
      }
      return { ...event, tagIds: mergedTagIds, categoryIds: [] };
    });

    normalized.eventVersions = normalized.eventVersions.map((version) => {
      const snapshot = version.snapshot
        ? {
            ...version.snapshot,
            tagIds: mergeTagIds(version.snapshot.tagIds, version.snapshot.categoryIds),
            categoryIds: []
          }
        : version.snapshot;
      return { ...version, snapshot };
    });

    normalized.eventApprovals = normalized.eventApprovals.map((approval) => {
      const draft = approval.draft
        ? {
            ...approval.draft,
            tagIds: mergeTagIds(approval.draft.tagIds, approval.draft.categoryIds),
            categoryIds: []
          }
        : approval.draft;
      const snapshot = approval.snapshot
        ? {
            ...approval.snapshot,
            tagIds: mergeTagIds(approval.snapshot.tagIds, approval.snapshot.categoryIds),
            categoryIds: []
          }
        : approval.snapshot;
      return { ...approval, draft, snapshot };
    });
  }

  if (!hasSuperAdmin) {
    const defaultIndex = normalized.users.findIndex((user) => user.email === defaultAdminEmail);
    if (defaultIndex >= 0) {
      normalized.users[defaultIndex] = {
        ...normalized.users[defaultIndex],
        role: RoleName.SUPER_ADMIN
      };
      changed = true;
    } else {
      normalized.users.push(buildDefaultAdmin());
      changed = true;
    }
  }

  return { data: normalized, changed };
};

const readLegacyData = (): NormalizeResult | null => {
  if (!fs.existsSync(legacyDataFile)) {
    return null;
  }
  const raw = fs.readFileSync(legacyDataFile, "utf-8");
  if (!raw.trim()) {
    return { data: buildSeedData(), changed: true };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<Database>;
    return normalizeDatabase(parsed);
  } catch (error) {
    return { data: buildSeedData(), changed: true };
  }
};

let initPromise: Promise<void> | null = null;

const ensureDatabaseReady = async () => {
  if (initPromise) {
    return initPromise;
  }
  initPromise = (async () => {
    if (schemaName !== "public") {
      await execQuery(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    }
    await logDbRoles();
    await execQuery(
      `CREATE TABLE IF NOT EXISTS ${appDataTable} (
        id integer PRIMARY KEY,
        payload jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT NOW()
      )`
    );

    const existing = await execQuery(`SELECT payload FROM ${appDataTable} WHERE id = $1`, [appDataId]);
    if (existing.rowCount === 0) {
      const legacy = readLegacyData();
      const seed = legacy?.data ?? buildSeedData();
      await execQuery(`INSERT INTO ${appDataTable} (id, payload) VALUES ($1, $2::jsonb)`, [
        appDataId,
        JSON.stringify(seed)
      ]);
      return;
    }

    const payload = (existing.rows[0]?.payload ?? {}) as Partial<Database>;
    const normalized = normalizeDatabase(payload);
    if (normalized.changed) {
      await execQuery(`UPDATE ${appDataTable} SET payload = $1::jsonb, updated_at = NOW() WHERE id = $2`, [
        JSON.stringify(normalized.data),
        appDataId
      ]);
    }
  })();
  return initPromise;
};

const readData = async (): Promise<Database> => {
  await ensureDatabaseReady();
  const result = await execQuery(`SELECT payload FROM ${appDataTable} WHERE id = $1`, [appDataId]);
  const payload = result.rows[0]?.payload as Database | undefined;
  if (!payload) {
    const seed = buildSeedData();
    await execQuery(`INSERT INTO ${appDataTable} (id, payload) VALUES ($1, $2::jsonb)`, [
      appDataId,
      JSON.stringify(seed)
    ]);
    return seed;
  }
  return payload;
};

const writeData = async (data: Database) => {
  await ensureDatabaseReady();
  await execQuery(`UPDATE ${appDataTable} SET payload = $1::jsonb, updated_at = NOW() WHERE id = $2`, [
    JSON.stringify(data),
    appDataId
  ]);
};
const precisionOrder: Record<EventTime["precision"], number> = {
  century: 1,
  decade: 2,
  year: 3,
  month: 4,
  day: 5
};

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE" | "OPTIONS";

const sendJson = (
  res: any,
  status: number,
  data: unknown,
  code = "OK",
  message = "OK"
) => {
  const traceId = res?.req?.traceId ?? crypto.randomUUID();
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(
    JSON.stringify({
      code,
      message,
      data: data ?? null,
      traceId
    })
  );
};

const mapErrorCode = (status: number, code: string) => {
  if (code === "BAD_REQUEST") {
    return "COMMON_400";
  }
  if (code === "NOT_FOUND") {
    return "COMMON_404";
  }
  if (code === "FORBIDDEN") {
    return "PERM_001";
  }
  if (code === "UNAUTHORIZED") {
    return "AUTH_001";
  }
  if (status === 400 && code === "VALID_001") {
    return "VALID_001";
  }
  return code || "COMMON_500";
};

const sendError = (res: any, status: number, code: string, message: string, data?: unknown) => {
  const finalCode = mapErrorCode(status, code);
  sendJson(res, status, data ?? null, finalCode, message);
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
  if (req.body !== undefined) {
    return req.body ?? {};
  }
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

const normalizeNameKey = (value: string) => value.trim().toLowerCase();

const normalizeIdList = (value: any) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    return [value];
  }
  return [];
};

const normalizeInputList = (value: any, extraNames: string[] = []) => {
  const list = normalizeIdList(value).concat(extraNames);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of list) {
    if (typeof item !== "string") {
      continue;
    }
    const trimmed = item.trim();
    if (!trimmed) {
      continue;
    }
    const key = normalizeNameKey(trimmed);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed);
  }
  return result;
};

const collectIncomingNames = (rawItems: any) => {
  const names: string[] = [];
  const nameById = new Map<string, string>();
  if (!Array.isArray(rawItems)) {
    return { names, nameById };
  }
  for (const item of rawItems) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const rawName = (item as any).name;
    const rawId = (item as any).id;
    const name = typeof rawName === "string" ? rawName.trim() : "";
    const id = typeof rawId === "string" ? rawId.trim() : "";
    if (name) {
      names.push(name);
    }
    if (id && name) {
      nameById.set(id, name);
    }
  }
  return { names, nameById };
};

const buildTagMap = (data: Database) => {
  return new Map(data.tags.map((tag) => [tag.id, tag]));
};

const buildEventView = (event: EventItem, tagMap: Map<string, TagItem>) => {
  const tags = event.tagIds
    .map((id) => tagMap.get(id))
    .filter((tag): tag is TagItem => Boolean(tag));
  return { ...event, tags };
};

const resolveTagIds = (data: Database, rawIds: any, rawTags?: any) => {
  const incoming = collectIncomingNames(rawTags);
  const inputs = normalizeInputList(rawIds, incoming.names);
  const idMap = new Map<string, TagItem>();
  const nameMap = new Map<string, TagItem>();
  data.tags.forEach((tag) => {
    idMap.set(tag.id, tag);
    nameMap.set(normalizeNameKey(tag.name), tag);
  });

  const result: string[] = [];
  const seen = new Set<string>();
  for (const input of inputs) {
    let tag = idMap.get(input) ?? nameMap.get(normalizeNameKey(input));
    if (!tag) {
      const incomingName = incoming.nameById.get(input);
      if (incomingName) {
        const key = normalizeNameKey(incomingName);
        tag = nameMap.get(key);
        if (!tag) {
          tag = { id: createId("tag"), name: incomingName, parentId: null };
          data.tags.push(tag);
          idMap.set(tag.id, tag);
          nameMap.set(key, tag);
        }
      }
    }
    if (!tag) {
      const key = normalizeNameKey(input);
      tag = nameMap.get(key);
      if (!tag) {
        tag = { id: createId("tag"), name: input, parentId: null };
        data.tags.push(tag);
        idMap.set(tag.id, tag);
        nameMap.set(key, tag);
      }
    }
    if (!seen.has(tag.id)) {
      seen.add(tag.id);
      result.push(tag.id);
    }
  }
  return result;
};

const resolveUnifiedTagIds = (
  data: Database,
  rawTagIds: any,
  rawTags?: any,
  rawCategoryIds?: any,
  rawCategories?: any
) => {
  const tagInputs = normalizeInputList(rawTagIds, collectIncomingNames(rawTags).names);
  const categoryInputs = normalizeInputList(
    rawCategoryIds,
    collectIncomingNames(rawCategories).names
  );
  const inputs = [...tagInputs, ...categoryInputs];
  const incomingTags: any[] = [];
  if (Array.isArray(rawTags)) {
    incomingTags.push(...rawTags);
  }
  if (Array.isArray(rawCategories)) {
    incomingTags.push(...rawCategories);
  }
  return resolveTagIds(data, inputs, incomingTags);
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
    requestedByName?: string;
  }
) => {
  const approval: EventApproval = {
    id: createId("approval"),
    action,
    eventId: payload.eventId,
    draft: payload.draft,
    snapshot: payload.snapshot ? cloneEvent(payload.snapshot) : undefined,
    requestedBy: payload.requestedBy,
    requestedByName: payload.requestedByName,
    requestedAt: nowIso(),
    status: "pending"
  };
  data.eventApprovals.push(approval);
  return approval;
};

const normalizeProfile = (value: any): UserProfile => {
  if (!value || typeof value !== "object") {
    return {};
  }
  const profile = value as Record<string, any>;
  const read = (key: keyof UserProfile) => {
    const raw = profile[key];
    if (typeof raw !== "string") {
      return undefined;
    }
    const trimmed = raw.trim();
    return trimmed ? trimmed : undefined;
  };
  return {
    phone: read("phone"),
    title: read("title"),
    organization: read("organization"),
    location: read("location"),
    bio: read("bio")
  };
};

const applyProfilePatch = (current: UserProfile | undefined, patch: any): UserProfile => {
  const next: UserProfile = { ...(current ?? {}) };
  if (!patch || typeof patch !== "object") {
    return next;
  }
  const fields: (keyof UserProfile)[] = ["phone", "title", "organization", "location", "bio"];
  fields.forEach((field) => {
    const value = patch[field];
    if (value === null) {
      delete next[field];
      return;
    }
    if (typeof value === "string") {
      next[field] = value.trim();
    }
  });
  return next;
};
const parseCookieHeader = (cookieHeader?: string) => {
  const result: Record<string, string> = {};
  if (!cookieHeader) {
    return result;
  }
  cookieHeader.split(";").forEach((item) => {
    const [rawKey, ...rest] = item.split("=");
    const key = rawKey.trim();
    if (!key) {
      return;
    }
    result[key] = decodeURIComponent(rest.join("=").trim());
  });
  return result;
};

const getAuthToken = (req: any) => {
  const cookies = parseCookieHeader(req.headers?.cookie);
  const cookieToken = cookies[ACCESS_TOKEN_COOKIE];
  if (cookieToken) {
    return cookieToken;
  }
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

const pickPrimaryRole = (roles: RoleName[]) => {
  if (roles.includes(RoleName.SUPER_ADMIN)) {
    return RoleName.SUPER_ADMIN;
  }
  if (roles.includes(RoleName.ADMIN)) {
    return RoleName.ADMIN;
  }
  if (roles.includes(RoleName.EDITOR)) {
    return RoleName.EDITOR;
  }
  return RoleName.USER;
};

const getAuthContext = async (req: any) => {
  const token = getAuthToken(req);
  if (!token) {
    return null;
  }
  const secret = runtimeConfig.JWT_SECRET;
  if (!secret) {
    return null;
  }
  try {
    const payload = jwt.verify(token, secret, {
      issuer: runtimeConfig.JWT_ISSUER ?? "chronoatlas",
      audience: runtimeConfig.JWT_AUDIENCE ?? "chronoatlas-web"
    }) as {
      sub?: string;
      email?: string;
      roles?: RoleName[];
      displayName?: string;
    };
    if (!payload || typeof payload !== "object" || !payload.sub) {
      return null;
    }
    const roles = Array.isArray(payload.roles) ? payload.roles : [RoleName.USER];
    const user = {
      id: payload.sub,
      email: payload.email ?? "",
      displayName: payload.displayName ?? "用户",
      roles,
      role: pickPrimaryRole(roles)
    };
    return { user, token };
  } catch (error) {
    return null;
  }
};

const requireAuth = async (req: any, res: any) => {
  const auth = await getAuthContext(req);
  if (!auth) {
    sendError(res, 401, "AUTH_001", "需要登录后操作");
    return null;
  }
  return auth;
};

const hasContentManagePermission = (role: UserRole) =>
  role === RoleName.SUPER_ADMIN || role === RoleName.ADMIN;
const hasContentWritePermission = (role: UserRole) =>
  role === RoleName.SUPER_ADMIN || role === RoleName.ADMIN || role === RoleName.EDITOR;
const hasContentApprovePermission = (role: UserRole) =>
  role === RoleName.SUPER_ADMIN || role === RoleName.ADMIN;
const isContentEditor = (role: UserRole) => role === RoleName.EDITOR;

const requireContentWriter = async (req: any, res: any) => {
  const auth = await requireAuth(req, res);
  if (!auth) {
    return null;
  }
  if (!hasContentWritePermission(auth.user.role)) {
    sendError(res, 403, "FORBIDDEN", "没有内容权限");
    return null;
  }
  return auth;
};

const requireContentApprover = async (req: any, res: any) => {
  const auth = await requireAuth(req, res);
  if (!auth) {
    return null;
  }
  if (!hasContentApprovePermission(auth.user.role)) {
    sendError(res, 403, "FORBIDDEN", "没有审批权限");
    return null;
  }
  return auth;
};

const requireContentManager = async (req: any, res: any) => {
  const auth = await requireAuth(req, res);
  if (!auth) {
    return null;
  }
  if (!hasContentManagePermission(auth.user.role)) {
    sendError(res, 403, "FORBIDDEN", "没有内容管理权限");
    return null;
  }
  return auth;
};

export const handleLegacyRequest = async (req: any, res: any) => {
  const rawUrl = req.originalUrl ?? req.url ?? "/";
  const requestUrl = new URL(rawUrl, "http://localhost");
  const method = (req.method || "GET") as HttpMethod;
  const pathParts = requestUrl.pathname.split("/").filter(Boolean);

  if (method === "GET" && requestUrl.pathname === "/") {
    const target = frontendBaseUrl || "/";
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

  if (pathParts[0] === "import" && pathParts[1] === "events" && method === "POST") {
    const data = await readData();
    const auth = await requireContentManager(req, res);
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
        const tagIds = resolveUnifiedTagIds(
          data,
          item.tagIds,
          item.tags,
          item.categoryIds,
          item.categories
        );

        const event: EventItem = {
          id: createId("evt"),
          title: item.title.trim(),
          summary: typeof item.summary === "string" ? item.summary.trim() : "",
          time,
          tagIds,
          createdAt: now,
          updatedAt: now,
          createdBy: auth.user.id
        };
        data.events.push(event);
        recordVersion(data, event, "import", auth.user.id);
        created.push(event);
      }
      await writeData(data);
      sendJson(res, 200, { mode, imported: created.length });
      return;
    } catch (error: any) {
      const message = error?.message === "BAD_JSON" ? "请求体不是合法 JSON" : "请求参数错误";
      sendError(res, 400, "BAD_REQUEST", message);
      return;
    }
  }

  if (pathParts[0] === "export" && pathParts[1] === "events" && method === "GET") {
    const data = await readData();
    const tagMap = buildTagMap(data);
    const items = data.events.map((event) => buildEventView(event, tagMap));
    sendJson(res, 200, { exportedAt: nowIso(), total: data.events.length, items });
    return;
  }

  if (pathParts[0] === "events") {
    const data = await readData();

    if (pathParts.length >= 2 && pathParts[1] === "approvals") {
      if (pathParts.length === 2 && method === "GET") {
        const auth = await requireContentApprover(req, res);
        if (!auth) {
          return;
        }
        const statusRaw = requestUrl.searchParams.get("status");
        const status = statusRaw === "approved" || statusRaw === "rejected" ? statusRaw : "pending";
        const items = data.eventApprovals
          .filter((item) => item.status === status)
          .map((item) => ({
            ...item,
            requestedByName: item.requestedByName
          }));
        sendJson(res, 200, { items });
        return;
      }

      if (pathParts.length === 4 && method === "POST") {
        const auth = await requireContentApprover(req, res);
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
              const tagIds = resolveUnifiedTagIds(
                data,
                approval.draft.tagIds,
                approval.draft.tags,
                approval.draft.categoryIds,
                approval.draft.categories
              );
              const now = nowIso();
              const event: EventItem = {
                id: createId("evt"),
                title: approval.draft.title,
                summary: approval.draft.summary ?? "",
                time: approval.draft.time,
                tagIds,
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
              const tagIds = resolveUnifiedTagIds(
                data,
                approval.draft.tagIds,
                approval.draft.tags,
                approval.draft.categoryIds,
                approval.draft.categories
              );
              const current = data.events[eventIndex];
              recordVersion(data, current, "update", auth.user.id, `approval:${approval.id}`);
              data.events[eventIndex] = {
                ...current,
                title: approval.draft.title,
                summary: approval.draft.summary ?? "",
                time: approval.draft.time,
                tagIds,
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
            await writeData(data);
            sendJson(res, 200, { ok: true, approval });
            return;
          }

          if (action === "reject") {
            approval.status = "rejected";
            approval.decidedBy = auth.user.id;
            approval.decidedAt = decidedAt;
            approval.note = note || approval.note;
            await writeData(data);
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
      const legacyCategoryIds = parseIds(requestUrl.searchParams.get("categoryIds"));
      const mergedTagIds = [...new Set([...tagIds, ...legacyCategoryIds])];
      const tagMatch = (requestUrl.searchParams.get("tagMatch") ?? "").toLowerCase();
      const matchAny = tagMatch === "any";
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
      if (mergedTagIds.length === 1) {
        const target = mergedTagIds[0];
        items = items.filter((event) => event.tagIds.includes(target));
      } else if (mergedTagIds.length > 1) {
        if (matchAny) {
          items = items.filter((event) => mergedTagIds.some((id) => event.tagIds.includes(id)));
        } else {
          items = items.filter((event) => mergedTagIds.every((id) => event.tagIds.includes(id)));
        }
      }
      if (keyword) {
        items = items.filter((event) => {
          const titleMatch = event.title.toLowerCase().includes(keyword);
          const summaryMatch = (event.summary ?? "").toLowerCase().includes(keyword);
          return titleMatch || summaryMatch;
        });
      }

      items.sort((a, b) => a.time.start.year - b.time.start.year);

      const tagMap = buildTagMap(data);
      const viewItems = items.map((event) => buildEventView(event, tagMap));
      sendJson(res, 200, { items: viewItems, total: items.length });
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
      const tagMap = buildTagMap(data);
      const viewItems = items.map((event) => buildEventView(event, tagMap));
      sendJson(res, 200, { items: viewItems, total: items.length });
      return;
    }

    if (pathParts.length === 2 && pathParts[1] === "aggregations" && method === "GET") {
      const tagStats = data.tags.map((tag) => {
        const count = data.events.filter((event) => event.tagIds.includes(tag.id)).length;
        return { id: tag.id, name: tag.name, count };
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
        tags: tagStats
      });
      return;
    }

    if (pathParts.length === 1 && method === "POST") {
      const auth = await requireContentWriter(req, res);
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

        const resolvedTagIds = resolveUnifiedTagIds(
          data,
          payload.tagIds,
          payload.tags,
          payload.categoryIds,
          payload.categories
        );

        const draft: EventDraft = {
          title: payload.title.trim(),
          summary: typeof payload.summary === "string" ? payload.summary.trim() : "",
          time,
          tagIds: resolvedTagIds
        };

        if (isContentEditor(auth.user.role)) {
          const approval = recordApproval(data, "create", {
            draft,
            requestedBy: auth.user.id,
            requestedByName: auth.user.displayName
          });
          await writeData(data);
          sendJson(res, 202, { pending: true, approvalId: approval.id });
          return;
        }

        const now = nowIso();
        const event: EventItem = {
          id: createId("evt"),
          title: draft.title,
          summary: draft.summary ?? "",
          time: draft.time,
          tagIds: resolvedTagIds,
          createdAt: now,
          updatedAt: now,
          createdBy: auth.user.id
        };

        data.events.push(event);
        recordVersion(data, event, "create", auth.user.id);
        await writeData(data);
        const tagMap = buildTagMap(data);
        sendJson(res, 201, buildEventView(event, tagMap));
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
      const auth = await requireContentManager(req, res);
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
        await writeData(data);
        const tagMap = buildTagMap(data);
        sendJson(res, 200, buildEventView(restored, tagMap));
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
        const tagMap = buildTagMap(data);
        sendJson(res, 200, buildEventView(data.events[eventIndex], tagMap));
        return;
      }

      if (method === "PATCH") {
        const auth = await requireContentWriter(req, res);
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
          const tagIds = resolveUnifiedTagIds(
            data,
            payload.tagIds !== undefined ? payload.tagIds : current.tagIds,
            payload.tags,
            payload.categoryIds !== undefined ? payload.categoryIds : current.categoryIds,
            payload.categories
          );
          const updated: EventItem = {
            ...current,
            title: payload.title !== undefined ? payload.title : current.title,
            summary: payload.summary !== undefined ? payload.summary : current.summary,
            tagIds,
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

          const draft: EventDraft = {
            title: updated.title.trim(),
            summary: updated.summary ? updated.summary.trim() : "",
            time: updated.time,
            tagIds
          };

          if (isContentEditor(auth.user.role)) {
            const approval = recordApproval(data, "update", {
              eventId,
              draft,
              snapshot: current,
              requestedBy: auth.user.id,
              requestedByName: auth.user.displayName
            });
            await writeData(data);
            sendJson(res, 202, { pending: true, approvalId: approval.id });
            return;
          }

          recordVersion(data, current, "update", auth.user.id);
          data.events[eventIndex] = {
            ...updated,
            title: draft.title,
            summary: draft.summary ?? ""
          };
          await writeData(data);
          const tagMap = buildTagMap(data);
          sendJson(res, 200, buildEventView(data.events[eventIndex], tagMap));
          return;
        } catch (error: any) {
          sendError(res, 400, "BAD_REQUEST", "请求参数错误");
          return;
        }
      }

      if (method === "DELETE") {
        const auth = await requireContentWriter(req, res);
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
            requestedBy: auth.user.id,
            requestedByName: auth.user.displayName
          });
          await writeData(data);
          sendJson(res, 202, { pending: true, approvalId: approval.id });
          return;
        }
        recordVersion(data, current, "delete", auth.user.id);
        data.events.splice(eventIndex, 1);
        await writeData(data);
        sendJson(res, 200, { ok: true });
        return;
      }
    }

    sendError(res, 405, "BAD_REQUEST", "不支持的请求方法");
    return;
  }

  if (pathParts[0] === "tags") {
    const data = await readData();

    if (method === "GET") {
      sendJson(res, 200, { items: data.tags });
      return;
    }

    if (method === "POST") {
      const auth = await requireContentManager(req, res);
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
        await writeData(data);
        sendJson(res, 201, tag);
        return;
      } catch (error: any) {
        sendError(res, 400, "BAD_REQUEST", "请求参数错误");
        return;
      }
    }

    if (pathParts.length === 2 && method === "PATCH") {
      const auth = await requireContentManager(req, res);
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
        await writeData(data);
        sendJson(res, 200, data.tags[tagIndex]);
        return;
      } catch (error: any) {
        sendError(res, 400, "BAD_REQUEST", "请求参数错误");
        return;
      }
    }

    if (pathParts.length === 2 && method === "DELETE") {
      const auth = await requireContentManager(req, res);
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
      await writeData(data);
      sendJson(res, 200, { ok: true });
      return;
    }

    sendError(res, 405, "BAD_REQUEST", "不支持的请求方法");
    return;
  }

  sendError(res, 404, "NOT_FOUND", "接口不存在");
};





