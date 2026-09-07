import axios from 'axios';

const TOKEN_KEY = 'blockproof.token';

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t) => {
    try {
      t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((cfg) => {
  const t = tokenStore.get();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const data = err.response?.data;
    const message =
      data?.error?.message ||
      data?.error?.details?.formErrors?.[0] ||
      err.message ||
      'Request failed';
    return Promise.reject({ status: err.response?.status, code: data?.error?.code, message, raw: data });
  },
);

// Small helper for endpoints that return the paginated envelope.
export async function fetchList(url, params) {
  const { data } = await api.get(url, { params });
  return data;
}
