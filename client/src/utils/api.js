const RAW_BASE = import.meta.env.VITE_API_BASE_URL || '';
export const API_BASE = RAW_BASE.replace(/\/+$/, '');

export function apiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE || API_BASE === '/api') {
    return cleanPath;
  }
  return `${API_BASE}${cleanPath}`;
}
