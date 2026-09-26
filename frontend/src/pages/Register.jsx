import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import { User, Mail, Lock, Award, Trophy } from 'lucide-react';

const TRACKS = ['AI/ML', 'Web3 & Blockchain', 'FinTech', 'HealthTech'];

export const Register = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('participant');
  const [selectedTracks, setSelectedTracks] = useState(['AI/ML']);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const handleTrackToggle = (track) => {
    if (selectedTracks.includes(track)) {
      if (selectedTracks.length > 1) {
        setSelectedTracks(selectedTracks.filter((t) => t !== track));
      }
    } else {
      setSelectedTracks([...selectedTracks, track]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        fullName,
        email,
        password,
        role,
        judgeTracks: role === 'judge' ? selectedTracks : [],
      });
      if (res.success && res.data) {
        login(res.data.token, res.data.user);
        addNotification(`Welcome to Dogfood 2026, ${res.data.user.fullName}!`, 'success');
        navigate(role === 'judge' ? '/judging' : '/team');
      }
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 px-4 space-y-6">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 mx-auto flex items-center justify-center shadow-glow mb-4">
          <Trophy className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-white">Create an Account</h1>
        <p className="text-xs text-gray-400 mt-1">Join as a Hackathon Participant or Track Judge</p>
      </div>

      <div className="bg-surface border border-border-subtle rounded-2xl p-6 sm:p-8 space-y-5 shadow-card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Rivera"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-canvas border border-border-subtle text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

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
                placeholder="alex@raptors.local"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-canvas border border-border-subtle text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-canvas border border-border-subtle text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Platform Role</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('participant')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${role === 'participant'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                    : 'bg-canvas border-border-subtle text-gray-400 hover:text-white'
                  }`}
              >
                Participant
              </button>
              <button
                type="button"
                onClick={() => setRole('judge')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${role === 'judge'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                    : 'bg-canvas border-border-subtle text-gray-400 hover:text-white'
                  }`}
              >
                Track Judge
              </button>
            </div>
          </div>


          {role === 'judge' && (
            <div className="space-y-2 pt-2 border-t border-border-subtle">
              <label className="block text-xs font-semibold text-purple-300">
                Evaluation Tracks
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TRACKS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTrackToggle(t)}
                    className={`py-1.5 px-2.5 rounded-lg border text-[11px] font-medium transition-all text-left ${selectedTracks.includes(t)
                        ? 'bg-purple-950/60 border-purple-600 text-purple-200'
                        : 'bg-canvas border-border-subtle text-gray-400'
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-glow transition-all disabled:opacity-50 mt-2"
          >
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div className="text-center text-xs text-gray-400">
          Already registered?{' '}
          <Link to="/login" className="text-blue-400 font-semibold hover:underline">
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
};
