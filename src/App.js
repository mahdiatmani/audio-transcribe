import React, { useState, useRef, useEffect } from 'react';
import { Upload, Mic, FileAudio, Download, Loader2, CheckCircle, AlertCircle, Zap, LogOut, User, Lock, Mail, Shield, Clock, Globe, Headphones, Play, Star, ChevronRight, Menu, X, Settings, BarChart3, CreditCard, HelpCircle, ArrowRight, Sparkles } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// API CONFIGURATION - Change this to your backend URL
// ═══════════════════════════════════════════════════════════════════════════
const API_BASE_URL = 'https://transcribe-backend-f6o6.onrender.com';

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
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const FREE_GUEST_LIMIT = 3;
const TIER_LIMITS = {
  free: 15,
  starter: 300,
  pro: 1000,
  enterprise: 10000
};

// Custom Voxify Logo Component
const VoxifyLogo = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
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
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
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

export default function AudioTranscriptionSaaS() {
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE VARIABLES
  // ═══════════════════════════════════════════════════════════════════════════
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authError, setAuthError] = useState('');
  const [authToken, setAuthToken] = useState('');
  
  const [file, setFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState('');
  const [transcriptionCount, setTranscriptionCount] = useState(0);
  const [usageMinutes, setUsageMinutes] = useState(0);
  const [userTier, setUserTier] = useState('free');
  const [userEmail, setUserEmail] = useState('');
  const [transcriptionHistory, setTranscriptionHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('transcribe');
  
  // Guest state
  const [guestTranscriptionCount, setGuestTranscriptionCount] = useState(0);
  const [isGuestMode, setIsGuestMode] = useState(false);
  
  // UI State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  const getRemainingGuestAttempts = () => Math.max(0, FREE_GUEST_LIMIT - guestTranscriptionCount);
  const canGuestTranscribe = () => guestTranscriptionCount < FREE_GUEST_LIMIT;

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    // Check if user is already logged in
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
    
    // Load guest transcription count - ALWAYS load this
    const storedGuestCount = storage.get('voxify_guest_count');
    if (storedGuestCount) {
      try {
        const count = parseInt(storedGuestCount.value, 10);
        const validCount = isNaN(count) ? 0 : Math.min(Math.max(0, count), FREE_GUEST_LIMIT + 10); // Cap at reasonable max
        setGuestTranscriptionCount(validCount);
        console.log('Loaded guest count from storage:', validCount);
      } catch (err) {
        console.error('Error parsing guest count:', err);
        setGuestTranscriptionCount(0);
      }
    } else {
      // Initialize guest count to 0 if not found
      storage.set('voxify_guest_count', '0');
      console.log('Initialized guest count to 0');
    }
  }, []);

  // Sync latest usage/tier from backend when logged in (e.g. after Stripe upgrade)
  useEffect(() => {
    const fetchStats = async () => {
      if (!isLoggedIn || !authToken) return;

      try {
        const res = await fetch(`${API_BASE_URL}/api/user/stats`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        });
        const data = await res.json();
        if (res.ok) {
          setUserTier(data.tier || 'free');
          setUsageMinutes(data.usage_minutes || 0);
          setTranscriptionCount(data.transcription_count || 0);
        }
      } catch (err) {
        console.error('Failed to refresh user stats:', err);
      }
    };

    fetchStats();
  }, [isLoggedIn, authToken]);

  // Save user data when it changes
  useEffect(() => {
    if (isLoggedIn && userEmail) {
      storage.set('voxify_auth', JSON.stringify({
        token: authToken,
        email: userEmail,
        username,
        tier: userTier,
        usageMinutes,
        transcriptionCount,
        lastUpdated: new Date().toISOString()
      }));
    }
  }, [isLoggedIn, userEmail, username, userTier, usageMinutes, transcriptionCount, authToken]);

  useEffect(() => {
    if (isLoggedIn && transcriptionHistory.length > 0) {
      storage.set('voxify_history', JSON.stringify(transcriptionHistory));
    }
  }, [transcriptionHistory, isLoggedIn]);

  useEffect(() => {
    storage.set('voxify_guest_count', guestTranscriptionCount.toString());
  }, [guestTranscriptionCount]);

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTHENTICATION
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
      const payload = authMode === 'signup' 
        ? { username, email, password }
        : { email, password };

      const response = await fetch(`${API_BASE_URL}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        storage.set('voxify_auth', JSON.stringify({
          token: data.token,
          email: data.user.email,
          username: data.user.username,
          tier: data.user.tier || 'free',
          usageMinutes: data.user.usage_minutes || 0,
          transcriptionCount: data.user.transcription_count || 0,
          createdAt: new Date().toISOString()
        }));

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
    console.log('Continue as guest clicked');
    console.log('Guest count:', guestTranscriptionCount);
    console.log('Can transcribe:', canGuestTranscribe());
    
    if (!canGuestTranscribe()) {
      setAuthMode('signup');
      setAuthError(`You have used all ${FREE_GUEST_LIMIT} free attempts. Please sign up to continue.`);
      setShowAuthModal(true);
      return;
    }
    
    // Close modal first if open
    setShowAuthModal(false);
    setAuthError('');
    
    // Then set guest mode - this will trigger the GuestTranscribePage render
    setIsGuestMode(true);
    
    console.log('Guest mode activated');
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
  // FILE HANDLING
  // ═══════════════════════════════════════════════════════════════════════════
  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile && uploadedFile.type.startsWith('audio/')) {
      setFile(uploadedFile);
      setError('');
    } else {
      setError('Please upload a valid audio file');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
        setFile(audioFile);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setError('');
    } catch (err) {
      setError('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSCRIPTION
  // ═══════════════════════════════════════════════════════════════════════════
  const transcribeAudio = async () => {
    if (!file) {
      setError('Please upload or record an audio file first');
      return;
    }

    // STRICT CHECK: Guest limits - check BEFORE anything else
    if (!isLoggedIn) {
      // Get the latest count from localStorage to prevent tampering
      const storedCount = storage.get('voxify_guest_count');
      const currentCount = storedCount ? parseInt(storedCount.value, 10) : 0;
      
      console.log('Guest transcription attempt. Current count:', currentCount, 'Limit:', FREE_GUEST_LIMIT);
      
      if (currentCount >= FREE_GUEST_LIMIT) {
        setError(`You have used all ${FREE_GUEST_LIMIT} free transcriptions. Please sign up to continue.`);
        setShowAuthModal(true);
        setAuthMode('signup');
        setAuthError(`You've used all ${FREE_GUEST_LIMIT} free transcriptions. Sign up for unlimited access!`);
        return;
      }
    }

    // Check logged-in user limits
    if (isLoggedIn) {
      const estimatedMinutes = 2;
      if (usageMinutes + estimatedMinutes > TIER_LIMITS[userTier]) {
        setError(`You've reached your ${userTier} tier limit. Please upgrade to continue.`);
        return;
      }
    }

    setIsProcessing(true);
    setError('');
    setTranscription('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const headers = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTranscription(data.transcription);
        setError('');

        // LOGGED IN FLOW
        if (isLoggedIn) {
          setTranscriptionCount(data.usage.used ? data.usage.used : transcriptionCount + 1);
          setUsageMinutes(data.usage.used ?? usageMinutes + 2);

          const newHistoryItem = {
            id: Date.now(),
            fileName: data.filename,
            transcription: data.transcription,
            date: new Date().toISOString(),
            duration: data.duration
          };
          
          setTranscriptionHistory(prev => [newHistoryItem, ...prev].slice(0, 10));
        } else {
          // GUEST: Increment count IMMEDIATELY after successful transcription
          const newCount = guestTranscriptionCount + 1;
          setGuestTranscriptionCount(newCount);
          
          // Save to localStorage immediately
          storage.set('voxify_guest_count', newCount.toString());
          
          console.log('Guest transcription successful. New count:', newCount);
          
          // Show appropriate message based on remaining attempts
          if (newCount >= FREE_GUEST_LIMIT) {
            // No more attempts - force signup
            setTimeout(() => {
              setShowAuthModal(true);
              setAuthMode('signup');
              setAuthError('You have used all your free transcriptions. Sign up now for unlimited access!');
            }, 2000);
            setError(`✓ Transcription complete! You've used all ${FREE_GUEST_LIMIT} free attempts. Sign up to continue.`);
          } else {
            const remaining = FREE_GUEST_LIMIT - newCount;
            setError(`✓ Success! ${remaining} free transcription${remaining !== 1 ? 's' : ''} remaining. Sign up for unlimited access!`);
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
    const element = document.createElement('a');
    const blob = new Blob([transcription], { type: 'text/plain' });
    element.href = URL.createObjectURL(blob);
    element.download = 'transcription.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const upgradeTier = async (tier) => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      setAuthMode('signup');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/billing/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.detail || 'Unable to start checkout. Please try again.');
        return;
      }
      
      if (data.checkout_url) {
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
        <div className="relative w-full max-w-md animate-fadeIn">
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-emerald-400 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-teal-400 rounded-full opacity-20 blur-3xl"></div>
          
          <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden">
            <button
              onClick={() => { setShowAuthModal(false); setAuthError(''); setIsAuthLoading(false); }}
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
                {authMode === 'login' ? 'Sign in to access your dashboard' : 'Create your account in seconds'}
              </p>
            </div>

            <div className="px-8 py-6">
              {authError && (
                <div className="mb-4 flex items-start gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
                  <AlertCircle className="w-4 h-4 mt-0.5" />
                  <p>{authError}</p>
                </div>
              )}

              {authMode === 'signup' && (
                <div className="mb-4 flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 border border-emerald-100">
                  <Sparkles className="w-4 h-4" />
                  <p><span className="font-semibold">Sign up now</span> and get 15 free minutes every month, priority processing, and saved history.</p>
                </div>
              )}

              <div className="space-y-4">
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                        <User className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                      <Shield className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleAuth}
                disabled={isAuthLoading}
                className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white py-2.5 text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-70"
              >
                {isAuthLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{authMode === 'login' ? 'Signing you in...' : 'Creating your account...'}</span>
                  </>
                ) : (
                  <span>{authMode === 'login' ? 'Sign In' : 'Create Account'}</span>
                )}
              </button>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <button
                  onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                  className="hover:text-slate-700 font-medium"
                >
                  {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </button>
                {canContinueAsGuest && (
                  <button
                    onClick={handleContinueAsGuest}
                    className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    <Headphones className="w-3 h-3" />
                    <span>Continue as guest ({remainingAttempts} left)</span>
                  </button>
                )}
              </div>

              <p className="mt-4 text-[11px] text-slate-400 text-center">
                By continuing, you agree to our <span className="underline">Terms</span> and <span className="underline">Privacy Policy</span>.
              </p>
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
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => {
            if (isLoggedIn) setCurrentPage('dashboard');
            else { setIsGuestMode(false); setCurrentPage('home'); }
          }}>
            <VoxifyLogo size={40} />
            <span className="text-xl font-bold text-slate-900">Voxify</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {!isLoggedIn && !isGuestMode ? (
              <>
                <button onClick={() => setCurrentPage('home')} className={`text-sm font-medium ${currentPage === 'home' ? 'text-emerald-600' : 'text-slate-600 hover:text-slate-900'}`}>Home</button>
                <button onClick={() => setCurrentPage('features')} className={`text-sm font-medium ${currentPage === 'features' ? 'text-emerald-600' : 'text-slate-600 hover:text-slate-900'}`}>Features</button>
                <button onClick={() => setCurrentPage('pricing')} className={`text-sm font-medium ${currentPage === 'pricing' ? 'text-emerald-600' : 'text-slate-600 hover:text-slate-900'}`}>Pricing</button>
                <button onClick={() => setCurrentPage('about')} className={`text-sm font-medium ${currentPage === 'about' ? 'text-emerald-600' : 'text-slate-600 hover:text-slate-900'}`}>About</button>
                <button onClick={() => setCurrentPage('contact')} className={`text-sm font-medium ${currentPage === 'contact' ? 'text-emerald-600' : 'text-slate-600 hover:text-slate-900'}`}>Contact</button>
              </>
            ) : isLoggedIn ? (
              <>
                <button onClick={() => { setCurrentPage('dashboard'); setActiveTab('transcribe'); }} className={`text-sm font-medium ${activeTab === 'transcribe' ? 'text-emerald-600' : 'text-slate-600 hover:text-slate-900'}`}>Transcribe</button>
                <button onClick={() => { setCurrentPage('dashboard'); setActiveTab('history'); }} className={`text-sm font-medium ${activeTab === 'history' ? 'text-emerald-600' : 'text-slate-600 hover:text-slate-900'}`}>History</button>
                <button onClick={() => { setCurrentPage('dashboard'); setActiveTab('pricing'); }} className={`text-sm font-medium ${activeTab === 'pricing' ? 'text-emerald-600' : 'text-slate-600 hover:text-slate-900'}`}>Billing</button>
              </>
            ) : (
              <>
                <button onClick={() => { setIsGuestMode(true); setCurrentPage('dashboard'); }} className={`text-sm font-medium ${isGuestMode ? 'text-emerald-600' : 'text-slate-600 hover:text-slate-900'}`}>Try as Guest</button>
              </>
            )}
          </div>

          <div className="hidden md:flex items-center gap-4">
            {isLoggedIn ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-slate-700">{usageMinutes}/{TIER_LIMITS[userTier]} min</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">{username.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-700">{username}</span>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-1.5 text-slate-500 hover:text-red-600">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : isGuestMode ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 rounded-full">
                  <span className="text-sm font-medium text-amber-700">Guest • {getRemainingGuestAttempts()}/{FREE_GUEST_LIMIT} free</span>
                </div>
                <button onClick={() => { setShowAuthModal(true); setAuthMode('signup'); }} className="text-sm font-medium bg-slate-900 text-white px-5 py-2.5 rounded-full hover:bg-slate-800">
                  Sign Up
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => { setShowAuthModal(true); setAuthMode('login'); }} className="text-sm font-medium text-slate-600 hover:text-slate-900">Sign In</button>
                <button onClick={() => { setShowAuthModal(true); setAuthMode('signup'); }} className="text-sm font-medium bg-slate-900 text-white px-5 py-2.5 rounded-full hover:bg-slate-800">Get Started Free</button>
              </>
            )}
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-slate-600">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200">
          <div className="px-4 py-4 space-y-4">
            {!isLoggedIn && !isGuestMode ? (
              <>
                <button onClick={() => { setCurrentPage('home'); setMobileMenuOpen(false); }} className={`block w-full text-left text-sm font-medium py-1 ${currentPage === 'home' ? 'text-emerald-600' : 'text-slate-700'}`}>Home</button>
                <button onClick={() => { setCurrentPage('features'); setMobileMenuOpen(false); }} className={`block w-full text-left text-sm font-medium py-1 ${currentPage === 'features' ? 'text-emerald-600' : 'text-slate-700'}`}>Features</button>
                <button onClick={() => { setCurrentPage('pricing'); setMobileMenuOpen(false); }} className={`block w-full text-left text-sm font-medium py-1 ${currentPage === 'pricing' ? 'text-emerald-600' : 'text-slate-700'}`}>Pricing</button>
                <button onClick={() => { setCurrentPage('about'); setMobileMenuOpen(false); }} className={`block w-full text-left text-sm font-medium py-1 ${currentPage === 'about' ? 'text-emerald-600' : 'text-slate-700'}`}>About</button>
                <button onClick={() => { setCurrentPage('contact'); setMobileMenuOpen(false); }} className={`block w-full text-left text-sm font-medium py-1 ${currentPage === 'contact' ? 'text-emerald-600' : 'text-slate-700'}`}>Contact</button>
              </>
            ) : null}

            {isLoggedIn && (
              <div className="pt-3 border-t border-slate-100 mt-2">
                <p className="text-xs text-slate-500 mb-2">Account</p>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">{username.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{username}</p>
                      <p className="text-xs text-slate-500 capitalize">{userTier} plan</p>
                    </div>
                  </div>
                  <button onClick={handleLogout} className="flex items-center gap-1.5 text-slate-500 hover:text-red-600">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl">
                  <span className="text-xs text-slate-600">Usage</span>
                  <span className="text-xs font-medium text-slate-900">{usageMinutes}/{TIER_LIMITS[userTier]} min</span>
                </div>
              </div>
            )}

            {!isLoggedIn && !isGuestMode && (
              <div className="pt-3 border-t border-slate-100 mt-2 flex flex-col gap-2">
                <button onClick={() => { setShowAuthModal(true); setAuthMode('login'); setMobileMenuOpen(false); }} className="w-full text-sm font-medium text-slate-700 py-2 rounded-xl border border-slate-200">
                  Sign In
                </button>
                <button onClick={() => { setShowAuthModal(true); setAuthMode('signup'); setMobileMenuOpen(false); }} className="w-full text-sm font-medium text-white py-2 rounded-xl bg-slate-900">
                  Get Started Free
                </button>
              </div>
            )}

            {isGuestMode && (
              <div className="pt-3 border-t border-slate-100 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">Guest free transcriptions</span>
                  <span className="text-xs font-medium text-amber-700">{getRemainingGuestAttempts()}/{FREE_GUEST_LIMIT}</span>
                </div>
                <button 
                  onClick={() => { setShowAuthModal(true); setAuthMode('signup'); setMobileMenuOpen(false); }} 
                  className="mt-3 w-full text-sm font-medium text-white py-2 rounded-xl bg-slate-900"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD (LOGGED-IN / GUEST)
  // ═══════════════════════════════════════════════════════════════════════════
  const Dashboard = () => {
    const isFree = userTier === 'free';

    const usagePercentage = Math.min(100, (usageMinutes / TIER_LIMITS[userTier]) * 100 || 0);

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 text-[11px] font-medium text-white">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                  {isGuestMode ? 'Guest Session' : 'Dashboard'}
                </span>
              </div>
              <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
                {isGuestMode ? 'Try Voxify with free guest access' : 'Welcome back'}
                <span className="text-xl">👋</span>
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {isGuestMode 
                  ? `You have ${getRemainingGuestAttempts()} free transcription${getRemainingGuestAttempts() !== 1 ? 's' : ''} left as a guest.`
                  : 'Upload or record audio and get high-quality transcripts in seconds.'}
              </p>
            </div>

            {!isGuestMode && (
              <div className="hidden md:flex items-center gap-3">
                <div className="px-4 py-2 bg-slate-900 text-white rounded-2xl flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <div className="text-xs">
                    <div className="font-semibold capitalize">{userTier} plan</div>
                    <div className="text-slate-200">{usageMinutes}/{TIER_LIMITS[userTier]} min used</div>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('pricing')}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover
