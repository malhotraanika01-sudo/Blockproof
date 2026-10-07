import axios from 'axios';

// The access token lives ONLY in memory for the life of the tab — never in
// localStorage/sessionStorage. localStorage is readable by any script on the
// page, so a single XSS hole anywhere would hand over the token; keeping it
// out of storage means there's nothing there to steal. The tradeoff is that
// a page reload loses it, which is why AuthProvider calls POST /auth/refresh
// on mount to get a new one from the httpOnly refresh cookie (see auth.jsx).
let accessToken = null;
export const tokenStore = {
  get: () => accessToken,
  set: (t) => {
    accessToken = t;
  },
};

// In dev, Vite proxies relative '/api' to the local server (see vite.config.js).
// In production, frontend and backend are deployed separately (Vercel + Render),
// so the backend's absolute URL must be baked in at build time.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  // The refresh/logout endpoints authenticate via an httpOnly cookie instead
  // of the Authorization header — this makes sure that cookie actually gets
  // sent (and set) on cross-origin requests in production.
  withCredentials: true,
});

api.interceptors.request.use((cfg) => {
  if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`;
  return cfg;
});

let refreshing = null;

/** POST /auth/refresh using the httpOnly cookie; caches a single in-flight call. */
function refreshAccessToken() {
  if (!refreshing) {
    refreshing = axios
      .post(`${api.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true })
      .then(({ data }) => {
        accessToken = data.accessToken;
        return data;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err.config;
    const isAuthEndpoint = original?.url?.includes('/auth/');
    if (err.response?.status === 401 && !original?._retried && !isAuthEndpoint) {
      original._retried = true;
      try {
        await refreshAccessToken();
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        accessToken = null;
        // fall through to the normal error shape below
      }
    }

    const data = err.response?.data;
    const message =
      data?.error?.message ||
      data?.error?.details?.formErrors?.[0] ||
      err.message ||
      'Request failed';
    return Promise.reject({ status: err.response?.status, code: data?.error?.code, message, raw: data });
  },
);

export { refreshAccessToken };

// Small helper for endpoints that return the paginated envelope.
export async function fetchList(url, params) {
  const { data } = await api.get(url, { params });
  return data;
}
