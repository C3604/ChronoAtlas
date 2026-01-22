import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import os from "os";
import path from "path";
import fs from "fs";
import { Client } from "pg";
import {
  AppConfig,
  isSetupCompleted,
  readAppConfig,
  writeAppConfig
} from "../config/app-config";

type CheckItem = {
  key: string;
  label: string;
  required: string;
  current: string;
  ok: boolean;
  message?: string;
};

type DbPayload = {
  host: string;
  port?: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean;
  schema?: string;
  table?: string;
};

type PortPayload = {
  backendPort: number;
  frontendPort: number;
};

const formatBytes = (bytes: number) => {
  const gb = bytes / 1024 / 1024 / 1024;
  return `${gb.toFixed(1)} GB`;
};

const parsePort = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const ensureNonEmpty = (value: unknown) => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
};

const normalizeIdentifier = (value: unknown, fallback: string) => {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return fallback;
  }
  return trimmed.toLowerCase();
};

const buildLocalOrigin = (port: number) => {
  if (port === 80) {
    return "http://localhost";
  }
  return `http://localhost:${port}`;
};

@Injectable()
export class SetupService {
  getStatus() {
    const config = readAppConfig();
    const required = !isSetupCompleted(config);
    return {
      required,
      ports: {
        backendPort: config.ports.backend,
        frontendPort: config.ports.frontend
      },
      app: {
        webOrigin: config.app.webOrigin,
        appUrl: config.app.appUrl
      }
    };
  }

  getChecks(): { items: CheckItem[] } {
    const nodeVersion = process.versions.node;
    const major = Number(nodeVersion.split(".")[0] || 0);
    const nodeOk = major >= 18;

    const totalMemory = os.totalmem();
    const memoryOk = totalMemory >= 4 * 1024 * 1024 * 1024;

    const cpuCores = os.cpus()?.length ?? 0;
    const cpuOk = cpuCores >= 2;

    const serverModules = path.resolve(process.cwd(), "node_modules");
    const webModules = path.resolve(process.cwd(), "..", "web", "node_modules");
    const serverDepsOk = fs.existsSync(serverModules);
    const webDepsOk = fs.existsSync(webModules);

    const items: CheckItem[] = [
      {
        key: "node",
        label: "Node.js 版本",
        required: "建议 >= 18",
        current: `v${nodeVersion}`,
        ok: nodeOk
      },
      {
        key: "cpu",
        label: "CPU 核心数",
        required: "建议 >= 2",
        current: `${cpuCores}`,
        ok: cpuOk
      },
      {
        key: "memory",
        label: "系统内存",
        required: "建议 >= 4 GB",
        current: formatBytes(totalMemory),
        ok: memoryOk
      },
      {
        key: "serverDeps",
        label: "后端依赖",
        required: "已安装",
        current: serverDepsOk ? "已安装" : "缺失",
        ok: serverDepsOk
      },
      {
        key: "webDeps",
        label: "前端依赖",
        required: "已安装",
        current: webDepsOk ? "已安装" : "缺失",
        ok: webDepsOk
      }
    ];

    return { items };
  }

  private normalizeDbPayload(payload: DbPayload) {
    const host = ensureNonEmpty(payload.host);
    const user = ensureNonEmpty(payload.user);
    const password = ensureNonEmpty(payload.password);
    const database = ensureNonEmpty(payload.database);
    const port = parsePort(payload.port, 5432);
    const ssl = Boolean(payload.ssl);
    const schema = normalizeIdentifier(payload.schema, "public");
    const table = normalizeIdentifier(payload.table, "app_data");

    return { host, user, password, database, port, ssl, schema, table };
  }

  async testDatabaseConnection(payload: DbPayload) {
    const normalized = this.normalizeDbPayload(payload);
    if (!normalized.host || !normalized.user || !normalized.password || !normalized.database) {
      throw new BadRequestException({ code: "SETUP_DB_001", message: "数据库信息填写不完整" });
    }
    if (normalized.port <= 0 || normalized.port > 65535) {
      throw new BadRequestException({ code: "SETUP_DB_002", message: "数据库端口不合法" });
    }

    const client = new Client({
      host: normalized.host,
      port: normalized.port,
      user: normalized.user,
      password: normalized.password,
      database: normalized.database,
      ssl: normalized.ssl ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 5000
    });

    try {
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      return { ok: true, message: "数据库连接成功" };
    } catch (error: any) {
      try {
        await client.end();
      } catch {}
      const message = error?.message ? String(error.message) : "数据库连接失败";
      return { ok: false, message };
    }
  }

  async saveConfig(payload: { database: DbPayload; ports: PortPayload }) {
    const config = readAppConfig();
    if (isSetupCompleted(config)) {
      throw new ForbiddenException({ code: "SETUP_001", message: "系统已完成初始化" });
    }

    const backendPort = parsePort(payload?.ports?.backendPort, config.ports.backend);
    const frontendPort = parsePort(payload?.ports?.frontendPort, config.ports.frontend);
    if (backendPort <= 0 || backendPort > 65535 || frontendPort <= 0 || frontendPort > 65535) {
      throw new BadRequestException({ code: "SETUP_002", message: "端口配置不合法" });
    }

    const dbNormalized = this.normalizeDbPayload(payload.database);
    const testResult = await this.testDatabaseConnection(payload.database);
    if (!testResult.ok) {
      throw new BadRequestException({ code: "SETUP_003", message: testResult.message });
    }

    const now = new Date().toISOString();
    const webOrigin = buildLocalOrigin(frontendPort);
    const next: AppConfig = {
      ...config,
      ports: {
        backend: backendPort,
        frontend: frontendPort
      },
      app: {
        webOrigin,
        appUrl: webOrigin
      },
      database: {
        ...config.database,
        host: dbNormalized.host,
        port: dbNormalized.port,
        user: dbNormalized.user,
        password: dbNormalized.password,
        database: dbNormalized.database,
        ssl: dbNormalized.ssl,
        schema: dbNormalized.schema,
        table: dbNormalized.table
      },
      setup: {
        completed: true,
        completedAt: now
      }
    };

    writeAppConfig(next);
    return {
      ok: true,
      message: "配置已保存，请重启后端与前端服务"
    };
  }
}
