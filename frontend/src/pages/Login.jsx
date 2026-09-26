import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import { Lock, Mail, KeyRound, Trophy } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.success && res.data) {
        login(res.data.token, res.data.user);
        addNotification(`Welcome back, ${res.data.user.fullName}!`, 'success');

        if (res.data.user.role === 'judge') {
          navigate('/judging');
        } else if (['organizer', 'admin'].includes(res.data.user.role)) {
          navigate('/admin');
        } else {
          navigate('/gallery');
        }
      }
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (roleEmail) => {
    setEmail(roleEmail);
    setPassword('Raptor2026!');
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 space-y-6">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 mx-auto flex items-center justify-center shadow-glow mb-4">
          <Trophy className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-white">Sign in to Dogfood</h1>
        <p className="text-xs text-gray-400 mt-1">Air-gapped hackathon platform</p>
      </div>

      <div className="bg-surface border border-border-subtle rounded-2xl p-6 sm:p-8 space-y-6 shadow-card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@raptors.local"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-canvas border border-border-subtle text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-canvas border border-border-subtle text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-glow transition-all disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>


        <div className="pt-4 border-t border-border-subtle">
          <div className="text-[11px] font-mono uppercase tracking-wider text-gray-400 mb-2 flex items-center space-x-1">
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>Quick-Fill Seeded Accounts</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials('organizer@dogfood.local')}
              className="py-1.5 px-2 rounded-lg bg-surface-raised border border-border-subtle text-[11px] font-semibold text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
            >
              Organizer
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('judge.ai@dogfood.local')}
              className="py-1.5 px-2 rounded-lg bg-surface-raised border border-border-subtle text-[11px] font-semibold text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
            >
              AI Judge
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('alex@dogfood.local')}
              className="py-1.5 px-2 rounded-lg bg-surface-raised border border-border-subtle text-[11px] font-semibold text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
            >
              Participant
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-gray-400">
          Don't have an account yet?{' '}
          <Link to="/register" className="text-blue-400 font-semibold hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};
