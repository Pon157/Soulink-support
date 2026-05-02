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

export const UserAvatar: React.FC<UserAvatarProps> = ({ user, size = 40, className = "" }) => {
  if (!user) return null;

  if (user.avatar) {
    return (
      <img 
        src={user.avatar} 
        alt={user.nickname}
        className={`object-cover rounded-2xl ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  const initial = user.nickname ? user.nickname.charAt(0).toUpperCase() : '?';
  const colors = [
    'bg-rose-500', 'bg-emerald-500', 'bg-amber-500', 'bg-blue-500', 
    'bg-indigo-500', 'bg-violet-500', 'bg-fuchsia-500', 'bg-pink-500'
  ];
  
  // Use user.id or nickname to pick a color
  const colorIndex = (user.id || user.nickname || 'a').charCodeAt(0) % colors.length;
  const bgColor = colors[colorIndex];

  return (
    <div 
      className={`${bgColor} flex items-center justify-center rounded-2xl text-white font-black italic select-none shadow-lg ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
};
