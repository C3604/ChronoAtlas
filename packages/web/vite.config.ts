import fs from "fs";
import path from "path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import Components from "unplugin-vue-components/vite";
import { AntDesignVueResolver } from "unplugin-vue-components/resolvers";

const configPath = path.resolve(__dirname, "..", "server", "data", "app-config.json");

const readAppConfig = () => {
  try {
    if (!fs.existsSync(configPath)) {
      return null;
    }
    const raw = fs.readFileSync(configPath, "utf-8");
    if (!raw.trim()) {
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const toNumber = (value: unknown, fallback: number) => {
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

export default defineConfig(() => {
  const appConfig = readAppConfig();
  const backendPort = toNumber(appConfig?.ports?.backend, 3000);
  const frontendPort = toNumber(appConfig?.ports?.frontend, 5173);
  const apiBase = `http://localhost:${backendPort}`;
  const csrfCookieName = appConfig?.security?.csrfCookieName || "csrf_token";

  return {
    plugins: [
      vue(),
      Components({
        resolvers: [
          AntDesignVueResolver({
            importStyle: false
          })
        ]
      })
    ],
    server: { port: frontendPort, host: "localhost" },
    define: {
      __APP_CONFIG__: JSON.stringify({ apiBase, csrfCookieName })
    },
    // @ts-ignore
    test: {
      globals: true,
      environment: "jsdom"
    }
  };
});
