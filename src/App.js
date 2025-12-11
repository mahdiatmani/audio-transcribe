import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Mic,
  FileAudio,
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  Zap,
  LogOut,
  User,
  Lock,
  Mail,
  Shield,
  Clock,
  Globe,
  Headphones,
  Play,
  Star,
  ChevronRight,
  Menu,
  X,
  Settings,
  BarChart3,
  CreditCard,
  HelpCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// API CONFIGURATION - Backend URL from env
// ═══════════════════════════════════════════════════════════════════════════
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

// ═══════════════════════════════════════════════════════════════════════════
// LOCAL STORAGE HELPERS
// ═══════════════════════════════════════════════════════════════════════════
const storage = {
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? { value: item } : null;
    } catch (err) {
      console.error('Storage get error:', err);
      return null;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return { key, value };
    } catch (err) {
      console.error('Storage set error:', err);
      return null;
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.error('Storage remove error:', err);
      return false;
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const FREE_GUEST_LIMIT = 3;
const TIER_LIMITS = {
  free: 15,
  starter: 300,
  pro: 1000,
  enterprise: 10000,
};

// Custom Voxify Logo Component
const VoxifyLogo = ({ size = 40 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#0d9488" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="48" height="48" rx="12" fill="url(#logoGradient)" />
    <g fill="white">
      <rect x="8" y="20" width="3.5" height="8" rx="1.75" opacity="0.7" />
      <rect x="13.5" y="16" width="3.5" height="16" rx="1.75" opacity="0.85" />
      <rect x="19" y="12" width="3.5" height="24" rx="1.75" />
      <rect x="25.5" y="12" width="3.5" height="24" rx="1.75" />
      <rect x="31" y="16" width="3.5" height="16" rx="1.75" opacity="0.85" />
      <rect x="36.5" y="20" width="3.5" height="8" rx="1.75" opacity="0.7" />
    </g>
  </svg>
);

const VoxifyLogoSmall = ({ size = 32 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="logoGradientSmall" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#0d9488" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="48" height="48" rx="10" fill="url(#logoGradientSmall)" />
    <g fill="white">
      <rect x="8" y="20" width="3.5" height="8" rx="1.75" opacity="0.7" />
      <rect x="13.5" y="16" width="3.5" height="16" rx="1.75" opacity="0.85" />
      <rect x="19" y="12" width="3.5" height="24" rx="1.75" />
      <rect x="25.5" y="12" width="3.5" height="24" rx="1.75" />
      <rect x="31" y="16" width="3.5" height="16" rx="1.75" opacity="0.85" />
      <rect x="36.5" y="20" width="3.5" height="8" rx="1.75" opacity="0.7" />
    </g>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [username, setUsername] = useState('');
  const [userTier, setUserTier] = useState('free');
  const [usageMinutes, setUsageMinutes] = useState(0);
  const [transcriptionCount, setTranscriptionCount] = useState(0);

  // Transcription state
  const [file, setFile] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [transcriptionHistory, setTranscriptionHistory] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Guest state
  const [guestTranscriptionCount, setGuestTranscriptionCount] = useState(0);
  const [isGuestMode, setIsGuestMode] = useState(false);

  // UI state
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState('home'); // home | pricing | features | about | contact | dashboard
  const [activeTab, setActiveTab] = useState('transcribe'); // dashboard tabs
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth modal
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('signup'); // login | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Contact form
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const fileInputRef = useRef(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  const getRemainingGuestAttempts = () =>
    Math.max(0, FREE_GUEST_LIMIT - guestTranscriptionCount);
  const canGuestTranscribe = () => guestTranscriptionCount < FREE_GUEST_LIMIT;

  // Fetch fresh stats from backend (tier, usage, counts)
  const refreshUserStats = async () => {
    if (!isLoggedIn || !authToken) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/user/stats`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        setUserTier(data.tier || 'free');
        setUsageMinutes(
          data.usage_minutes ?? data.usage ?? data.used ?? usageMinutes
        );
        setTranscriptionCount(
          data.transcription_count ?? transcriptionCount ?? 0
        );
      } else {
        console.warn('Failed to refresh stats:', data.detail || data);
      }
    } catch (err) {
      console.error('Stats refresh error:', err);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    // Load auth
    const storedAuth = storage.get('voxify_auth');
    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth.value);
        if (authData.token && authData.email) {
          setIsLoggedIn(true);
          setAuthToken(authData.token);
          setUserEmail(authData.email);
          setUsername(authData.username || '');
          setUserTier(authData.tier || 'free');
          setUsageMinutes(authData.usageMinutes || 0);
          setTranscriptionCount(authData.transcriptionCount || 0);
          setCurrentPage('dashboard');

          const storedHistory = storage.get('voxify_history');
          if (storedHistory) {
            setTranscriptionHistory(JSON.parse(storedHistory.value));
          }
        }
      } catch (err) {
        console.error('Error parsing stored auth:', err);
        storage.remove('voxify_auth');
      }
    }

    // Load guest count
    const storedGuestCount = storage.get('voxify_guest_count');
    if (storedGuestCount) {
      try {
        const count = parseInt(storedGuestCount.value, 10);
        const validCount = isNaN(count)
          ? 0
          : Math.min(Math.max(0, count), FREE_GUEST_LIMIT + 10);
        setGuestTranscriptionCount(validCount);
      } catch (err) {
        console.error('Error parsing guest count:', err);
        setGuestTranscriptionCount(0);
      }
    } else {
      storage.set('voxify_guest_count', '0');
    }
  }, []);

  // Save auth changes
  useEffect(() => {
    if (isLoggedIn && userEmail) {
      storage.set(
        'voxify_auth',
        JSON.stringify({
          token: authToken,
          email: userEmail,
          username,
          tier: userTier,
          usageMinutes,
          transcriptionCount,
          lastUpdated: new Date().toISOString(),
        })
      );
    }
  }, [
    isLoggedIn,
    userEmail,
    username,
    userTier,
    usageMinutes,
    transcriptionCount,
    authToken,
  ]);

  // Save history
  useEffect(() => {
    if (isLoggedIn && transcriptionHistory.length > 0) {
      storage.set('voxify_history', JSON.stringify(transcriptionHistory));
    }
  }, [transcriptionHistory, isLoggedIn]);

  // Save guest count
  useEffect(() => {
    storage.set('voxify_guest_count', guestTranscriptionCount.toString());
  }, [guestTranscriptionCount]);

  // Refresh stats whenever we have a valid token
  useEffect(() => {
    if (isLoggedIn && authToken) {
      refreshUserStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, authToken]);

  // When guest hits limit, show signup modal
  useEffect(() => {
    if (isGuestMode && guestTranscriptionCount >= FREE_GUEST_LIMIT && !showAuthModal) {
      setShowAuthModal(true);
      setAuthMode('signup');
      setAuthError(
        `You've used all ${FREE_GUEST_LIMIT} free transcriptions. Sign up for unlimited access!`
      );
    }
  }, [isGuestMode, guestTranscriptionCount, showAuthModal]);

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════════════════════════════════════════
  const handleAuth = async () => {
    setAuthError('');

    if (!email || !password) {
      setAuthError('Please fill in all fields');
      return;
    }
    if (authMode === 'signup' && !username) {
      setAuthError('Username is required');
      return;
    }

    setIsAuthLoading(true);

    try {
      const endpoint = authMode === 'login' ? 'login' : 'signup';
      const payload =
        authMode === 'signup'
          ? { username, email, password }
          : { email, password };

      const response = await fetch(`${API_BASE_URL}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        storage.set(
          'voxify_auth',
          JSON.stringify({
            token: data.token,
            email: data.user.email,
            username: data.user.username,
            tier: data.user.tier || 'free',
            usageMinutes: data.user.usage_minutes || 0,
            transcriptionCount: data.user.transcription_count || 0,
            createdAt: new Date().toISOString(),
          })
        );

        setIsLoggedIn(true);
        setIsGuestMode(false);
        setAuthToken(data.token);
        setUserEmail(data.user.email);
        setUsername(data.user.username);
        setUserTier(data.user.tier || 'free');
        setUsageMinutes(data.user.usage_minutes || 0);
        setTranscriptionCount(data.user.transcription_count || 0);
        setShowAuthModal(false);
        setEmail('');
        setPassword('');
        setCurrentPage('dashboard');
        setError('');
      } else {
        setAuthError(data.detail || 'Authentication failed');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setAuthError('Connection error. Please try again.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleContinueAsGuest = () => {
    if (!canGuestTranscribe()) {
      setAuthMode('signup');
      setAuthError(
        `You have used all ${FREE_GUEST_LIMIT} free attempts. Please sign up to continue.`
      );
      setShowAuthModal(true);
      return;
    }

    setShowAuthModal(false);
    setAuthError('');
    setIsGuestMode(true);
  };

  const handleLogout = () => {
    storage.remove('voxify_auth');
    storage.remove('voxify_history');
    setIsLoggedIn(false);
    setIsGuestMode(false);
    setAuthToken('');
    setUserEmail('');
    setUsername('');
    setTranscriptionCount(0);
    setUsageMinutes(0);
    setUserTier('free');
    setTranscriptionHistory([]);
    setTranscription('');
    setFile(null);
    setCurrentPage('home');
    setError('');
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSCRIPTION
  // ═══════════════════════════════════════════════════════════════════════════
  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setTranscription('');
    setError('');
  };

  const handleTranscribe = async () => {
    if (!file) {
      setError('Please upload an audio file first.');
      return;
    }

    if (!isLoggedIn && !canGuestTranscribe()) {
      setAuthMode('signup');
      setAuthError(
        `You have used all ${FREE_GUEST_LIMIT} free attempts. Please sign up to continue.`
      );
      setShowAuthModal(true);
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const headers = {};
      if (isLoggedIn && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTranscription(data.transcription || '');
        if (isLoggedIn) {
          const used = data.usage?.used ?? usageMinutes;
          setUsageMinutes(used);
          const newHistoryItem = {
            id: Date.now(),
            fileName: data.filename,
            transcription: data.transcription,
            date: new Date().toISOString(),
            duration: data.duration,
          };
          setTranscriptionHistory((prev) => [newHistoryItem, ...prev].slice(0, 10));
          setTranscriptionCount((prev) => prev + 1);
        } else {
          // Guest: increment count and enforce limit
          const newCount = guestTranscriptionCount + 1;
          setGuestTranscriptionCount(newCount);
          storage.set('voxify_guest_count', newCount.toString());

          if (newCount >= FREE_GUEST_LIMIT) {
            setTimeout(() => {
              setShowAuthModal(true);
              setAuthMode('signup');
              setAuthError(
                'You have used all your free transcriptions. Sign up now for unlimited access!'
              );
            }, 1500);
            setError(
              `✓ Transcription complete! You've used all ${FREE_GUEST_LIMIT} free attempts. Sign up to continue.`
            );
          } else {
            const remaining = FREE_GUEST_LIMIT - newCount;
            setError(
              `✓ Success! ${remaining} free transcription${
                remaining !== 1 ? 's' : ''
              } remaining.`
            );
          }
        }
      } else {
        setError(data.detail || 'Transcription failed. Please try again.');
      }
    } catch (err) {
      console.error('Transcription error:', err);
      setError('Connection error. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTranscription = () => {
    if (!transcription) return;
    const element = document.createElement('a');
    const blob = new Blob([transcription], { type: 'text/plain' });
    element.href = URL.createObjectURL(blob);
    element.download = 'transcription.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // STRIPE UPGRADE FLOW
  // ═══════════════════════════════════════════════════════════════════════════
  const upgradeTier = async (tier) => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      setAuthMode('signup');
      return;
    }

    try {
      setError('');

      const response = await fetch(
        `${API_BASE_URL}/api/billing/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tier }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || 'Unable to start checkout. Please try again.');
        return;
      }

      if (data.checkout_url) {
        // Redirect to Stripe Checkout
        window.location.href = data.checkout_url;
      } else {
        setError('No checkout URL returned from server.');
      }
    } catch (err) {
      console.error('Upgrade error:', err);
      setError('Connection error while starting checkout.');
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH MODAL
  // ═══════════════════════════════════════════════════════════════════════════
  const renderAuthModal = () => {
    if (!showAuthModal) return null;

    const remainingAttempts = getRemainingGuestAttempts();
    const canContinueAsGuest = remainingAttempts > 0;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      >
        <div className="relative w-full max-w-md animate-fadeIn">
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-emerald-400 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-teal-400 rounded-full opacity-20 blur-3xl"></div>

          <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden">
            <button
              onClick={() => {
                setShowAuthModal(false);
                setAuthError('');
                setIsAuthLoading(false);
              }}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-8 py-10 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                {authMode === 'login' ? 'Welcome Back' : 'Get Started Free'}
              </h2>
              <p className="text-slate-400 mt-2 text-sm">
                {authMode === 'login'
                  ? 'Sign in to access your dashboard'
                  : 'Create your account in seconds'}
              </p>
            </div>

            <div className="px-8 py-8">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAuth();
                }}
                className="space-y-4"
              >
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={isAuthLoading}
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-800 placeholder-slate-400 disabled:opacity-50"
                        placeholder="John Smith"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isAuthLoading}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-800 placeholder-slate-400 disabled:opacity-50"
                      placeholder="you@company.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isAuthLoading}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-800 placeholder-slate-400 disabled:opacity-50"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {authError && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700">{authError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isAuthLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {authMode === 'login' ? 'Signing in...' : 'Creating account...'}
                    </>
                  ) : authMode === 'login' ? (
                    'Sign In'
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'signup' : 'login');
                    setAuthError('');
                  }}
                  disabled={isAuthLoading}
                  className="text-slate-600 hover:text-emerald-600 font-medium transition-colors disabled:opacity-50"
                >
                  {authMode === 'login'
                    ? "Don't have an account? Sign up free"
                    : 'Already have an account? Sign in'}
                </button>
              </div>

              {canContinueAsGuest ? (
                <button
                  type="button"
                  onClick={handleContinueAsGuest}
                  disabled={isAuthLoading}
                  className="mt-4 w-full text-slate-500 hover:text-slate-700 font-medium text-sm py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                >
                  Continue as guest ({remainingAttempts} free transcription
                  {remainingAttempts !== 1 ? 's' : ''} left)
                </button>
              ) : (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm text-amber-800 text-center font-medium">
                    ⚠️ You've used all {FREE_GUEST_LIMIT} free transcriptions. Sign up
                    to continue!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════════
  const Navigation = () => (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setCurrentPage('home')}
          >
            <VoxifyLogoSmall size={32} />
            <span className="font-semibold text-slate-900 text-lg">Voxify</span>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => setCurrentPage('home')}
              className={`text-sm font-medium ${
                currentPage === 'home'
                  ? 'text-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setCurrentPage('features')}
              className={`text-sm font-medium ${
                currentPage === 'features'
                  ? 'text-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Features
            </button>
            <button
              onClick={() => setCurrentPage('pricing')}
              className={`text-sm font-medium ${
                currentPage === 'pricing'
                  ? 'text-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pricing
            </button>
            <button
              onClick={() => setCurrentPage('about')}
              className={`text-sm font-medium ${
                currentPage === 'about'
                  ? 'text-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              About
            </button>
            <button
              onClick={() => setCurrentPage('contact')}
              className={`text-sm font-medium ${
                currentPage === 'contact'
                  ? 'text-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Contact
            </button>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {isLoggedIn ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-slate-700">
                    {usageMinutes}/{TIER_LIMITS[userTier] ?? '?'} min
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">
                      {username ? username.charAt(0).toUpperCase() : '?'}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    {username || userEmail}
                  </span>
                </div>
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1"
                >
                  <BarChart3 className="w-4 h-4" />
                  Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-slate-500 hover:text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : isGuestMode ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 rounded-full">
                  <span className="text-sm font-medium text-amber-700">
                    Guest • {getRemainingGuestAttempts()}/{FREE_GUEST_LIMIT} free
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowAuthModal(true);
                    setAuthMode('signup');
                  }}
                  className="text-sm font-medium bg-slate-900 text-white px-5 py-2.5 rounded-full hover:bg-slate-800"
                >
                  Sign Up
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setShowAuthModal(true);
                    setAuthMode('login');
                  }}
                  className="text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setShowAuthModal(true);
                    setAuthMode('signup');
                  }}
                  className="text-sm font-medium bg-slate-900 text-white px-5 py-2.5 rounded-full hover:bg-slate-800"
                >
                  Get Started Free
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200">
          <div className="px-4 py-4 space-y-4">
            {!isLoggedIn && !isGuestMode ? (
              <>
                <button
                  onClick={() => setCurrentPage('home')}
                  className="block w-full text-left text-sm font-medium text-slate-700 py-2"
                >
                  Home
                </button>
                <button
                  onClick={() => setCurrentPage('features')}
                  className="block w-full text-left text-sm font-medium text-slate-700 py-2"
                >
                  Features
                </button>
                <button
                  onClick={() => setCurrentPage('pricing')}
                  className="block w-full text-left text-sm font-medium text-slate-700 py-2"
                >
                  Pricing
                </button>
                <button
                  onClick={() => setCurrentPage('about')}
                  className="block w-full text-left text-sm font-medium text-slate-700 py-2"
                >
                  About
                </button>
                <button
                  onClick={() => setCurrentPage('contact')}
                  className="block w-full text-left text-sm font-medium text-slate-700 py-2"
                >
                  Contact
                </button>
                <div className="pt-2 border-t border-slate-200">
                  <button
                    onClick={() => {
                      setShowAuthModal(true);
                      setAuthMode('login');
                    }}
                    className="w-full text-sm font-medium text-slate-600 py-2"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      setShowAuthModal(true);
                      setAuthMode('signup');
                    }}
                    className="mt-2 w-full text-sm font-medium bg-slate-900 text-white px-5 py-2.5 rounded-full hover:bg-slate-800"
                  >
                    Get Started Free
                  </button>
                  <button
                    onClick={handleContinueAsGuest}
                    className="mt-2 w-full text-sm font-medium text-slate-500 py-2"
                  >
                    Continue as guest ({getRemainingGuestAttempts()} free)
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className="block w-full text-left text-sm font-medium text-slate-700 py-2"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setCurrentPage('pricing')}
                  className="block w-full text-left text-sm font-medium text-slate-700 py-2"
                >
                  Pricing
                </button>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left text-sm font-medium text-red-600 py-2"
                >
                  Log Out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // GUEST TRANSCRIBE PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  const GuestTranscribePage = () => {
    const remainingAttempts = getRemainingGuestAttempts();
    const usedAttempts = guestTranscriptionCount;
    const isLimitReached = remainingAttempts <= 0;

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black flex items-center justify-center px-4 pb-12 pt-24">
        <div className="max-w-4xl w-full text-center text-white">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-6">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold tracking-wide text-emerald-200">
              Guest Mode
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Try Voxify without signing up
          </h1>
          <p className="text-slate-300 max-w-xl mx-auto mb-8">
            You have {remainingAttempts} of {FREE_GUEST_LIMIT} free
            transcriptions remaining. Upload an audio file and see the magic.
          </p>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <div className="border-2 border-dashed border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center mb-4">
                  <FileAudio className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="text-slate-200 font-medium mb-1">
                    Drop your audio here
                  </p>
                  <p className="text-xs text-slate-400 mb-4">
                    MP3, WAV, M4A up to 25MB
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-full text-sm font-semibold hover:bg-slate-100"
                    disabled={isLimitReached}
                  >
                    <Upload className="w-4 h-4" />
                    Upload File
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="audio/*"
                    className="hidden"
                  />
                  {file && (
                    <p className="mt-3 text-xs text-emerald-300">
                      Selected: {file.name}
                    </p>
                  )}
                  {isLimitReached && (
                    <p className="mt-3 text-xs text-amber-400 font-medium">
                      Free limit reached. Sign up to continue.
                    </p>
                  )}
                </div>

                <button
                  onClick={handleTranscribe}
                  disabled={!file || isProcessing || isLimitReached}
                  className="w-full inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-white py-3 rounded-xl font-semibold"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Transcribing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Transcribe Audio
                    </>
                  )}
                </button>

                {error && (
                  <p className="mt-3 text-xs text-amber-300 text-left">{error}</p>
                )}
              </div>

              <div className="flex-1 bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-left">
                <p className="text-xs text-slate-400 mb-2">
                  Free transcriptions used: {usedAttempts}/{FREE_GUEST_LIMIT}
                </p>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-emerald-500"
                    style={{
                      width: `${(usedAttempts / FREE_GUEST_LIMIT) * 100}%`,
                    }}
                  ></div>
                </div>
                <h3 className="text-sm font-semibold text-slate-100 mb-2">
                  Transcription
                </h3>
                <div className="h-48 overflow-auto rounded-xl bg-black/40 border border-slate-800 p-3 text-sm text-slate-100">
                  {transcription ? (
                    <pre className="whitespace-pre-wrap text-xs md:text-sm">
                      {transcription}
                    </pre>
                  ) : (
                    <p className="text-slate-500 text-xs">
                      Your transcription will appear here.
                    </p>
                  )}
                </div>
                {transcription && (
                  <button
                    onClick={downloadTranscription}
                    className="mt-3 inline-flex items-center gap-2 text-xs text-slate-300 hover:text-white"
                  >
                    <Download className="w-3 h-3" />
                    Download as .txt
                  </button>
                )}
              </div>
            </div>
          </div>

          <p className="mt-6 text-xs text-slate-500">
            Want unlimited transcriptions?{' '}
            <button
              onClick={() => {
                setShowAuthModal(true);
                setAuthMode('signup');
              }}
              className="underline underline-offset-4 text-emerald-300 hover:text-emerald-200"
            >
              Create a free account
            </button>
          </p>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════
  const Dashboard = () => (
    <div className="min-h-screen bg-slate-50 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span>Dashboard</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                <Sparkles className="w-3 h-3" />
                {userTier.toUpperCase()}
              </span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Welcome back, {username || userEmail}. Manage your transcriptions and
              plan.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab('transcribe')}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${
                activeTab === 'transcribe'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              <Upload className="w-4 h-4" />
              New Transcription
            </button>
            <button
              onClick={() => setActiveTab('pricing')}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${
                activeTab === 'pricing'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white text-emerald-700 border border-emerald-200'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Upgrade Plan
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <FileAudio className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Transcriptions</p>
              <p className="text-lg font-semibold text-slate-900">
                {transcriptionCount}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-sky-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Minutes used</p>
              <p className="text-lg font-semibold text-slate-900">
                {usageMinutes}/{TIER_LIMITS[userTier] ?? '?'}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
              <Globe className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Plan</p>
              <p className="text-lg font-semibold capitalize text-slate-900">
                {userTier}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <p className="text-lg font-semibold text-emerald-600">Active</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
              <div className="flex gap-2 mb-4">
                {[
                  { id: 'transcribe', label: 'Transcribe' },
                  { id: 'history', label: 'History' },
                  { id: 'pricing', label: 'Billing & Plans' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs md:text-sm font-medium ${
                      activeTab === tab.id
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'transcribe' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center">
                    <FileAudio className="w-10 h-10 text-slate-400 mb-3" />
                    <p className="text-slate-700 font-medium mb-1">
                      Upload your audio file
                    </p>
                    <p className="text-xs text-slate-500 mb-4">
                      MP3, WAV, M4A up to 25MB
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-slate-800"
                    >
                      <Upload className="w-4 h-4" />
                      Choose File
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="audio/*"
                      className="hidden"
                    />
                    {file && (
                      <p className="mt-3 text-xs text-emerald-600">
                        Selected: {file.name}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleTranscribe}
                    disabled={!file || isProcessing}
                    className="w-full inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-200 text-white py-3 rounded-xl font-semibold"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Transcribing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Transcribe Now
                      </>
                    )}
                  </button>

                  {error && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-2">
                      Latest transcription
                    </h3>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 h-64 overflow-auto text-sm text-slate-800">
                      {transcription ? (
                        <pre className="whitespace-pre-wrap text-xs md:text-sm">
                          {transcription}
                        </pre>
                      ) : (
                        <p className="text-slate-500 text-xs">
                          Your transcription will appear here.
                        </p>
                      )}
                    </div>
                    {transcription && (
                      <button
                        onClick={downloadTranscription}
                        className="mt-3 inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
                      >
                        <Download className="w-3 h-3" />
                        Download as .txt
                      </button>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-3">
                  {transcriptionHistory.length === 0 ? (
                    <div className="text-center py-10">
                      <FileAudio className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm text-slate-500">
                        No transcriptions yet. Upload your first audio file.
                      </p>
                    </div>
                  ) : (
                    transcriptionHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex justify-between items-start gap-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900 line-clamp-1">
                            {item.fileName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(item.date).toLocaleString()} •{' '}
                            {item.duration} min
                          </p>
                        </div>
                        <button
                          onClick={() => setTranscription(item.transcription)}
                          className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
                        >
                          View
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'pricing' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-slate-900 mb-2">
                    Upgrade Your Plan
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      {
                        tier: 'free',
                        name: 'Free',
                        price: '$0',
                        minutes: 15,
                        features: ['15 min/month', 'Standard quality'],
                      },
                      {
                        tier: 'starter',
                        name: 'Starter',
                        price: '$9',
                        minutes: 300,
                        features: [
                          '300 min/month',
                          'High quality',
                          'API access',
                        ],
                        popular: true,
                      },
                      {
                        tier: 'pro',
                        name: 'Pro',
                        price: '$29',
                        minutes: 1000,
                        features: ['1,000 min/month', 'Ultra quality', '24/7 support'],
                      },
                      {
                        tier: 'enterprise',
                        name: 'Enterprise',
                        price: '$99',
                        minutes: 10000,
                        features: [
                          '10,000 min/month',
                          'Dedicated support',
                        ],
                      },
                    ].map((plan) => (
                      <div
                        key={plan.tier}
                        className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all ${
                          userTier === plan.tier
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-slate-200 hover:border-emerald-300'
                        }`}
                        onClick={() =>
                          plan.tier === 'free' ? null : upgradeTier(plan.tier)
                        }
                      >
                        {plan.popular && (
                          <span className="absolute -top-2.5 left-4 bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                            POPULAR
                          </span>
                        )}
                        {userTier === plan.tier && (
                          <span className="absolute -top-2.5 right-4 bg-slate-900 text-white text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            CURRENT
                          </span>
                        )}
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              {plan.name}
                            </h3>
                            <p className="text-xs text-slate-500">
                              {plan.minutes} min/month
                            </p>
                          </div>
                          <span className="text-2xl font-bold text-slate-900">
                            {plan.price}
                          </span>
                        </div>
                        <ul className="space-y-2">
                          {plan.features.map((feature, idx) => (
                            <li
                              key={idx}
                              className="flex items-center gap-2 text-sm text-slate-600"
                            >
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600">Total Transcriptions</span>
                  <span className="font-semibold text-slate-900">
                    {transcriptionCount}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600">Minutes Used</span>
                  <span className="font-semibold text-slate-900">
                    {usageMinutes}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600">Current Plan</span>
                  <span className="font-semibold text-emerald-600 capitalize">
                    {userTier}
                  </span>
                </div>
              </div>
            </div>
            {userTier === 'free' && (
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
                <h3 className="font-semibold text-lg mb-2">Upgrade to Pro</h3>
                <p className="text-emerald-100 text-sm mb-4">
                  Get 1,000 minutes/month and premium features.
                </p>
                <button
                  onClick={() => setActiveTab('pricing')}
                  className="w-full bg-white text-emerald-600 py-2.5 rounded-xl font-semibold hover:bg-emerald-50"
                >
                  View Plans
                </button>
              </div>
            )}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Need Help?</h3>
                  <p className="text-xs text-slate-500">
                    We&apos;re here to assist
                  </p>
                </div>
              </div>
              <button className="w-full py-2.5 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50">
                View Documentation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // MARKETING PAGES (Home, Pricing, Features, About, Contact)
  // ═══════════════════════════════════════════════════════════════════════════
  const HomePage = () => (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-6">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold tracking-wide text-emerald-200">
                New • Self-hosted Whisper support
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
              Transcribe audio to text in seconds.
            </h1>
            <p className="text-slate-300 text-lg mb-6 max-w-xl">
              Upload your audio, let the AI handle the rest. Designed for creators,
              teams, and businesses who live in audio.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <button
                onClick={handleContinueAsGuest}
                className="inline-flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-full font-semibold hover:bg-slate-100"
              >
                Try it free
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage('pricing')}
                className="inline-flex items-center gap-2 text-slate-200 px-4 py-3 rounded-full border border-slate-700 hover:border-slate-500 text-sm"
              >
                View pricing
                <CreditCard className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <div className="flex -space-x-2">
                <div className="w-7 h-7 rounded-full bg-emerald-500/80 flex items-center justify-center text-[10px] font-semibold text-white border border-slate-900">
                  AI
                </div>
                <div className="w-7 h-7 rounded-full bg-sky-500/80 flex items-center justify-center text-[10px] font-semibold text-white border border-slate-900">
                  DEV
                </div>
                <div className="w-7 h-7 rounded-full bg-violet-500/80 flex items-center justify-center text-[10px] font-semibold text-white border border-slate-900">
                  POD
                </div>
              </div>
              <span>Trusted by podcasters, dev teams, and agencies worldwide.</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -top-10 -right-10 w-60 h-60 bg-emerald-500/30 blur-3xl rounded-full"></div>
            <div className="absolute -bottom-6 -left-6 w-40 h-40 bg-teal-500/30 blur-3xl rounded-full"></div>
            <div className="relative bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-800 rounded-2xl flex items-center justify-center">
                    <Headphones className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-100">Live Demo</p>
                    <p className="text-xs text-slate-400">Upload & transcribe</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-amber-300 text-xs">
                  <Star className="w-4 h-4 fill-amber-300" />
                  <span>4.9</span>
                </div>
              </div>

              <div className="border border-slate-800 rounded-2xl p-4 mb-4 bg-slate-950/60">
                <div className="flex items-center gap-3 mb-3">
                  <FileAudio className="w-6 h-6 text-slate-100" />
                  <div>
                    <p className="text-sm text-slate-100">Demo recording.wav</p>
                    <p className="text-xs text-slate-500">02:34 • English (US)</p>
                  </div>
                </div>
                <div className="h-24 bg-slate-900 rounded-xl flex items-center justify-center text-xs text-slate-500">
                  Waveform preview
                </div>
              </div>

              <div className="border border-slate-800 rounded-2xl p-4 bg-black/50">
                <p className="text-xs text-slate-400 mb-1">Transcript</p>
                <p className="text-sm text-slate-100 line-clamp-3">
                  “Welcome to Voxify, your AI transcription co-pilot. Upload any
                  recording and get clean, accurate text in seconds — ready for notes,
                  documentation, or publishing.”
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const PricingPage = () => (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Choose the plan that fits your needs.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {[
            {
              tier: 'free',
              name: 'Free',
              price: '$0',
              minutes: 15,
              features: ['15 min/month', 'Standard quality', 'Email support'],
              description: 'Perfect for trying out',
            },
            {
              tier: 'starter',
              name: 'Starter',
              price: '$9',
              minutes: 300,
              features: [
                '300 min/month',
                'High quality',
                'Priority support',
                'API access',
              ],
              popular: true,
              description: 'Best for individuals',
            },
            {
              tier: 'pro',
              name: 'Pro',
              price: '$29',
              minutes: 1000,
              features: [
                '1,000 min/month',
                'Ultra quality',
                '24/7 support',
                'Speaker detection',
              ],
              description: 'Best for teams',
            },
            {
              tier: 'enterprise',
              name: 'Enterprise',
              price: '$99',
              minutes: 10000,
              features: [
                '10,000 min/month',
                'Ultra quality',
                'Dedicated support',
                'Custom models',
              ],
              description: 'Best for organizations',
            },
          ].map((plan) => (
            <div
              key={plan.tier}
              className={`relative p-6 rounded-2xl border-2 transition-all ${
                plan.popular
                  ? 'border-emerald-500 bg-white shadow-xl scale-105'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                    MOST POPULAR
                  </span>
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900">
                  {plan.name}
                </h3>
                <p className="text-sm text-slate-500">{plan.description}</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-900">
                  {plan.price}
                </span>
                <span className="text-slate-500">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-slate-700"
                  >
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  if (!isLoggedIn) {
                    setShowAuthModal(true);
                    setAuthMode('signup');
                  } else if (plan.tier !== 'free') {
                    upgradeTier(plan.tier);
                  }
                }}
                className={`w-full py-3 rounded-xl font-semibold transition-all ${
                  plan.popular
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/30'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {plan.tier === 'free'
                  ? 'Start Free'
                  : isLoggedIn && userTier === plan.tier
                  ? 'Current Plan'
                  : 'Get Started'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const FeaturesPage = () => (
    <div className="min-h-screen bg-white pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
              Features built for modern teams
            </h1>
            <p className="text-lg text-slate-600 mb-6">
              Voxify is designed to fit perfectly into your workflow, whether
              you&apos;re a solo creator or a global team.
            </p>
            <ul className="space-y-4">
              {[
                'High-accuracy speech-to-text with self-hosted Whisper',
                'Support for long-form content and multi-speaker audio',
                'Secure, GDPR-ready infrastructure',
                'Developer-friendly API for automation',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-700">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">
              Workflow snapshot
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-200">
                <Upload className="w-5 h-5 text-slate-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    Upload audio
                  </p>
                  <p className="text-xs text-slate-500">
                    Drag & drop your recordings
                  </p>
                </div>
                <span className="text-xs text-slate-500">Step 1</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-200">
                <Zap className="w-5 h-5 text-emerald-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    AI processing
                  </p>
                  <p className="text-xs text-slate-500">
                    Whisper handles transcription
                  </p>
                </div>
                <span className="text-xs text-slate-500">Step 2</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-200">
                <Download className="w-5 h-5 text-slate-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    Export text
                  </p>
                  <p className="text-xs text-slate-500">
                    Download or send to your tools
                  </p>
                </div>
                <span className="text-xs text-slate-500">Step 3</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Built for security and scale
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: 'Secure by default',
                desc: 'All requests are encrypted in transit. Self-hosted Whisper keeps audio under your control.',
              },
              {
                icon: Globe,
                title: 'Global performance',
                desc: 'Optimized edge routing ensures low latency wherever your team is based.',
              },
              {
                icon: Settings,
                title: 'Developer-first',
                desc: 'Simple REST API that works with any language or platform.',
              },
            ].map((f, i) => (
              <div
                key={i}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-6"
              >
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-slate-700" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-slate-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const AboutPage = () => (
    <div className="min-h-screen bg-white pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            About Voxify
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            We&apos;re on a mission to make audio transcription accessible,
            accurate, and affordable for everyone.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { value: '50K+', label: 'Active Users' },
            { value: '10M+', label: 'Minutes Transcribed' },
            { value: '99%', label: 'Uptime' },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-100"
            >
              <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-slate-600 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
        <div className="max-w-3xl mx-auto text-slate-700 text-sm leading-relaxed space-y-4">
          <p>
            Voxify started as a side project to make transcription easier for
            indie podcasters. Over time, it grew into a full platform used by
            teams, agencies, and enterprises all over the world.
          </p>
          <p>
            We believe in giving you control: self-hosted Whisper support, clear
            pricing, and tools that fit into your workflow instead of the other
            way around.
          </p>
        </div>
      </div>
    </div>
  );

  const ContactPage = () => (
    <div className="min-h-screen bg-white pt-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Get in touch
          </h1>
          <p className="text-lg text-slate-600">
            Have questions? We&apos;d love to hear from you.
          </p>
        </div>
        {contactSubmitted ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
            <p className="text-slate-800 font-semibold mb-1">
              Message sent successfully
            </p>
            <p className="text-sm text-slate-600">
              We&apos;ll get back to you as soon as possible.
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setContactSubmitted(true);
            }}
            className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm"
          >
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={contactForm.name}
                  onChange={(e) =>
                    setContactForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) =>
                    setContactForm((f) => ({ ...f, email: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={contactForm.subject}
                onChange={(e) =>
                  setContactForm((f) => ({ ...f, subject: e.target.value }))
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Message
              </label>
              <textarea
                value={contactForm.message}
                onChange={(e) =>
                  setContactForm((f) => ({ ...f, message: e.target.value }))
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-h-[120px]"
                required
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-full text-sm font-semibold hover:bg-slate-800"
            >
              Send Message
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER ROOT
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="font-sans antialiased">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>

      {renderAuthModal()}
      <Navigation />

      {isLoggedIn ? (
        <Dashboard />
      ) : isGuestMode ? (
        <GuestTranscribePage />
      ) : (
        <>
          {currentPage === 'home' && <HomePage />}
          {currentPage === 'pricing' && <PricingPage />}
          {currentPage === 'features' && <FeaturesPage />}
          {currentPage === 'about' && <AboutPage />}
          {currentPage === 'contact' && <ContactPage />}
        </>
      )}
    </div>
  );
}
