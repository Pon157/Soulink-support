import { apiFetch } from './api';

export const uploadFile = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const res = await apiFetch('/api/upload', {
    method: 'POST',
    body: formData,
    // Внимание: для FormData не нужно указывать Content-Type вручную, браузер сделает это сам
  });

  if (!res.ok) throw new Error('Failed to upload file');
  const data = await res.json();
  return data.url;
};

export const updateProfile = async (data: { nickname?: string, avatar?: string }) => {
  const res = await apiFetch('/api/users/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update profile');
  return res.json();
};
