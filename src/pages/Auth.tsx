import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, AtSign, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { Modal } from '../components/ui/Modal';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export const LoginPage = ({ setUser }: { setUser: (u: any) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('soul_token', data.token);
        setUser(data.user);
        navigate('/');
      } else {
        setError(data.error || 'Ошибка входа');
      }
    } catch (err) {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-2xl space-y-8"
      >
        <div className="text-center space-y-2">
          {/* --- Замена иконки на изображение --- */}
          {/* <div className="w-20 h-20 bg-blue-600 rounded-[2rem] mx-auto flex items-center justify-center shadow-xl shadow-blue-500/20">
            <ShieldCheck size={40} className="text-white" />
          </div> */}
          <img
            src="https://s3.twcstorage.ru/404695f6-ab2f-417a-95e7-1d73e67c9c9b/SoulLink%20banner.png"
            alt="SoulLink Logo"
            className="w-full max-w-[12rem] mx-auto rounded-xl mb-4 shadow-xl shadow-slate-950/20"
          />
          {/* -------------------------------------- */}
          <h1 className="text-3xl font-black text-white italic tracking-tighter">SoulLink</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">С возвращением</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
            <input 
              type="email" 
              required
              placeholder="Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-800 p-4 pl-12 rounded-2xl text-slate-200 outline-none focus:border-blue-500/50 transition-all font-medium"
            />
          </div>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
            <input 
              type="password" 
              required
              placeholder="Пароль" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-800 p-4 pl-12 rounded-2xl text-slate-200 outline-none focus:border-blue-500/50 transition-all font-medium"
            />
          </div>
          
          {error && <p className="text-rose-500 text-xs font-black uppercase text-center tracking-widest">{error}</p>}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-[0.3em] py-5 rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? 'Вход...' : 'Войти'} <ArrowRight size={18} />
          </button>
        </form>

        <div className="text-center">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
            Нет аккаунта? <Link to="/register" className="text-blue-400 hover:text-blue-300">Создать</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export const RegisterPage = () => {
  const [step, setStep] = useState(1); // 1: Info, 2: Code
  const [formData, setFormData] = useState({ email: '', username: '', nickname: '', password: '', code: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const navigate = useNavigate();

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedPolicy) {
      setError('Примите информацию о политике');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/auth/register-request', {
        method: 'POST',
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep(2);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/auth/register-confirm', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('soul_token', data.token);
        navigate('/');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  const PolicyContent = () => (
    <div className="space-y-6 text-sm">
      <div className="p-4 bg-blue-600/10 border border-blue-600/20 rounded-2xl">
        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 leading-none">Версия 2.4.1</p>
        <p className="text-xs text-blue-300 italic font-medium">Последнее обновление: 1 мая 2026</p>
      </div>

      <section className="space-y-2">
        <h4 className="text-white font-black uppercase tracking-widest text-[11px] px-1">1. Анонимность и Данные</h4>
        <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-800 text-xs text-slate-400 italic leading-relaxed">
          SoulLink — это платформа для анонимной психологической поддержки и общения. Мы стремимся к максимальной защите вашей личности. Мы не запрашиваем и не храним ваше реальное имя, адрес проживания или номер телефона. Ваш Email используется исключительно в технических целях: для восстановления доступа к аккаунту и обеспечения безопасности. Доступ к вашему Email-адресу имеет только ограниченный круг администраторов безопасности.
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="text-white font-black uppercase tracking-widest text-[11px] px-1">2. Переписки и Чаты</h4>
        <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-800 text-xs text-slate-400 italic leading-relaxed">
          Все ваши чаты с администраторами (специалистами) являются строго конфиденциальными. Сотрудники SoulLink, с которыми вы общаетесь, имеют доступ к вашей истории общения только для предоставления качественной помощи. Доступ третьих лиц к чатам полностью исключен. Исключением является поступление жалобы на нарушение правил сообщества, когда чат может быть просмотрен службой безопасности для разрешения конфликта.
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="text-white font-black uppercase tracking-widest text-[11px] px-1">3. Правила общения и Отзывы</h4>
        <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-800 text-xs text-slate-400 italic leading-relaxed">
          Для поддержания здоровой атмосферы на платформе действуют строгие правила. Пользователи имеют право оставлять честные и конструктивные отзывы об администраторах, с которыми они общались. Эти отзывы помогают нам улучшать качество сервиса.

          <p className="mt-2 text-rose-400 font-bold">В чатах и отзывах ЗАПРЕЩЕНЫ:</p>
          <ul className="list-disc list-inside space-y-1 mt-1 pl-1 text-slate-400">
            <li>Любая форма агрессии, угрозы, оскорбления, буллинг.</li>
            <li>Пропаганда насилия, ненависти, расизма или дискриминации.</li>
            <li>Реклама, спам, распространение вредоносных ссылок.</li>
            <li>Попытки деанонимизации или оскорбления специалиста в отзыве.</li>
          </ul>
          За нарушение данных правил ваш аккаунт может быть заблокирован навсегда без возможности восстановления.
        </div>
      </section>

      <div className="pt-4">
        <button 
          type="button"
          onClick={() => { setAcceptedPolicy(true); setShowPolicy(false); }}
          className="w-full bg-blue-600 text-white font-black uppercase py-5 rounded-2xl shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-100 transition-all text-[10px] tracking-widest"
        >
          Подтверждаю и согласен
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-2xl space-y-8"
      >
        <Modal isOpen={showPolicy} onClose={() => setShowPolicy(false)} title="Условия SoulLink">
          <PolicyContent />
        </Modal>
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-white italic tracking-tighter">Регистрация</h1>
          <div className="flex justify-center gap-1">
            <div className={cn("h-1 w-8 rounded-full transition-all cursor-pointer", step === 1 ? "bg-blue-500" : "bg-slate-800")} onClick={() => setStep(1)}></div>
            <div className={cn("h-1 w-8 rounded-full transition-all", step === 2 ? "bg-blue-500" : "bg-slate-800")}></div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.form 
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleRequestCode} 
              className="space-y-4"
            >
              <div className="relative group">
                <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="email" required placeholder="Email" 
                  value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-slate-800/50 border border-slate-800 p-4 pl-12 rounded-2xl text-slate-200 outline-none focus:border-blue-500/50"
                />
              </div>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="text" required placeholder="Никнейм (отображаемый)" 
                  value={formData.nickname} onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                  className="w-full bg-slate-800/50 border border-slate-800 p-4 pl-12 rounded-2xl text-slate-200 outline-none focus:border-blue-500/50"
                />
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="password" required placeholder="Пароль" 
                  value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-slate-800/50 border border-slate-800 p-4 pl-12 rounded-2xl text-slate-200 outline-none focus:border-blue-500/50"
                />
              </div>

              <div className="flex items-center gap-3 px-2">
                <button 
                  type="button"
                  onClick={() => setAcceptedPolicy(!acceptedPolicy)}
                  className={cn(
                    "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                    acceptedPolicy ? "bg-blue-600 border-blue-600 text-white" : "border-slate-800 bg-slate-800/50"
                  )}
                >
                  {acceptedPolicy && <Check size={14} />}
                </button>
                <button type="button" onClick={() => setShowPolicy(true)} className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-left hover:text-blue-400 decoration-dotted underline underline-offset-4">
                  Принимаю условия и политику
                </button>
              </div>
              {error && <p className="text-rose-500 text-[10px] text-center font-black uppercase tracking-widest">{error}</p>}
              <button disabled={loading} className="w-full bg-blue-600 py-5 rounded-2xl font-black text-white uppercase tracking-widest text-[10px] shadow-xl shadow-blue-600/20 disabled:opacity-50 transition-opacity">
                {loading ? 'Отправка...' : 'Отправить код'}
              </button>
            </motion.form>
          ) : (
            <motion.form 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleConfirm} 
              className="space-y-6"
            >
               <input 
                  type="text" required placeholder="Введите код из письма" 
                  value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})}
                  className="w-full bg-slate-800/50 border border-slate-800 p-5 rounded-2xl text-slate-200 outline-none focus:border-blue-500 font-bold text-center text-2xl tracking-[1em]"
                />
               <input 
                  type="text" required placeholder="@username" 
                  value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full bg-slate-800/50 border border-slate-800 p-4 rounded-2xl text-slate-200 outline-none focus:border-blue-500"
                />
              {error && <p className="text-rose-500 text-[10px] text-center font-black uppercase tracking-widest">{error}</p>}
              <button disabled={loading} className="w-full bg-emerald-600 py-5 rounded-2xl font-black text-white uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-600/20 disabled:opacity-50 transition-opacity">
                {loading ? 'Завершение...' : 'Завершить регистрацию'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <Link to="/login" className="block text-center text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">
          Уже есть аккаунт? Войти
        </Link>
      </motion.div>
    </div>
  );
};
