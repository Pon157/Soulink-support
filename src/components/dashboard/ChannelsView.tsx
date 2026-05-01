import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, ChevronRight, Plus, MessageSquare, ImageIcon, ArrowLeft, Heart, Share2, MoreHorizontal } from 'lucide-react';
import { apiFetch } from '../../lib/api';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export const ChannelsView = ({ user }: { user: any }) => {
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const res = await apiFetch('/api/channels');
        const data = await res.json();
        setChannels(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchChannels();
  }, []);

  if (selectedChannel) {
    return <ChannelDetail channel={selectedChannel} onBack={() => setSelectedChannel(null)} userId={user.id} />;
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-bg-primary">
        <header className="mb-8">
            <h2 className="text-3xl font-black italic tracking-tighter text-text-main">Каналы</h2>
            <p className="text-text-dim text-[10px] font-black uppercase tracking-widest mt-1">Мир экспертного контента</p>
        </header>

        <div className="bg-bg-secondary border border-slate-800 p-8 rounded-[3rem] text-center space-y-4 mb-8">
            <Users size={48} className="mx-auto text-accent" />
            <h2 className="text-2xl font-black italic tracking-tighter">Авторские каналы</h2>
            <p className="text-text-dim text-xs italic px-6">Подписывайтесь на блоги наших администраторов, чтобы быть в курсе обновлений.</p>
        </div>

        <div className="grid gap-3">
            {loading && <p className="text-center text-text-dim py-12 animate-pulse font-black uppercase text-[10px] tracking-widest">Загрузка каналов...</p>}
            {channels.map((ch) => (
                <button 
                    key={ch.id} 
                    onClick={() => setSelectedChannel(ch)}
                    className="bg-bg-secondary p-5 rounded-[2.5rem] border border-slate-800/50 flex items-center justify-between group hover:border-accent/30 transition-all text-left"
                >
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <img src={ch.avatar || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop'} className="w-14 h-14 rounded-2xl object-cover ring-2 ring-slate-800" />
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-accent rounded-full border-2 border-bg-secondary flex items-center justify-center text-[10px] text-white">
                                <Plus size={10} strokeWidth={4} />
                            </div>
                        </div>
                        <div>
                            <p className="font-black italic tracking-tight text-text-main">{ch.name}</p>
                            <p className="text-[9px] text-text-dim uppercase font-bold tracking-widest">{ch._count?.subscribers || 0} подп. • {ch._count?.posts || 0} пост.</p>
                        </div>
                    </div>
                    <ChevronRight size={20} className="text-text-dim group-hover:text-accent transition-colors" />
                </button>
            ))}
        </div>
    </div>
  );
};

const ChannelDetail = ({ channel, onBack, userId }: { channel: any, onBack: () => void, userId: string }) => {
    const [posts, setPosts] = useState<any[]>([]);
    const [isSubscribed, setIsSubscribed] = useState(false);

    useEffect(() => {
        // Fetch posts logic here
        setPosts([
            { id: '1', content: 'Сегодня мы запускаем обновление нашей системы!', createdAt: new Date() },
            { id: '2', content: 'Не забудьте проверить настройки профиля для новой темы.', createdAt: new Date(Date.now() - 86400000) }
        ]);
    }, [channel.id]);

    const handleSubscribe = async () => {
        try {
            await apiFetch(`/api/channels/subscribe/${channel.id}`, { method: 'POST' });
            setIsSubscribed(true);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-bg-primary overflow-hidden">
            <div className="relative h-64 flex-shrink-0">
                <img src={channel.banner || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop'} className="w-full h-full object-cover brightness-50" />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-primary to-transparent" />
                
                <button onClick={onBack} className="absolute top-6 left-6 p-3 bg-bg-primary/50 backdrop-blur-md rounded-2xl text-text-main"><ArrowLeft size={24} /></button>
                <button className="absolute top-6 right-6 p-3 bg-bg-primary/50 backdrop-blur-md rounded-2xl text-text-main"><MoreHorizontal size={24} /></button>

                <div className="absolute bottom-0 left-0 right-0 p-8 flex items-end justify-between">
                    <div className="flex items-center gap-6">
                        <img src={channel.avatar || ''} className="w-20 h-20 rounded-[2rem] border-4 border-bg-primary object-cover" />
                        <div>
                            <h3 className="text-3xl font-black italic tracking-tighter text-white">{channel.name}</h3>
                            <p className="text-accent text-[10px] font-black uppercase tracking-widest mt-1">@{channel.owner?.nickname || 'admin'}</p>
                        </div>
                    </div>
                    {!isSubscribed && <button onClick={handleSubscribe} className="bg-accent text-white px-8 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-accent/20 active:scale-95 transition-all">Подписаться</button>}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="bg-bg-secondary p-6 rounded-[2.5rem] border border-slate-800/50">
                    <p className="text-sm italic text-text-dim italic leading-relaxed">{channel.description || 'Обзоры, новости и полезные советы от администрации SoulLink.'}</p>
                </div>

                <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-[0.3em] text-text-dim px-2">Последние посты</h4>
                    {posts.map(post => (
                        <div key={post.id} className="bg-bg-secondary p-6 rounded-[2.5rem] border border-slate-800/50 space-y-4">
                            <p className="text-sm font-medium italic text-text-main leading-relaxed">{post.content}</p>
                            {post.mediaUrl && <img src={post.mediaUrl} className="rounded-3xl w-full border border-slate-800" />}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
                                <div className="flex gap-4">
                                    <button className="flex items-center gap-2 text-text-dim hover:text-rose-400 transition-colors">
                                        <Heart size={18} />
                                        <span className="text-[10px] font-black uppercase">124</span>
                                    </button>
                                    <button className="flex items-center gap-2 text-text-dim hover:text-accent transition-colors">
                                        <MessageSquare size={18} />
                                        <span className="text-[10px] font-black uppercase">24</span>
                                    </button>
                                </div>
                                <span className="text-[9px] font-black text-text-dim uppercase tracking-widest">{new Date(post.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
