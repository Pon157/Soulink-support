
export const apiFetch = async (url: string, options: any = {}) => {
  const token = localStorage.getItem('soul_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    localStorage.removeItem('soul_token');
    window.location.href = '/login';
  }
  return response;
};
