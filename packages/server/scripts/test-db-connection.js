const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { Client } = require("pg");

const resolveEnvPath = () => {
  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, ".env"),
    path.resolve(cwd, "..", ".env"),
    path.resolve(cwd, "..", "..", ".env")
  ];
  return candidates.find((filePath) => fs.existsSync(filePath));
};

const envPath = resolveEnvPath();
if (envPath) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const readRequiredEnv = (key) => {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    throw new Error(`缺少环境变量 ${key}`);
  }
  return value.trim();
};

const pgPortRaw = process.env.PG_PORT ?? "5432";
const pgPort = Number(pgPortRaw);
if (!Number.isInteger(pgPort)) {
  throw new Error("PG_PORT 必须是数字");
}

const host = readRequiredEnv("PG_HOST");
const user = readRequiredEnv("PG_USER");
const password = readRequiredEnv("PG_PASSWORD");
const database = readRequiredEnv("PG_DATABASE");

const baseConfig = {
  host,
  port: pgPort,
  user,
  password,
  database,
  connectionTimeoutMillis: 5000
};

const connectionString = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${pgPort}/${database}`;

const tests = [
  { name: "参数连接 / SSL=关闭", config: { ...baseConfig, ssl: false } },
  { name: "参数连接 / SSL=开启(不校验证书)", config: { ...baseConfig, ssl: { rejectUnauthorized: false } } },
  { name: "参数连接 / SSL=开启(严格校验)", config: { ...baseConfig, ssl: true } },
  { name: "连接串 / 默认", config: { connectionString, connectionTimeoutMillis: 5000 } },
  { name: "连接串 / SSL=关闭", config: { connectionString, ssl: false, connectionTimeoutMillis: 5000 } },
  { name: "连接串 / SSL=开启(不校验证书)", config: { connectionString, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 } }
];

const runTest = async (test) => {
  const client = new Client(test.config);
  try {
    await client.connect();
    await client.query("SELECT 1 AS ok");
    await client.end();
    return { ok: true, name: test.name };
  } catch (error) {
    try {
      await client.end();
    } catch {
      // ignore
    }
    return { ok: false, name: test.name, error };
  }
};

const main = async () => {
  console.log("开始测试数据库连接...");
  console.log(`目标地址: ${host}:${pgPort}`);
  console.log(`数据库: ${database}`);
  console.log(`用户: ${user}`);

  const results = [];
  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);
    if (result.ok) {
      console.log(`✅ 成功: ${result.name}`);
    } else {
      const message = result.error && result.error.message ? result.error.message : String(result.error);
      console.log(`❌ 失败: ${result.name} -> ${message}`);
    }
  }

  const success = results.filter((item) => item.ok).map((item) => item.name);
  if (success.length > 0) {
    console.log("可用连接形式：");
    success.forEach((name) => console.log(`- ${name}`));
    process.exitCode = 0;
    return;
  }
  console.log("所有连接方式都失败，请检查数据库白名单、账号密码、访问策略。");
  process.exitCode = 1;
};

main().catch((error) => {
  console.error("测试程序执行失败：", error);
  process.exit(1);
});
