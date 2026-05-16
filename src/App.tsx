
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MainDashboard } from './components/MainDashboard';
import { LoginPage, RegisterPage } from './pages/Auth';
import { apiFetch } from './lib/api';

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [banInfo, setBanInfo] = useState<any>(null);

  useEffect(() => {
    const handleBanned = (e: any) => {
        setBanInfo(e.detail);
    };
    window.addEventListener('user-banned', handleBanned);
    return () => window.removeEventListener('user-banned', handleBanned);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('soul_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await apiFetch('/api/users/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else if (res.status === 403) {
          const data = await res.json();
          if (data.error === 'BANNED') {
            setBanInfo(data);
          }
        } else {
          localStorage.removeItem('soul_token');
        }
      } catch (e) {
        console.error('Auth check failed:', e);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('soul_token');
    setUser(null);
    setBanInfo(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-12">
        <div className="w-16 h-16 bg-blue-600 rounded-[2rem] animate-bounce mb-6 flex items-center justify-center shadow-2xl shadow-blue-500/20">
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">SoulLink Engine Loading...</p>
      </div>
    );
  }

  if (banInfo) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-rose-600/10 rounded-[3rem] flex items-center justify-center mb-8 border border-rose-600/20 shadow-2xl shadow-rose-600/10">
          <svg className="w-12 h-12 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m11 3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-4xl font-black text-white italic mb-4 tracking-tighter">ДОСТУП ЗАБЛОКИРОВАН</h1>
        <div className="max-w-md w-full bg-bg-secondary p-8 rounded-[2.5rem] border border-slate-800 space-y-4">
            <div>
                <p className="text-[10px] font-black uppercase text-text-dim tracking-widest mb-1">Причина</p>
                <p className="text-lg font-bold text-white italic">{banInfo.reason || 'Нарушение правил сообщества'}</p>
            </div>
            {banInfo.until && (
                <div>
                    <p className="text-[10px] font-black uppercase text-text-dim tracking-widest mb-1">Действует до</p>
                    <p className="text-sm font-bold text-accent italic">{new Date(banInfo.until).toLocaleString()}</p>
                </div>
            )}
        </div>
        <button onClick={handleLogout} className="mt-8 text-[10px] font-black uppercase tracking-widest text-text-dim hover:text-white transition-colors">Сменить аккаунт</button>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!user ? <LoginPage setUser={setUser} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/register" 
          element={!user ? <RegisterPage /> : <Navigate to="/" />} 
        />
        <Route 
          path="/*" 
          element={user ? <MainDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
      </Routes>
    </Router>
  );
};

export default App;
