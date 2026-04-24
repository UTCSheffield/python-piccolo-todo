const trimTrailingSlash = (value: string): string => value.replace(/\/$/, "");

const isCodespacesHostname = (hostname: string): boolean =>
  hostname.endsWith(".app.github.dev");

const getApiUrlFromBrowserHost = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const { protocol, hostname } = window.location;
  if (!isCodespacesHostname(hostname)) {
    return null;
  }

  const apiHostname = hostname.replace(/-\d+\.app\.github\.dev$/, "-8000.app.github.dev");
  return `${protocol}//${apiHostname}`;
};

export const getApiBaseUrl = (): string => {
  const explicit = import.meta.env.VITE_API_URL as string | undefined;
  if (explicit?.trim()) {
    return trimTrailingSlash(explicit);
  }

  const fromBrowser = getApiUrlFromBrowserHost();
  if (fromBrowser) {
    return fromBrowser;
  }

  // Local fallback. In Vite dev this can still use relative /api via proxy.
  return "http://127.0.0.1:8000";
};