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
        headers: headers,
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setTranscription(data.transcription);
        
        if (isLoggedIn) {
          setTranscriptionCount(prev => prev + 1);
          setUsageMinutes(data.usage.used);
          
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
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/upgrade?tier=${tier}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        setUserTier(tier);
        setError('');
      }
    } catch (err) {
      setUserTier(tier);
      setError('');
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

            <div className="px-8 py-8">
              <form onSubmit={(e) => { e.preventDefault(); handleAuth(); }} className="space-y-4">
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
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
                  ) : (
                    authMode === 'login' ? 'Sign In' : 'Create Account'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }}
                  disabled={isAuthLoading}
                  className="text-slate-600 hover:text-emerald-600 font-medium transition-colors disabled:opacity-50"
                >
                  {authMode === 'login' ? "Don't have an account? Sign up free" : 'Already have an account? Sign in'}
                </button>
              </div>

              {canContinueAsGuest ? (
                <button
                  type="button"
                  onClick={handleContinueAsGuest}
                  disabled={isAuthLoading}
                  className="mt-4 w-full text-slate-500 hover:text-slate-700 font-medium text-sm py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                >
                  Continue as guest ({remainingAttempts} free transcription{remainingAttempts !== 1 ? 's' : ''} left)
                </button>
              ) : (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm text-amber-800 text-center font-medium">
                    ⚠️ You've used all {FREE_GUEST_LIMIT} free transcriptions. Sign up to continue!
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
  // GUEST TRANSCRIBE PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Effect to show signup modal when guest limit is reached
  useEffect(() => {
    if (isGuestMode && guestTranscriptionCount >= FREE_GUEST_LIMIT && !showAuthModal) {
      setShowAuthModal(true);
      setAuthMode('signup');
      setAuthError(`You've used all ${FREE_GUEST_LIMIT} free transcriptions. Sign up for unlimited access!`);
    }
  }, [isGuestMode, guestTranscriptionCount, showAuthModal]);
  
  const GuestTranscribePage = () => {
    const remainingAttempts = getRemainingGuestAttempts();
    const usedAttempts = guestTranscriptionCount;
    const isLimitReached = remainingAttempts <= 0;
    
    return (
      <div className="min-h-screen bg-slate-50 pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Free Trial</h1>
              <p className="text-slate-600">Try our transcription service - no account needed</p>
            </div>
            <button
              onClick={() => { setShowAuthModal(true); setAuthMode('signup'); }}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-2.5 rounded-full font-semibold hover:from-emerald-600 hover:to-teal-600"
            >
              Sign Up for Unlimited
            </button>
          </div>

          {/* PROMINENT Usage Banner */}
          <div className={`mb-6 p-5 rounded-2xl border-2 ${
            isLimitReached 
              ? 'bg-red-50 border-red-300' 
              : remainingAttempts === 1 
              ? 'bg-amber-50 border-amber-300' 
              : 'bg-emerald-50 border-emerald-300'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {isLimitReached ? (
                  <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                    <Lock className="w-7 h-7 text-red-600" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Zap className="w-7 h-7 text-emerald-600" />
                  </div>
                )}
                <div>
                  <p className={`text-lg font-bold ${
                    isLimitReached ? 'text-red-800' : remainingAttempts === 1 ? 'text-amber-800' : 'text-emerald-800'
                  }`}>
                    {isLimitReached 
                      ? '🔒 Free Trial Ended' 
                      : `${remainingAttempts} Free Transcription${remainingAttempts !== 1 ? 's' : ''} Left`}
                  </p>
                  <p className={`text-sm ${
                    isLimitReached ? 'text-red-600' : remainingAttempts === 1 ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {isLimitReached 
                      ? 'Sign up now to continue using Voxify' 
                      : remainingAttempts === 1
                      ? 'Last free transcription! Sign up for unlimited access'
                      : 'Sign up anytime for unlimited transcriptions'}
                  </p>
                </div>
              </div>
              
              {/* Visual Progress Indicator */}
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2">
                  {[...Array(FREE_GUEST_LIMIT)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        i < usedAttempts 
                          ? 'bg-slate-300 text-slate-500' 
                          : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                      }`}
                    >
                      {i < usedAttempts ? '✓' : i + 1}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500">{usedAttempts} of {FREE_GUEST_LIMIT} used</p>
              </div>
            </div>
            
            {isLimitReached && (
              <button
                onClick={() => { setShowAuthModal(true); setAuthMode('signup'); }}
                className="mt-4 w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Sign Up Free - Get Unlimited Access
              </button>
            )}
          </div>

          {/* Transcription Card - Disabled if limit reached */}
          <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-6 ${isLimitReached ? 'opacity-60 pointer-events-none' : ''}`}>
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Upload Audio</h2>
            
            <div
              onClick={() => !isLimitReached && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
                isLimitReached 
                  ? 'border-slate-200 bg-slate-50 cursor-not-allowed' 
                  : 'border-slate-300 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 group'
              }`}
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                isLimitReached ? 'bg-slate-100' : 'bg-slate-100 group-hover:bg-emerald-100'
              }`}>
                <Upload className={`w-8 h-8 ${isLimitReached ? 'text-slate-300' : 'text-slate-400 group-hover:text-emerald-600'}`} />
              </div>
              <p className={`font-medium ${isLimitReached ? 'text-slate-400' : 'text-slate-700'}`}>
                {isLimitReached ? 'Sign up to upload more files' : 'Drop your audio file here or click to browse'}
              </p>
              <p className="text-sm text-slate-500 mt-2">MP3, WAV, M4A, WebM up to 100MB</p>
              <input 
                ref={fileInputRef} 
                type="file" 
                accept="audio/*" 
                onChange={handleFileUpload} 
                disabled={isLimitReached} 
                className="hidden" 
              />
            </div>

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-slate-200"></div>
              <span className="text-sm text-slate-400 font-medium">OR RECORD</span>
              <div className="flex-1 h-px bg-slate-200"></div>
            </div>

            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLimitReached && !isRecording}
              className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                  : isLimitReached 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Mic className="w-5 h-5" />
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>

            {file && (
              <div className="mt-6 flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <FileAudio className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{file.name}</p>
                  <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
            )}

            {error && (
              <div className={`mt-6 flex items-center gap-3 p-4 rounded-xl border ${
                error.startsWith('✓') 
                  ? 'bg-emerald-50 border-emerald-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                {error.startsWith('✓') ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                )}
                <p className={`text-sm ${error.startsWith('✓') ? 'text-emerald-700' : 'text-red-700'}`}>{error}</p>
              </div>
            )}

            {!isLimitReached ? (
              <button
                onClick={transcribeAudio}
                disabled={!file || isProcessing}
                className="mt-6 w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isProcessing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                ) : (
                  <><Zap className="w-5 h-5" /> Transcribe Now ({remainingAttempts} left)</>
                )}
              </button>
            ) : (
              <button
                onClick={() => { setShowAuthModal(true); setAuthMode('signup'); }}
                className="mt-6 w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-3"
              >
                <Lock className="w-5 h-5" /> Sign Up to Continue
              </button>
            )}
          </div>

          {transcription && (
            <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Transcription</h2>
                <button onClick={downloadTranscription} className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium">
                  <Download className="w-5 h-5" /> Download
                </button>
              </div>
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{transcription}</p>
              </div>
              
              <div className="mt-6 p-5 bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-lg">🎉 Great transcription!</p>
                    <p className="text-slate-300 text-sm">
                      {remainingAttempts > 0 
                        ? `You have ${remainingAttempts} free transcription${remainingAttempts !== 1 ? 's' : ''} left. Sign up for unlimited!`
                        : 'Sign up now for unlimited transcriptions and premium features'}
                    </p>
                  </div>
                  <button 
                    onClick={() => { setShowAuthModal(true); setAuthMode('signup'); }} 
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-5 py-2.5 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 whitespace-nowrap"
                  >
                    Sign Up Free
                  </button>
                </div>
              </div>
            </div>
          )}
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
                <button onClick={() => { setCurrentPage('dashboard'); setActiveTab('pricing'); }} className={`text-sm font-medium ${activeTab === 'pricing' ? 'text-emerald-600' : 'text-slate-600 hover:text-slate-900'}`}>Upgrade</button>
              </>
            ) : (
              <button onClick={() => setCurrentPage('pricing')} className="text-sm font-medium text-slate-600 hover:text-slate-900">View Pricing</button>
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
                <button onClick={() => { setCurrentPage('home'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-slate-600">Home</button>
                <button onClick={() => { setCurrentPage('features'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-slate-600">Features</button>
                <button onClick={() => { setCurrentPage('pricing'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-slate-600">Pricing</button>
                <button onClick={() => { setShowAuthModal(true); setMobileMenuOpen(false); }} className="w-full bg-slate-900 text-white py-3 rounded-xl font-medium">Get Started</button>
              </>
            ) : isLoggedIn ? (
              <>
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">{username.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{username}</p>
                    <p className="text-sm text-slate-500">{usageMinutes}/{TIER_LIMITS[userTier]} min used</p>
                  </div>
                </div>
                <button onClick={() => { setActiveTab('transcribe'); setCurrentPage('dashboard'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-slate-600">Transcribe</button>
                <button onClick={() => { setActiveTab('history'); setCurrentPage('dashboard'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-slate-600">History</button>
                <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="w-full text-red-600 py-3 border border-red-200 rounded-xl font-medium">Sign Out</button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Guest User</p>
                    <p className="text-sm text-slate-500">{getRemainingGuestAttempts()}/{FREE_GUEST_LIMIT} free transcriptions</p>
                  </div>
                </div>
                <button onClick={() => { setShowAuthModal(true); setAuthMode('signup'); setMobileMenuOpen(false); }} className="w-full bg-slate-900 text-white py-3 rounded-xl font-medium">Sign Up</button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // HOME PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  const HomePage = () => (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-16">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-transparent"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 rounded-full text-emerald-700 text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              Powered by Advanced AI
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-slate-900 leading-tight tracking-tight">
              Transform audio into
              <span className="block bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">perfect text</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Professional-grade transcription in seconds. Upload any audio file and get accurate, formatted text instantly.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => { setShowAuthModal(true); setAuthMode('signup'); }} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-full font-semibold hover:bg-slate-800 shadow-xl shadow-slate-900/20">
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </button>
              <button onClick={handleContinueAsGuest} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-slate-700 px-8 py-4 rounded-full font-semibold border border-slate-200 hover:border-slate-300 hover:bg-slate-50">
                <Play className="w-5 h-5" />
                Try Free ({getRemainingGuestAttempts()} transcriptions)
              </button>
            </div>
            <p className="mt-6 text-sm text-slate-500">No credit card required • {FREE_GUEST_LIMIT} free transcriptions</p>
          </div>
        </div>
      </section>

      <section className="py-12 border-y border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            <div className="flex items-center gap-2 text-slate-400"><Shield className="w-5 h-5" /><span className="text-sm font-medium">SOC 2 Compliant</span></div>
            <div className="flex items-center gap-2 text-slate-400"><Lock className="w-5 h-5" /><span className="text-sm font-medium">256-bit Encryption</span></div>
            <div className="flex items-center gap-2 text-slate-400"><Globe className="w-5 h-5" /><span className="text-sm font-medium">99.9% Uptime</span></div>
            <div className="flex items-center gap-1 text-amber-500">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
              <span className="text-sm font-medium text-slate-600 ml-1">4.9/5 Rating</span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Everything you need for perfect transcriptions</h2>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">Professional features that make audio-to-text conversion effortless</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: 'Lightning Fast', description: 'Get transcriptions in seconds, not hours.', color: 'amber' },
              { icon: Shield, title: 'Enterprise Security', description: 'Your files are encrypted end-to-end.', color: 'emerald' },
              { icon: Globe, title: '99+ Languages', description: 'Support for over 99 languages and dialects.', color: 'blue' },
              { icon: Headphones, title: 'Speaker Detection', description: 'Automatically identify different speakers.', color: 'purple' },
              { icon: Clock, title: 'Timestamps', description: 'Get precise word-level timestamps.', color: 'rose' },
              { icon: FileAudio, title: 'All Formats', description: 'Support for MP3, WAV, M4A, and more.', color: 'teal' }
            ].map((feature, idx) => (
              <div key={idx} className="group p-8 bg-slate-50 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-${feature.color}-100`}>
                  <feature.icon className={`w-6 h-6 text-${feature.color}-600`} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to transform your workflow?</h2>
          <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto">Join thousands of professionals who save hours every week.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => { setShowAuthModal(true); setAuthMode('signup'); }} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-4 rounded-full font-semibold hover:from-emerald-600 hover:to-teal-600 shadow-xl shadow-emerald-500/30">
              Get Started Free<ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={handleContinueAsGuest} className="inline-flex items-center gap-2 bg-white/10 text-white px-8 py-4 rounded-full font-semibold hover:bg-white/20">
              Try Without Account
            </button>
          </div>
        </div>
      </section>

      <footer className="py-12 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3"><VoxifyLogoSmall size={32} /><span className="font-bold text-slate-900">Voxify</span></div>
            <p className="text-sm text-slate-500">© 2024 Voxify. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // OTHER PAGES (SIMPLIFIED)
  // ═══════════════════════════════════════════════════════════════════════════
  const FeaturesPage = () => (
    <div className="min-h-screen bg-white pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Powerful Features</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">Everything you need to transcribe audio like a pro</p>
        </div>
        <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">10x Faster Than Real-Time</h2>
            <p className="text-slate-600 text-lg leading-relaxed mb-6">Our advanced AI processes your audio at incredible speeds.</p>
            <ul className="space-y-3">
              {['Parallel processing', 'GPU-accelerated inference', 'Optimized for long-form content'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-700"><CheckCircle className="w-5 h-5 text-emerald-500" />{item}</li>
              ))}
            </ul>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-8 h-80 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">10x</div>
              <p className="text-slate-600 mt-2">Faster processing</p>
            </div>
          </div>
        </div>
        <div className="text-center">
          <button onClick={handleContinueAsGuest} className="inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-full font-semibold hover:bg-slate-800">
            Try It Free<ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  const PricingPage = () => (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Simple, transparent pricing</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">Choose the plan that fits your needs.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {[
            { tier: 'free', name: 'Free', price: '$0', minutes: 15, features: ['15 min/month', 'Standard quality', 'Email support'], description: 'Perfect for trying out' },
            { tier: 'starter', name: 'Starter', price: '$9', minutes: 300, features: ['300 min/month', 'High quality', 'Priority support', 'API access'], popular: true, description: 'Best for individuals' },
            { tier: 'pro', name: 'Pro', price: '$29', minutes: 1000, features: ['1,000 min/month', 'Ultra quality', '24/7 support', 'Speaker detection'], description: 'Best for teams' },
            { tier: 'enterprise', name: 'Enterprise', price: '$99', minutes: 10000, features: ['10,000 min/month', 'Ultra quality', 'Dedicated support', 'Custom models'], description: 'Best for organizations' }
          ].map((plan) => (
            <div key={plan.tier} className={`relative p-6 rounded-2xl border-2 transition-all ${plan.popular ? 'border-emerald-500 bg-white shadow-xl scale-105' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg'}`}>
              {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">MOST POPULAR</span></div>}
              <div className="mb-6"><h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3><p className="text-sm text-slate-500">{plan.description}</p></div>
              <div className="mb-6"><span className="text-4xl font-bold text-slate-900">{plan.price}</span><span className="text-slate-500">/month</span></div>
              <ul className="space-y-3 mb-8">{plan.features.map((feature, idx) => (<li key={idx} className="flex items-start gap-2"><CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" /><span className="text-sm text-slate-700">{feature}</span></li>))}</ul>
              <button onClick={() => { if (!isLoggedIn) { setShowAuthModal(true); setAuthMode('signup'); } else { upgradeTier(plan.tier); }}} className={`w-full py-3 rounded-xl font-semibold transition-all ${plan.popular ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/30' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>Get Started</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const AboutPage = () => (
    <div className="min-h-screen bg-white pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">About Voxify</h1>
          <p className="text-lg text-slate-600 leading-relaxed">We're on a mission to make audio transcription accessible, accurate, and affordable for everyone.</p>
        </div>
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
          {[{ value: '50K+', label: 'Active Users' }, { value: '10M+', label: 'Minutes Transcribed' }, { value: '99%', label: 'Accuracy Rate' }, { value: '99+', label: 'Languages' }].map((stat, idx) => (
            <div key={idx} className="text-center p-6 bg-slate-50 rounded-2xl">
              <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{stat.value}</div>
              <div className="text-slate-600 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const ContactPage = () => (
    <div className="min-h-screen bg-white pt-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Get in Touch</h1>
          <p className="text-lg text-slate-600">Have questions? We'd love to hear from you.</p>
        </div>
        {contactSubmitted ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Message Sent!</h3>
            <p className="text-slate-600">We'll get back to you within 24 hours.</p>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setContactSubmitted(true); setTimeout(() => { setContactSubmitted(false); setContactForm({ name: '', email: '', subject: '', message: '' }); }, 3000); }} className="space-y-6 bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
            <div className="grid sm:grid-cols-2 gap-6">
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Your Name</label><input type="text" value={contactForm.name} onChange={(e) => setContactForm({...contactForm, name: e.target.value})} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500" placeholder="John Smith" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label><input type="email" value={contactForm.email} onChange={(e) => setContactForm({...contactForm, email: e.target.value})} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500" placeholder="john@company.com" /></div>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Message</label><textarea value={contactForm.message} onChange={(e) => setContactForm({...contactForm, message: e.target.value})} required rows={5} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 resize-none" placeholder="Tell us how we can help..." /></div>
            <button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600">Send Message</button>
          </form>
        )}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════
  const Dashboard = () => (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {username}</h1>
          <p className="text-slate-600">{userTier.charAt(0).toUpperCase() + userTier.slice(1)} Plan • {usageMinutes}/{TIER_LIMITS[userTier]} minutes used</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Monthly Usage</h3>
            <span className="text-sm text-slate-500">{Math.round((usageMinutes / TIER_LIMITS[userTier]) * 100)}%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500" style={{ width: `${Math.min((usageMinutes / TIER_LIMITS[userTier]) * 100, 100)}%` }}></div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-slate-500">
            <span>{usageMinutes} min used</span>
            <span>{TIER_LIMITS[userTier] - usageMinutes} min remaining</span>
          </div>
        </div>

        <div className="flex gap-2 p-1 bg-white rounded-xl shadow-sm border border-slate-200 inline-flex mb-8">
          {[{ id: 'transcribe', label: 'Transcribe', icon: Mic }, { id: 'history', label: 'History', icon: Clock }, { id: 'pricing', label: 'Upgrade', icon: CreditCard }].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {activeTab === 'transcribe' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-6">Upload Audio</h2>
                  <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 group">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-emerald-100">
                      <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-600" />
                    </div>
                    <p className="text-slate-700 font-medium">Drop your audio file here or click to browse</p>
                    <p className="text-sm text-slate-500 mt-2">MP3, WAV, M4A, WebM up to 100MB</p>
                    <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                  </div>
                  <div className="flex items-center gap-4 my-6"><div className="flex-1 h-px bg-slate-200"></div><span className="text-sm text-slate-400 font-medium">OR RECORD</span><div className="flex-1 h-px bg-slate-200"></div></div>
                  <button onClick={isRecording ? stopRecording : startRecording} className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 ${isRecording ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                    <Mic className="w-5 h-5" />{isRecording ? 'Stop Recording' : 'Start Recording'}
                  </button>
                  {file && (<div className="mt-6 flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl"><div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center"><FileAudio className="w-6 h-6 text-emerald-600" /></div><div className="flex-1 min-w-0"><p className="font-medium text-slate-900 truncate">{file.name}</p><p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p></div><CheckCircle className="w-6 h-6 text-emerald-500" /></div>)}
                  {error && (<div className="mt-6 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl"><AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" /><p className="text-sm text-red-700">{error}</p></div>)}
                  <button onClick={transcribeAudio} disabled={!file || isProcessing} className="mt-6 w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3">
                    {isProcessing ? (<><Loader2 className="w-5 h-5 animate-spin" />Processing...</>) : (<><Zap className="w-5 h-5" />Transcribe Now</>)}
                  </button>
                </div>
                {transcription && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-slate-900">Transcription</h2>
                      <button onClick={downloadTranscription} className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium"><Download className="w-5 h-5" />Download</button>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200"><p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{transcription}</p></div>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'history' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-6">Transcription History</h2>
                {transcriptionHistory.length > 0 ? (
                  <div className="space-y-4">{transcriptionHistory.map((item) => (
                    <div key={item.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-emerald-300 cursor-pointer" onClick={() => { setTranscription(item.transcription); setActiveTab('transcribe'); }}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3"><div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center"><FileAudio className="w-5 h-5 text-slate-600" /></div><div><p className="font-medium text-slate-900">{item.fileName}</p><p className="text-xs text-slate-500">{new Date(item.date).toLocaleDateString()} • {item.duration} min</p></div></div>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2 mt-3">{item.transcription}</p>
                    </div>
                  ))}</div>
                ) : (
                  <div className="text-center py-16"><FileAudio className="w-16 h-16 text-slate-300 mx-auto mb-4" /><h3 className="text-lg font-medium text-slate-900 mb-2">No transcriptions yet</h3><p className="text-slate-500 mb-6">Upload your first audio file</p><button onClick={() => setActiveTab('transcribe')} className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-medium"><Upload className="w-4 h-4" />Upload Audio</button></div>
                )}
              </div>
            )}
            {activeTab === 'pricing' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-6">Upgrade Your Plan</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {[{ tier: 'free', name: 'Free', price: '$0', minutes: 15, features: ['15 min/month', 'Standard quality'] }, { tier: 'starter', name: 'Starter', price: '$9', minutes: 300, features: ['300 min/month', 'High quality', 'API access'], popular: true }, { tier: 'pro', name: 'Pro', price: '$29', minutes: 1000, features: ['1,000 min/month', 'Ultra quality', '24/7 support'] }, { tier: 'enterprise', name: 'Enterprise', price: '$99', minutes: 10000, features: ['10,000 min/month', 'Dedicated support'] }].map((plan) => (
                    <div key={plan.tier} className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all ${userTier === plan.tier ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'}`} onClick={() => upgradeTier(plan.tier)}>
                      {plan.popular && <span className="absolute -top-2.5 left-4 bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded">POPULAR</span>}
                      {userTier === plan.tier && <span className="absolute -top-2.5 right-4 bg-slate-900 text-white text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle className="w-3 h-3" />CURRENT</span>}
                      <div className="flex justify-between items-start mb-3"><div><h3 className="font-semibold text-slate-900">{plan.name}</h3><p className="text-xs text-slate-500">{plan.minutes} min/month</p></div><span className="text-2xl font-bold text-slate-900">{plan.price}</span></div>
                      <ul className="space-y-2">{plan.features.map((feature, idx) => (<li key={idx} className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle className="w-4 h-4 text-emerald-500" />{feature}</li>))}</ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"><span className="text-slate-600">Total Transcriptions</span><span className="font-semibold text-slate-900">{transcriptionCount}</span></div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"><span className="text-slate-600">Minutes Used</span><span className="font-semibold text-slate-900">{usageMinutes}</span></div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"><span className="text-slate-600">Current Plan</span><span className="font-semibold text-emerald-600 capitalize">{userTier}</span></div>
              </div>
            </div>
            {userTier === 'free' && (
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
                <h3 className="font-semibold text-lg mb-2">Upgrade to Pro</h3>
                <p className="text-emerald-100 text-sm mb-4">Get 1,000 minutes/month and premium features.</p>
                <button onClick={() => setActiveTab('pricing')} className="w-full bg-white text-emerald-600 py-2.5 rounded-xl font-semibold hover:bg-emerald-50">View Plans</button>
              </div>
            )}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center"><HelpCircle className="w-5 h-5 text-slate-600" /></div><div><h3 className="font-semibold text-slate-900">Need Help?</h3><p className="text-xs text-slate-500">We're here to assist</p></div></div>
              <button className="w-full py-2.5 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50">View Documentation</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="font-sans antialiased">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
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
