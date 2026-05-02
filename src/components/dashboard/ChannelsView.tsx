import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, ChevronRight, Plus, MessageSquare, ImageIcon, ArrowLeft, Heart, Share2, MoreHorizontal, Shield, Loader2 } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { uploadFile } from '../../lib/services';
import { Modal } from '../ui/Modal';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export const ChannelsView = ({ user }: { user: any }) => {
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchChannels();
  }, []);

  if (selectedChannel) {
    return <ChannelDetail channel={selectedChannel} onBack={() => setSelectedChannel(null)} user={user} onUpdate={fetchChannels} />;
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
                            <img src={ch.avatar || 'https://cdn-icons-png.flaticon.com/512/4712/4712139.png'} className="w-14 h-14 rounded-2xl object-cover ring-2 ring-slate-800" />
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

const ChannelDetail = ({ channel, onBack, user, onUpdate }: { channel: any, onBack: () => void, user: any, onUpdate: () => void }) => {
    const [posts, setPosts] = useState<any[]>([]);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [showPostModal, setShowPostModal] = useState(false);
    const [showEditChannelModal, setShowEditChannelModal] = useState(false);
    const [editedChannel, setEditedChannel] = useState({ name: channel.name, description: channel.description, avatar: channel.avatar, banner: channel.banner });
    const [selectedPostForComments, setSelectedPostForComments] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [newPost, setNewPost] = useState({ content: '', mediaUrl: '' });
    const [uploading, setUploading] = useState(false);

    const isOwner = user.id === channel.ownerId;

    const fetchPosts = async () => {
        try {
            const res = await apiFetch(`/api/posts?channelId=${channel.id}`);
            const data = await res.json();
            setPosts(data);
        } catch (e) { console.error(e); }
    };

    const fetchComments = async (postId: string) => {
        try {
            const res = await apiFetch(`/api/posts/${postId}/comments`);
            const data = await res.json();
            setComments(data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchPosts();
    }, [channel.id]);

    const handleCreatePost = async () => {
        if (!newPost.content) return;
        try {
            await apiFetch('/api/posts', {
                method: 'POST',
                body: JSON.stringify({ ...newPost, channelId: channel.id })
            });
            setShowPostModal(false);
            setNewPost({ content: '', mediaUrl: '' });
            fetchPosts();
            onUpdate();
        } catch (e) { console.error(e); }
    };

    const handleToggleLike = async (postId: string) => {
        try {
            await apiFetch(`/api/posts/${postId}/react`, { method: 'POST' });
            fetchPosts();
        } catch (e) { console.error(e); }
    };

    const handleSendComment = async () => {
        if (!newComment || !selectedPostForComments) return;
        try {
            await apiFetch(`/api/posts/${selectedPostForComments.id}/comments`, {
                method: 'POST',
                body: JSON.stringify({ content: newComment })
            });
            setNewComment('');
            fetchComments(selectedPostForComments.id);
            fetchPosts(); // Refresh counts
        } catch (e) { console.error(e); }
    };

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const url = await uploadFile(file);
            if (field === 'post') setNewPost(p => ({ ...p, mediaUrl: url }));
            else setEditedChannel(c => ({ ...c, [field]: url }));
        } finally { setUploading(false); }
    };

    const handleUpdateChannel = async () => {
        try {
            await apiFetch(`/api/channels/${channel.id}`, {
                method: 'POST',
                body: JSON.stringify(editedChannel)
            });
            setShowEditChannelModal(false);
            onUpdate();
            onBack(); // Go back to list as data changed
        } catch (e) { console.error(e); }
    };

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
                
                <button onClick={onBack} className="absolute top-6 left-6 p-3 bg-bg-primary/50 backdrop-blur-md rounded-2xl text-text-main z-10"><ArrowLeft size={24} /></button>
                {isOwner && (
                    <button onClick={() => setShowEditChannelModal(true)} className="absolute top-6 right-6 p-3 bg-bg-primary/50 backdrop-blur-md rounded-2xl text-text-main z-10">
                        <MoreHorizontal size={24} />
                    </button>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-8 flex items-end justify-between">
                    <div className="flex items-center gap-6">
                        <img src={channel.avatar || 'https://cdn-icons-png.flaticon.com/512/4712/4712139.png'} className="w-20 h-20 rounded-[2rem] border-4 border-bg-primary object-cover" />
                        <div>
                            <h3 className="text-3xl font-black italic tracking-tighter text-white">{channel.name}</h3>
                            <p className="text-accent text-[10px] font-black uppercase tracking-widest mt-1">@{channel.owner?.nickname || 'admin'}</p>
                        </div>
                    </div>
                    {isOwner ? (
                        <button onClick={() => setShowPostModal(true)} className="bg-accent text-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl shadow-accent/20 active:scale-95 transition-all">
                             <Plus size={28} />
                        </button>
                    ) : (
                        !isSubscribed && <button onClick={handleSubscribe} className="bg-accent text-white px-8 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-accent/20 active:scale-95 transition-all">Подписаться</button>
                    )}
                </div>
            </div>

            <Modal isOpen={showPostModal} onClose={() => setShowPostModal(false)} title="Новая публикация">
                 <div className="space-y-4">
                    <textarea 
                        value={newPost.content}
                        onChange={e => setNewPost({...newPost, content: e.target.value})}
                        placeholder="О чем хотите рассказать?"
                        className="w-full bg-bg-primary p-4 rounded-2xl outline-none text-text-main border border-slate-800 min-h-[120px] italic text-sm"
                    />
                    <div className="flex items-center gap-4">
                        <label className="flex-1 flex items-center justify-center gap-2 p-3 bg-bg-primary border border-slate-800 rounded-2xl cursor-pointer hover:border-accent transition-all">
                            <ImageIcon size={18} className={newPost.mediaUrl ? "text-accent" : "text-text-dim"} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{newPost.mediaUrl ? 'Фото готово' : 'Добавить фото'}</span>
                            <input type="file" hidden accept="image/*" onChange={(e) => handleFile(e, 'post')} />
                        </label>
                        {uploading && <Loader2 size={20} className="animate-spin text-accent" />}
                    </div>
                    <button onClick={handleCreatePost} disabled={!newPost.content || uploading} className="w-full bg-accent text-white py-4 rounded-3xl font-black uppercase text-[10px] tracking-widest disabled:opacity-50">Опубликовать</button>
                 </div>
            </Modal>

            <Modal isOpen={!!selectedPostForComments} onClose={() => setSelectedPostForComments(null)} title="Комментарии">
                <div className="flex flex-col h-[60vh]">
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                        {comments.length === 0 && <p className="text-center text-text-dim py-12 text-[10px] uppercase font-black tracking-widest italic">Пока нет комментариев</p>}
                        {comments.map(c => (
                            <div key={c.id} className="bg-bg-primary p-4 rounded-2xl border border-slate-800/50">
                                <div className="flex items-center gap-2 mb-2">
                                    <img src={c.user.avatar || `https://i.pravatar.cc/150?u=${c.userId}`} className="w-6 h-6 rounded-lg object-cover" />
                                    <span className="text-[10px] font-black italic tracking-tight">{c.user.nickname}</span>
                                    <span className="text-[8px] text-text-dim ml-auto">{new Date(c.createdAt).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-xs text-text-dim italic">{c.content}</p>
                            </div>
                        ))}
                    </div>
                    <div className="pt-4 flex gap-2">
                        <input 
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            placeholder="Ваш комментарий..."
                            className="flex-1 bg-bg-primary p-3 rounded-2xl outline-none text-text-main border border-slate-800 text-xs italic"
                            onKeyDown={e => e.key === 'Enter' && handleSendComment()}
                        />
                        <button onClick={handleSendComment} className="bg-accent text-white px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest">Отп.</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showEditChannelModal} onClose={() => setShowEditChannelModal(false)} title="Настройки канала">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-dim px-2">Название</p>
                        <input 
                            value={editedChannel.name}
                            onChange={e => setEditedChannel({...editedChannel, name: e.target.value})}
                            className="w-full bg-bg-primary p-4 rounded-2xl outline-none text-text-main border border-slate-800 text-sm font-black italic"
                        />
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-dim px-2">Описание</p>
                        <textarea 
                            value={editedChannel.description || ''}
                            onChange={e => setEditedChannel({...editedChannel, description: e.target.value})}
                            className="w-full bg-bg-primary p-4 rounded-2xl outline-none text-text-main border border-slate-800 text-xs italic min-h-[80px]"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="flex flex-col items-center justify-center gap-2 p-4 bg-bg-primary border border-slate-800 rounded-2xl cursor-pointer hover:border-accent transition-all relative overflow-hidden">
                            {editedChannel.avatar ? <img src={editedChannel.avatar} className="absolute inset-0 w-full h-full object-cover opacity-20" /> : <Users size={20} className="text-text-dim" />}
                            <span className="text-[8px] font-black uppercase tracking-widest relative z-10 text-center">Изменить аватар</span>
                            <input type="file" hidden accept="image/*" onChange={(e) => handleFile(e, 'avatar')} />
                        </label>
                        <label className="flex flex-col items-center justify-center gap-2 p-4 bg-bg-primary border border-slate-800 rounded-2xl cursor-pointer hover:border-accent transition-all relative overflow-hidden">
                            {editedChannel.banner ? <img src={editedChannel.banner} className="absolute inset-0 w-full h-full object-cover opacity-20" /> : <ImageIcon size={20} className="text-text-dim" />}
                            <span className="text-[8px] font-black uppercase tracking-widest relative z-10 text-center">Изменить баннер</span>
                            <input type="file" hidden accept="image/*" onChange={(e) => handleFile(e, 'banner')} />
                        </label>
                    </div>
                    {uploading && <div className="flex justify-center"><Loader2 size={24} className="animate-spin text-accent" /></div>}
                    <button onClick={handleUpdateChannel} disabled={uploading} className="w-full bg-accent text-white py-4 rounded-3xl font-black uppercase text-[10px] tracking-widest">Сохранить</button>
                </div>
            </Modal>

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
                                    <button 
                                        onClick={() => handleToggleLike(post.id)}
                                        className={cn("flex items-center gap-2 transition-colors", post.reactions?.length > 0 ? "text-rose-500" : "text-text-dim hover:text-rose-400")}
                                    >
                                        <Heart size={18} fill={post.reactions?.length > 0 ? "currentColor" : "none"} />
                                        <span className="text-[10px] font-black uppercase">{post._count?.reactions || 0}</span>
                                    </button>
                                    <button 
                                        onClick={() => { setSelectedPostForComments(post); fetchComments(post.id); }}
                                        className="flex items-center gap-2 text-text-dim hover:text-accent transition-colors"
                                    >
                                        <MessageSquare size={18} />
                                        <span className="text-[10px] font-black uppercase">{post._count?.comments || 0}</span>
                                    </button>
                                </div>
                                <span className="text-[9px] font-black text-text-dim uppercase tracking-widest">{new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(post.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
