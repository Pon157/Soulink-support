
export const apiFetch = async (url: string, options: any = {}) => {
  const token = localStorage.getItem('soul_token');
  
  const headers: any = {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // Only set application/json if body is not FormData and not already set
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    localStorage.removeItem('soul_token');
    window.location.href = '/login';
  }
  if (response.status === 403) {
    const data = await response.clone().json().catch(() => ({}));
    if (data.error === 'BANNED') {
       window.dispatchEvent(new CustomEvent('user-banned', { detail: data }));
    }
  }
  return response;
};
