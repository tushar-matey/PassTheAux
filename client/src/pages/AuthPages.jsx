import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Radio,
  Mail,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, connectSpotify } = useAuth();
  const { toastSuccess, toastError } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toastSuccess('Welcome back to PassTheAux!');
      const params = new URLSearchParams(location.search);
      const redirect = params.get('redirect');
      if (redirect === 'create') {
        navigate('/');
      } else {
        navigate(-1);
      }
    } catch (err) {
      toastError(err.message, 'Login Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl space-y-6 relative bg-gradient-to-b from-cyber-card to-slate-900">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-spotify-green to-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-spotify-green/20">
            <Radio className="w-6 h-6 text-black" />
          </div>
          <h2 className="font-display font-black text-2xl text-white">
            Log In to PassTheAux
          </h2>
          <p className="text-xs text-slate-400">
            Join shared music sessions and vote for your favorite tracks
          </p>
        </div>

        {/* Spotify OAuth Quick Button */}
        <button
          type="button"
          onClick={connectSpotify}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#1DB954] hover:bg-[#1ED760] text-black font-extrabold text-sm shadow-xl shadow-[#1DB954]/20 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.503 17.306c-.218.358-.684.47-1.042.253-2.857-1.747-6.453-2.143-10.688-1.174-.41.094-.816-.164-.91-.574-.093-.41.164-.816.574-.91 4.636-1.06 8.607-.614 11.813 1.344.358.217.47.684.253 1.061zm1.469-3.268c-.274.446-.86.587-1.306.313-3.27-2.01-8.254-2.593-12.12-1.42-.497.15-1.026-.134-1.176-.632-.15-.497.135-1.026.632-1.176 4.417-1.34 9.907-.69 13.657 1.609.446.274.587.86.313 1.306zm.127-3.41c-3.92-2.327-10.38-2.542-14.123-1.405-.6.183-1.238-.163-1.42-.763-.184-.6.163-1.238.763-1.42 4.304-1.306 11.442-1.052 15.955 1.628.54.32.716 1.018.396 1.558-.32.54-1.018.716-1.558.396z" />
          </svg>
          <span>Continue with Spotify</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
            Or with email
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="text-spotify-green hover:underline font-bold"
          >
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};

export const SignupPage = () => {
  const navigate = useNavigate();
  const { register, connectSpotify } = useAuth();
  const { toastSuccess, toastError } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toastError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      toastSuccess('Account created! Welcome to PassTheAux');
      navigate('/');
    } catch (err) {
      toastError(err.message, 'Registration Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl space-y-6 relative bg-gradient-to-b from-cyber-card to-slate-900">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-spotify-green to-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-spotify-green/20">
            <Radio className="w-6 h-6 text-black" />
          </div>
          <h2 className="font-display font-black text-2xl text-white">
            Create Your Account
          </h2>
          <p className="text-xs text-slate-400">
            Pass the Aux cord, host music rooms, and vote with friends
          </p>
        </div>

        {/* Spotify OAuth Quick Button */}
        <button
          type="button"
          onClick={connectSpotify}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#1DB954] hover:bg-[#1ED760] text-black font-extrabold text-sm shadow-xl shadow-[#1DB954]/20 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.503 17.306c-.218.358-.684.47-1.042.253-2.857-1.747-6.453-2.143-10.688-1.174-.41.094-.816-.164-.91-.574-.093-.41.164-.816.574-.91 4.636-1.06 8.607-.614 11.813 1.344.358.217.47.684.253 1.061zm1.469-3.268c-.274.446-.86.587-1.306.313-3.27-2.01-8.254-2.593-12.12-1.42-.497.15-1.026-.134-1.176-.632-.15-.497.135-1.026.632-1.176 4.417-1.34 9.907-.69 13.657 1.609.446.274.587.86.313 1.306zm.127-3.41c-3.92-2.327-10.38-2.542-14.123-1.405-.6.183-1.238-.163-1.42-.763-.184-.6.163-1.238.763-1.42 4.304-1.306 11.442-1.052 15.955 1.628.54.32.716 1.018.396 1.558-.32.54-1.018.716-1.558.396z" />
          </svg>
          <span>Sign up with Spotify</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
            Or with email
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              Display Name
            </label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Rivers"
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              Password (min 6 characters)
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-spotify-green hover:bg-spotify-green-hover text-black font-extrabold text-sm shadow-xl shadow-spotify-green/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-spotify-green hover:underline font-bold"
          >
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
};
