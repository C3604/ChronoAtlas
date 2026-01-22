type ClientConfig = {
  apiBase: string;
  csrfCookieName: string;
};

declare const __APP_CONFIG__: Partial<ClientConfig> | undefined;

const defaultConfig: ClientConfig = {
  apiBase: typeof window !== "undefined" ? window.location.origin : "",
  csrfCookieName: "csrf_token"
};

const injected = typeof __APP_CONFIG__ === "object" && __APP_CONFIG__ ? __APP_CONFIG__ : {};

export const clientConfig: ClientConfig = {
  ...defaultConfig,
  ...injected
};
