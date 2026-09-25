import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Shield, Trophy, LayoutGrid, Users, FileEdit, Award, LogOut, LogIn, Activity } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-border-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-white tracking-wide">DOGFOOD 2026</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>
                AIR-GAPPED
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium">Hackathon Raptors Platform</p>
          </div>
        </Link>

        {/* Primary Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1 font-medium text-sm">
          <Link
            to="/gallery"
            className={`px-3.5 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
              isActive('/gallery')
                ? 'bg-surface-raised text-blue-400 font-semibold border border-blue-500/30'
                : 'text-gray-300 hover:text-white hover:bg-surface-raised/50'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Showcase Gallery</span>
          </Link>

          {user && user.role === 'participant' && (
            <>
              <Link
                to="/team"
                className={`px-3.5 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  isActive('/team')
                    ? 'bg-surface-raised text-blue-400 font-semibold border border-blue-500/30'
                    : 'text-gray-300 hover:text-white hover:bg-surface-raised/50'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>My Team</span>
              </Link>
              <Link
                to="/submit"
                className={`px-3.5 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  isActive('/submit')
                    ? 'bg-surface-raised text-blue-400 font-semibold border border-blue-500/30'
                    : 'text-gray-300 hover:text-white hover:bg-surface-raised/50'
                }`}
              >
                <FileEdit className="w-4 h-4" />
                <span>Submission</span>
              </Link>
            </>
          )}

          {user && (user.role === 'judge' || user.role === 'organizer' || user.role === 'admin') && (
            <Link
              to="/judging"
              className={`px-3.5 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                isActive('/judging')
                  ? 'bg-surface-raised text-blue-400 font-semibold border border-blue-500/30'
                  : 'text-gray-300 hover:text-white hover:bg-surface-raised/50'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Judging Queue</span>
            </Link>
          )}

          {user && (user.role === 'organizer' || user.role === 'admin') && (
            <Link
              to="/admin"
              className={`px-3.5 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                isActive('/admin')
                  ? 'bg-surface-raised text-blue-400 font-semibold border border-blue-500/30'
                  : 'text-gray-300 hover:text-white hover:bg-surface-raised/50'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Admin Console</span>
            </Link>
          )}
        </nav>

        {/* User Session Info / Auth Actions */}
        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-gray-200">{user.fullName}</span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400">
                  {user.role}
                </span>
              </div>
              <button
                onClick={logout}
                title="Log out"
                className="p-2 rounded-lg bg-surface-raised border border-border-subtle text-gray-400 hover:text-rose-400 hover:border-rose-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/login"
                className="px-3.5 py-1.5 text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-glow transition-all"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
