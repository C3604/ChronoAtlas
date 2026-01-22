import crypto from "crypto";
import fs from "fs";
import path from "path";

export type AppConfig = {
  version: number;
  setup: {
    completed: boolean;
    completedAt: string | null;
  };
  ports: {
    backend: number;
    frontend: number;
  };
  app: {
    webOrigin: string;
    appUrl: string;
  };
  security: {
    jwtSecret: string;
    jwtRefreshSecret: string;
    jwtExpiresIn: string;
    jwtRefreshExpiresIn: string;
    jwtIssuer: string;
    jwtAudience: string;
    csrfCookieName: string;
  };
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    ssl: boolean;
    schema: string;
    table: string;
  };
  bootstrapAdmin: {
    email: string;
    password: string;
    name: string;
  };
  rateLimit: {
    ttl: number;
    limit: number;
  };
  mailDev: {
    output: "log" | "file" | "off";
    dir: string;
  };
  emailPolicy: {
    verifyTtlMinutes: number;
    resetTtlMinutes: number;
  };
};

export type RuntimeConfig = {
  NODE_ENV?: string;
  PORT: number;
  WEB_ORIGIN: string;
  APP_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
  EMAIL_VERIFY_TTL_MINUTES: number;
  PASSWORD_RESET_TTL_MINUTES: number;
  CSRF_COOKIE_NAME: string;
  RATE_LIMIT_TTL: number;
  RATE_LIMIT_LIMIT: number;
  MAIL_DEV_OUTPUT: string;
  MAIL_DEV_DIR: string;
  BOOTSTRAP_ADMIN_EMAIL: string;
  BOOTSTRAP_ADMIN_PASSWORD: string;
  BOOTSTRAP_ADMIN_NAME: string;
  PG_HOST: string;
  PG_PORT: number;
  PG_USER: string;
  PG_PASSWORD: string;
  PG_DATABASE: string;
  PG_SSL: string;
  PG_SCHEMA: string;
  PG_TABLE: string;
};

const CONFIG_FILE = path.resolve(process.cwd(), "data", "app-config.json");

const defaultPorts = {
  backend: 3000,
  frontend: 5173
};

const defaultConfig: AppConfig = {
  version: 1,
  setup: {
    completed: false,
    completedAt: null
  },
  ports: defaultPorts,
  app: {
    webOrigin: `http://localhost:${defaultPorts.frontend}`,
    appUrl: `http://localhost:${defaultPorts.frontend}`
  },
  security: {
    jwtSecret: "",
    jwtRefreshSecret: "",
    jwtExpiresIn: "15m",
    jwtRefreshExpiresIn: "7d",
    jwtIssuer: "chronoatlas",
    jwtAudience: "chronoatlas-web",
    csrfCookieName: "csrf_token"
  },
  database: {
    host: "",
    port: 5432,
    user: "",
    password: "",
    database: "",
    ssl: false,
    schema: "public",
    table: "app_data"
  },
  bootstrapAdmin: {
    email: "admin@chronoatlas.local",
    password: "admin123",
    name: "\u7BA1\u7406\u5458"
  },
  rateLimit: {
    ttl: 60,
    limit: 30
  },
  mailDev: {
    output: "log",
    dir: "mail_outbox"
  },
  emailPolicy: {
    verifyTtlMinutes: 1440,
    resetTtlMinutes: 30
  }
};

const ensureString = (value: unknown, fallback: string) => {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : fallback;
};

const ensureNumber = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return Math.round(parsed);
    }
  }
  return fallback;
};

const ensureBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }
  return fallback;
};

const normalizeMailOutput = (value: unknown) => {
  if (value === "log" || value === "file" || value === "off") {
    return value;
  }
  return defaultConfig.mailDev.output;
};

