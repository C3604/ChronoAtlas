const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const configPath = path.resolve(process.cwd(), "data", "app-config.json");

const readConfig = () => {
  if (!fs.existsSync(configPath)) {
    throw new Error("未找到 app-config.json，请先完成初始化配置");
  }
  const raw = fs.readFileSync(configPath, "utf-8");
  if (!raw.trim()) {
    throw new Error("app-config.json 内容为空，请先完成初始化配置");
  }
  return JSON.parse(raw);
};

const ensureText = (value, label) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} 未配置`);
  }
  return value.trim();
};

const config = readConfig();
const db = config.database || {};

const host = ensureText(db.host, "PG_HOST");
const user = ensureText(db.user, "PG_USER");
const password = ensureText(db.password, "PG_PASSWORD");
const database = ensureText(db.database, "PG_DATABASE");
const pgPort = Number(db.port || 5432);
const sslEnabled = Boolean(db.ssl);

if (!Number.isInteger(pgPort)) {
  throw new Error("PG_PORT 必须是数字");
}

const baseConfig = {
  host,
  port: pgPort,
  user,
  password,
  database,
  ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 5000
};

const runTest = async () => {
  const client = new Client(baseConfig);
  try {
    await client.connect();
    await client.query("SELECT 1 AS ok");
    await client.end();
    return { ok: true };
  } catch (error) {
    try {
      await client.end();
    } catch {}
    return { ok: false, error };
  }
};

const main = async () => {
  console.log("开始测试数据库连接...");
  console.log(`目标地址: ${host}:${pgPort}`);
  console.log(`数据库: ${database}`);
  console.log(`用户: ${user}`);

  const result = await runTest();
  if (result.ok) {
    console.log("✅ 连接成功");
    process.exitCode = 0;
    return;
  }
  const message = result.error && result.error.message ? result.error.message : String(result.error);
  console.log(`❌ 连接失败: ${message}`);
  process.exitCode = 1;
};

main().catch((error) => {
  console.error("测试程序执行失败：", error);
  process.exit(1);
});
