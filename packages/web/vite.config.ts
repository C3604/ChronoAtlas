import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import Components from "unplugin-vue-components/vite";
import { AntDesignVueResolver } from "unplugin-vue-components/resolvers";

const parsePort = (value?: string): number | undefined => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const numeric = Number(trimmed);
  if (Number.isInteger(numeric) && numeric > 0) {
    return numeric;
  }

  try {
    const url = new URL(trimmed);
    if (url.port) {
      return Number(url.port);
    }
  } catch {}

  const match = trimmed.match(/:(\d{2,5})/);
  return match ? Number(match[1]) : undefined;
};

const resolveFrontendPort = (env: Record<string, string>): number | undefined => {
  const candidates = [
    env.VITE_DEV_SERVER_PORT,
    env.WEB_ORIGIN,
    env.APP_URL,
  ];

  for (const candidate of candidates) {
    const port = parsePort(candidate);
    if (port) {
      return port;
    }
  }

  return undefined;
};

export default defineConfig(({ mode }) => {
  const envDir = "../../";
  const env = loadEnv(mode, envDir, "");
  const port = resolveFrontendPort(env) ?? 5173;

  return {
    plugins: [
      vue(),
      Components({
        resolvers: [
          AntDesignVueResolver({
            importStyle: false, // css in js
          }),
        ],
      }),
    ],
    envDir,
    server: { port, host: "127.0.0.1" },
    // @ts-ignore
    test: {
      globals: true,
      environment: "jsdom",
    },
  };
});