const sanitizeIdentifier = (value: unknown, fallback: string) => {
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

const normalizePorts = (ports: any) => {
  const backend = ensureNumber(ports?.backend, defaultConfig.ports.backend);
  const frontend = ensureNumber(ports?.frontend, defaultConfig.ports.frontend);
  return {
    backend: backend > 0 ? backend : defaultConfig.ports.backend,
    frontend: frontend > 0 ? frontend : defaultConfig.ports.frontend
  };
};

const normalizeWebOrigin = (value: string, frontendPort: number) => {
  if (!value) {
    return value;
  }
  if (frontendPort === 80) {
    return value.replace(/:80$/, "");
  }
  return value;
};

const normalizeConfig = (raw: any): AppConfig => {
  const ports = normalizePorts(raw?.ports);
  const rawOrigin = ensureString(raw?.app?.webOrigin, `http://localhost:${ports.frontend}`);
  const webOrigin = normalizeWebOrigin(rawOrigin, ports.frontend);
  const rawAppUrl = ensureString(raw?.app?.appUrl, webOrigin);
  const appUrl = normalizeWebOrigin(rawAppUrl, ports.frontend);
  const databaseHost = ensureString(raw?.database?.host, defaultConfig.database.host);
  const databaseUser = ensureString(raw?.database?.user, defaultConfig.database.user);
  const databasePassword = ensureString(raw?.database?.password, defaultConfig.database.password);
  const databaseName = ensureString(raw?.database?.database, defaultConfig.database.database);
  const hasDatabase =
    Boolean(databaseHost) &&
    Boolean(databaseUser) &&
    Boolean(databasePassword) &&
    Boolean(databaseName);

  const completed = Boolean(raw?.setup?.completed) || hasDatabase;
  const completedAt =
    ensureString(raw?.setup?.completedAt, "") || (completed ? new Date().toISOString() : null);

  return {
    version: 1,
    setup: {
      completed,
      completedAt
    },
    ports,
    app: {
      webOrigin,
      appUrl
    },
    security: {
      jwtSecret: ensureString(raw?.security?.jwtSecret, defaultConfig.security.jwtSecret),
      jwtRefreshSecret: ensureString(raw?.security?.jwtRefreshSecret, defaultConfig.security.jwtRefreshSecret),
      jwtExpiresIn: ensureString(raw?.security?.jwtExpiresIn, defaultConfig.security.jwtExpiresIn),
      jwtRefreshExpiresIn: ensureString(
        raw?.security?.jwtRefreshExpiresIn,
        defaultConfig.security.jwtRefreshExpiresIn
      ),
      jwtIssuer: ensureString(raw?.security?.jwtIssuer, defaultConfig.security.jwtIssuer),
      jwtAudience: ensureString(raw?.security?.jwtAudience, defaultConfig.security.jwtAudience),
      csrfCookieName: ensureString(raw?.security?.csrfCookieName, defaultConfig.security.csrfCookieName)
    },
    database: {
      host: databaseHost,
      port: ensureNumber(raw?.database?.port, defaultConfig.database.port),
      user: databaseUser,
      password: databasePassword,
      database: databaseName,
      ssl: ensureBoolean(raw?.database?.ssl, defaultConfig.database.ssl),
      schema: sanitizeIdentifier(raw?.database?.schema, defaultConfig.database.schema),
      table: sanitizeIdentifier(raw?.database?.table, defaultConfig.database.table)
    },
    bootstrapAdmin: {
      email: ensureString(raw?.bootstrapAdmin?.email, defaultConfig.bootstrapAdmin.email),
      password: ensureString(raw?.bootstrapAdmin?.password, defaultConfig.bootstrapAdmin.password),
      name: ensureString(raw?.bootstrapAdmin?.name, defaultConfig.bootstrapAdmin.name)
    },
    rateLimit: {
      ttl: ensureNumber(raw?.rateLimit?.ttl, defaultConfig.rateLimit.ttl),
      limit: ensureNumber(raw?.rateLimit?.limit, defaultConfig.rateLimit.limit)
    },
    mailDev: {
      output: normalizeMailOutput(raw?.mailDev?.output),
      dir: ensureString(raw?.mailDev?.dir, defaultConfig.mailDev.dir)
    },
    emailPolicy: {
      verifyTtlMinutes: ensureNumber(
        raw?.emailPolicy?.verifyTtlMinutes,
        defaultConfig.emailPolicy.verifyTtlMinutes
      ),
      resetTtlMinutes: ensureNumber(
        raw?.emailPolicy?.resetTtlMinutes,
        defaultConfig.emailPolicy.resetTtlMinutes
      )
    }
  };
};

const ensureSecrets = (config: AppConfig): AppConfig => {
  const next = { ...config, security: { ...config.security } };
  if (!next.security.jwtSecret) {
    next.security.jwtSecret = crypto.randomBytes(32).toString("hex");
  }
  if (!next.security.jwtRefreshSecret) {
    next.security.jwtRefreshSecret = crypto.randomBytes(32).toString("hex");
  }
  return next;
};

export const readAppConfig = (): AppConfig => {
  if (!fs.existsSync(CONFIG_FILE)) {
    return defaultConfig;
  }
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    if (!raw.trim()) {
      return defaultConfig;
    }
    const parsed = JSON.parse(raw);
    return normalizeConfig(parsed);
  } catch {
    return defaultConfig;
  }
};

