import React from 'react';

interface UserAvatarProps {
  user?: {
    id?: string;
    nickname?: string;
    avatar?: string;
  };
  size?: number;
  className?: string;
}

const COLORS = [
  'bg-rose-500',    'bg-emerald-500', 'bg-amber-500',
  'bg-blue-500',    'bg-indigo-500',  'bg-violet-500',
  'bg-fuchsia-500', 'bg-pink-500',    'bg-cyan-500',
  'bg-teal-500',    'bg-orange-500',  'bg-lime-500',
];

// Берём все символы строки для равномерного распределения
const hashStr = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

export const UserAvatar: React.FC<UserAvatarProps> = ({ user, size = 40, className = '' }) => {
  if (!user) return null;

  // Показываем аватарку только если это реально загруженный файл (не пустая строка, не null)
  const hasAvatar = !!user.avatar && user.avatar.trim().length > 0;

  if (hasAvatar) {
    return (
      <img
        src={user.avatar}
        alt={user.nickname ?? ''}
        className={`object-cover rounded-2xl ${className}`}
        style={{ width: size, height: size }}
        onError={(e) => {
          // Если картинка не загрузилась — скрываем img, ниже покажем инициал
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  const seed  = user.id ?? user.nickname ?? 'default';
  const color = COLORS[hashStr(seed) % COLORS.length];
  const initial = user.nickname ? user.nickname.charAt(0).toUpperCase() : '?';

  return (
    <div
      className={`${color} flex items-center justify-center rounded-2xl text-white font-black italic select-none shadow-lg ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {initial}
    </div>
  );
};