export const writeAppConfig = (config: AppConfig) => {
  const dir = path.dirname(CONFIG_FILE);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
};

export const getConfigFilePath = () => CONFIG_FILE;

export const isDatabaseConfigured = (config: AppConfig) => {
  return Boolean(
    config.database.host &&
      config.database.user &&
      config.database.password &&
      config.database.database
  );
};

export const isSetupCompleted = (config: AppConfig) => {
  return config.setup.completed && isDatabaseConfigured(config);
};

export const readRuntimeConfig = (): RuntimeConfig => {
  const config = ensureSecrets(readAppConfig());
  if (!fs.existsSync(CONFIG_FILE)) {
    writeAppConfig(config);
  } else {
    const stored = readAppConfig();
    if (
      stored.security.jwtSecret !== config.security.jwtSecret ||
      stored.security.jwtRefreshSecret !== config.security.jwtRefreshSecret
    ) {
      writeAppConfig(config);
    }
  }
  return {
    PORT: config.ports.backend,
    WEB_ORIGIN: config.app.webOrigin,
    APP_URL: config.app.appUrl,
    JWT_SECRET: config.security.jwtSecret,
    JWT_REFRESH_SECRET: config.security.jwtRefreshSecret,
    JWT_EXPIRES_IN: config.security.jwtExpiresIn,
    JWT_REFRESH_EXPIRES_IN: config.security.jwtRefreshExpiresIn,
    JWT_ISSUER: config.security.jwtIssuer,
    JWT_AUDIENCE: config.security.jwtAudience,
    EMAIL_VERIFY_TTL_MINUTES: config.emailPolicy.verifyTtlMinutes,
    PASSWORD_RESET_TTL_MINUTES: config.emailPolicy.resetTtlMinutes,
    CSRF_COOKIE_NAME: config.security.csrfCookieName,
    RATE_LIMIT_TTL: config.rateLimit.ttl,
    RATE_LIMIT_LIMIT: config.rateLimit.limit,
    MAIL_DEV_OUTPUT: config.mailDev.output,
    MAIL_DEV_DIR: config.mailDev.dir,
    BOOTSTRAP_ADMIN_EMAIL: config.bootstrapAdmin.email,
    BOOTSTRAP_ADMIN_PASSWORD: config.bootstrapAdmin.password,
    BOOTSTRAP_ADMIN_NAME: config.bootstrapAdmin.name,
    PG_HOST: config.database.host,
    PG_PORT: config.database.port,
    PG_USER: config.database.user,
    PG_PASSWORD: config.database.password,
    PG_DATABASE: config.database.database,
    PG_SSL: config.database.ssl ? "true" : "false",
    PG_SCHEMA: config.database.schema,
    PG_TABLE: config.database.table
  };
};
