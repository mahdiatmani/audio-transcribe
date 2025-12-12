import React, { useState, useRef, useEffect } from 'react';
import { Upload, Mic, FileAudio, Download, Loader2, CheckCircle, AlertCircle, Zap, LogOut, User, Lock, Mail, Shield, Clock, Globe, Headphones, Play, Star, ChevronRight, ChevronDown, Menu, X, CreditCard, HelpCircle, ArrowRight, Sparkles, ExternalLink, Languages } from 'lucide-react';

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
      return null;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (err) {
      return false;
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (err) {
      return false;
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const FREE_GUEST_LIMIT = 3;
const TIER_LIMITS = { free: 15, starter: 300, pro: 1000, enterprise: 10000 };
const TIER_PRICES = { free: 0, starter: 9, pro: 29, enterprise: 99 };

// Supported languages
const LANGUAGES = {
  "auto": "Auto-detect",
  "en": "English",
  "es": "Spanish",
  "fr": "French",
  "de": "German",
  "it": "Italian",
  "pt": "Portuguese",
  "nl": "Dutch",
  "pl": "Polish",
  "ru": "Russian",
  "zh": "Chinese",
  "ja": "Japanese",
  "ko": "Korean",
  "ar": "Arabic",
  "hi": "Hindi",
  "tr": "Turkish",
  "vi": "Vietnamese",
  "th": "Thai",
  "id": "Indonesian",
  "uk": "Ukrainian",
  "cs": "Czech",
  "ro": "Romanian",
  "hu": "Hungarian",
  "el": "Greek",
  "he": "Hebrew",
  "sv": "Swedish",
  "da": "Danish",
  "fi": "Finnish",
  "no": "Norwegian",
};

// Custom Voxify Logo Component
const VoxifyLogo = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#0d9488" />
      </linearGradient>
    </defs>
    <rect width="48" height="48" rx="12" fill="url(#logoGradient)" />
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
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <defs>
      <linearGradient id="logoGradientSmall" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#0d9488" />
      </linearGradient>
    </defs>
    <rect width="48" height="48" rx="10" fill="url(#logoGradientSmall)" />
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
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [transcriptionCount, setTranscriptionCount] = useState(0);
  const [usageMinutes, setUsageMinutes] = useState(0);
  const [userTier, setUserTier] = useState('free');
  const [userEmail, setUserEmail] = useState('');
  const [transcriptionHistory, setTranscriptionHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('transcribe');
  
  // Language selection
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  
  // Guest state
  const [guestTranscriptionCount, setGuestTranscriptionCount] = useState(0);
  const [isGuestMode, setIsGuestMode] = useState(false);
  
  // UI State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const languageDropdownRef = useRef(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  const getRemainingGuestAttempts = () => Math.max(0, FREE_GUEST_LIMIT - guestTranscriptionCount);
  const canGuestTranscribe = () => guestTranscriptionCount < FREE_GUEST_LIMIT;

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION & EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    // Check for payment success/cancel in URL
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const tier = urlParams.get('tier');
    
    if (paymentStatus === 'success' && tier) {
      setSuccessMessage(`🎉 Successfully upgraded to ${tier.charAt(0).toUpperCase() + tier.slice(1)}! Your new limits are now active.`);
      setUserTier(tier);
      setUsageMinutes(0);
      window.history.replaceState({}, '', window.location.pathname);
      setCurrentPage('dashboard');
    } else if (paymentStatus === 'cancelled') {
      setError('Payment was cancelled. You can try again anytime.');
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    // Load stored auth
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
        storage.remove('voxify_auth');
      }
    }
    
    // Load guest count
    const storedGuestCount = storage.get('voxify_guest_count');
    if (storedGuestCount) {
      const count = parseInt(storedGuestCount.value, 10);
      setGuestTranscriptionCount(isNaN(count) ? 0 : count);
    } else {
      storage.set('voxify_guest_count', '0');
    }
  }, []);

  // Close language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target)) {
        setShowLanguageDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Save auth state
  useEffect(() => {
    if (isLoggedIn && userEmail) {
      storage.set('voxify_auth', JSON.stringify({
        token: authToken, email: userEmail, username, tier: userTier,
        usageMinutes, transcriptionCount
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
    if (!email || !password || (authMode === 'signup' && !username)) {
      setAuthError('Please fill in all fields');
      return;
    }

    setIsAuthLoading(true);
    try {
      const endpoint = authMode === 'login' ? 'login' : 'signup';
      const payload = authMode === 'signup' ? { username, email, password } : { email, password };

      const response = await fetch(`${API_BASE_URL}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
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
      setAuthError('Connection error. Please try again.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleContinueAsGuest = () => {
    if (!canGuestTranscribe()) {
      setAuthMode('signup');
      setAuthError(`You've used all ${FREE_GUEST_LIMIT} free attempts. Please sign up.`);
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
    setUserTier('free');
    setUsageMinutes(0);
    setTranscriptionCount(0);
    setTranscriptionHistory([]);
    setTranscription('');
    setFile(null);
    setCurrentPage('home');
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FILE HANDLING
  // ═══════════════════════════════════════════════════════════════════════════
  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile && uploadedFile.type.startsWith('audio/')) {
      setFile(uploadedFile);
      setError('');
      setTranscription('');
    } else {
      setError('Please upload a valid audio file');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setFile(new File([blob], 'recording.webm', { type: 'audio/webm' }));
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setError('');
      setTranscription('');
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

    // Check guest limits
    if (!isLoggedIn) {
      const currentCount = parseInt(storage.get('voxify_guest_count')?.value || '0', 10);
      if (currentCount >= FREE_GUEST_LIMIT) {
        setError('Free limit reached. Please sign up to continue.');
        setShowAuthModal(true);
        setAuthMode('signup');
        return;
      }
    }

    // Check user limits
    if (isLoggedIn && usageMinutes >= TIER_LIMITS[userTier]) {
      setError(`Usage limit reached. Please upgrade your plan.`);
      return;
    }

    setIsProcessing(true);
    setError('');
    setTranscription('');
    setDetectedLanguage('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', selectedLanguage);

      const headers = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTranscription(data.transcription);
        setDetectedLanguage(data.language || selectedLanguage);
        
        if (isLoggedIn) {
          setTranscriptionCount(prev => prev + 1);
          setUsageMinutes(data.usage?.used || usageMinutes + 2);
          
          const newHistoryItem = {
            id: Date.now(),
            fileName: data.filename,
            transcription: data.transcription,
            date: new Date().toISOString(),
            duration: data.duration,
            language: data.language
          };
          setTranscriptionHistory(prev => [newHistoryItem, ...prev].slice(0, 10));
        } else {
          const newCount = guestTranscriptionCount + 1;
          setGuestTranscriptionCount(newCount);
          
          if (newCount >= FREE_GUEST_LIMIT) {
            setTimeout(() => {
              setShowAuthModal(true);
              setAuthMode('signup');
              setAuthError('You have used all your free transcriptions. Sign up for unlimited access!');
            }, 2000);
          }
        }
      } else {
        setError(data.detail || 'Transcription failed');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTranscription = () => {
    const blob = new Blob([transcription], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcription.txt';
    a.click();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // STRIPE PAYMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  const handleUpgrade = async (tier) => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      setAuthMode('signup');
      return;
    }

    if (tier === 'free' || tier === userTier) return;

    setIsUpgrading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ tier })
      });

      const data = await response.json();

      if (response.ok && data.checkout_url) {
        // Redirect to Stripe Checkout
        window.location.href = data.checkout_url;
      } else {
        setError(data.detail || 'Failed to create checkout session. Please try again.');
      }
    } catch (err) {
      setError('Payment service unavailable. Please try again later.');
    } finally {
      setIsUpgrading(false);
    }
  };

  const openBillingPortal = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/billing-portal`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      const data = await response.json();
      if (data.portal_url) {
        window.open(data.portal_url, '_blank');
      } else {
        setError('Could not open billing portal');
      }
    } catch (err) {
      setError('Could not open billing portal');
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // LANGUAGE SELECTOR COMPONENT
  // ═══════════════════════════════════════════════════════════════════════════
  const LanguageSelector = () => (
    <div className="relative" ref={languageDropdownRef}>
      <button
        onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
        className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-medium transition-all"
      >
        <Languages className="w-4 h-4" />
        <span>{LANGUAGES[selectedLanguage]}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} />
      </button>
      
      {showLanguageDropdown && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 max-h-80 overflow-y-auto">
          {Object.entries(LANGUAGES).map(([code, name]) => (
            <button
              key={code}
              onClick={() => {
                setSelectedLanguage(code);
                setShowLanguageDropdown(false);
              }}
              className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between ${
                selectedLanguage === code ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700'
              }`}
            >
              <span>{name}</span>
              {selectedLanguage === code && <CheckCircle className="w-4 h-4 text-emerald-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );

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
          <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden">
            <button onClick={() => { setShowAuthModal(false); setAuthError(''); }} className="absolute top-4 right-4 z-10 p-2 hover:bg-slate-100 rounded-full">
              <X className="w-5 h-5 text-slate-500" />
            </button>
            
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-8 py-10 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                {authMode === 'login' ? 'Welcome Back' : 'Get Started Free'}
              </h2>
            </div>

            <div className="px-8 py-8">
              <form onSubmit={(e) => { e.preventDefault(); handleAuth(); }} className="space-y-4">
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} disabled={isAuthLoading}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      placeholder="John Smith" />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isAuthLoading}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    placeholder="you@example.com" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isAuthLoading}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    placeholder="••••••••" />
                </div>

                {authError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <p className="text-sm text-red-700">{authError}</p>
                  </div>
                )}

                <button type="submit" disabled={isAuthLoading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 disabled:opacity-70 flex items-center justify-center gap-2">
                  {isAuthLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : authMode === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }}
                className="mt-4 w-full text-slate-600 hover:text-emerald-600 font-medium text-center">
                {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>

              {canContinueAsGuest && (
                <button onClick={handleContinueAsGuest}
                  className="mt-4 w-full py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium">
                  Continue as guest ({remainingAttempts} free left)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSCRIBE SECTION (with Language Selector)
  // ═══════════════════════════════════════════════════════════════════════════
  const TranscribeSection = ({ isGuest = false }) => {
    const remaining = isGuest ? getRemainingGuestAttempts() : TIER_LIMITS[userTier] - usageMinutes;
    const isLimitReached = remaining <= 0;
    
    return (
      <div className="space-y-6">
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <p className="text-emerald-700 flex-1">{successMessage}</p>
            <button onClick={() => setSuccessMessage('')}><X className="w-4 h-4 text-emerald-500" /></button>
          </div>
        )}
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Upload Audio</h2>
            <LanguageSelector />
          </div>
          
          <div
            onClick={() => !isLimitReached && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
              isLimitReached ? 'bg-slate-50 border-slate-200' : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 group'
            }`}
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isLimitReached ? 'bg-slate-100' : 'bg-slate-100 group-hover:bg-emerald-100'
            }`}>
              <Upload className={`w-8 h-8 ${isLimitReached ? 'text-slate-300' : 'text-slate-400 group-hover:text-emerald-600'}`} />
            </div>
            <p className={`font-medium ${isLimitReached ? 'text-slate-400' : 'text-slate-700'}`}>
              {isLimitReached ? 'Upgrade to upload more files' : 'Drop your audio file here or click to browse'}
            </p>
            <p className="text-sm text-slate-500 mt-2">MP3, WAV, M4A, WebM up to 100MB</p>
            <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileUpload} disabled={isLimitReached} className="hidden" />
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
              isRecording ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
              : isLimitReached ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
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
              error.startsWith('✓') ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
            }`}>
              {error.startsWith('✓') ? (
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              <p className={`text-sm ${error.startsWith('✓') ? 'text-emerald-700' : 'text-red-700'}`}>{error}</p>
            </div>
          )}

          <button
            onClick={transcribeAudio}
            disabled={!file || isProcessing || isLimitReached}
            className="mt-6 w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {isProcessing ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Transcribing...</>
            ) : (
              <><Zap className="w-5 h-5" /> Transcribe Now</>
            )}
          </button>
        </div>

        {transcription && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Transcription</h2>
                {detectedLanguage && (
                  <p className="text-sm text-slate-500">
                    Language: {LANGUAGES[detectedLanguage] || detectedLanguage}
                  </p>
                )}
              </div>
              <button onClick={downloadTranscription} className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium">
                <Download className="w-5 h-5" /> Download
              </button>
            </div>
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{transcription}</p>
            </div>
            
            {isGuest && (
              <div className="mt-6 p-5 bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-lg">🎉 Great transcription!</p>
                    <p className="text-slate-300 text-sm">
                      {getRemainingGuestAttempts() > 0 
                        ? `You have ${getRemainingGuestAttempts()} free transcription${getRemainingGuestAttempts() !== 1 ? 's' : ''} left`
                        : 'Sign up now for unlimited transcriptions'}
                    </p>
                  </div>
                  <button onClick={() => { setShowAuthModal(true); setAuthMode('signup'); }} 
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-5 py-2.5 rounded-lg font-semibold">
                    Sign Up Free
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // BILLING SECTION
  // ═══════════════════════════════════════════════════════════════════════════
  const BillingSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">Current Plan</h2>
        
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div>
            <p className="font-semibold text-slate-900 capitalize">{userTier} Plan</p>
            <p className="text-sm text-slate-600">{TIER_LIMITS[userTier]} minutes/month</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">${TIER_PRICES[userTier]}</p>
            <p className="text-sm text-slate-500">/month</p>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex justify-between mb-2">
            <span className="text-slate-600">Usage this month</span>
            <span className="font-medium">{usageMinutes} / {TIER_LIMITS[userTier]} min</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
              style={{ width: `${Math.min((usageMinutes / TIER_LIMITS[userTier]) * 100, 100)}%` }} />
          </div>
        </div>

        {userTier !== 'free' && (
          <button onClick={openBillingPortal}
            className="mt-6 w-full py-3 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 flex items-center justify-center gap-2">
            <ExternalLink className="w-4 h-4" /> Manage Subscription
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">Upgrade Plan</h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { tier: 'starter', name: 'Starter', price: 9, minutes: 300, features: ['300 min/month', 'Priority support', 'API access'] },
            { tier: 'pro', name: 'Pro', price: 29, minutes: 1000, features: ['1,000 min/month', '24/7 support', 'Speaker detection'], popular: true },
            { tier: 'enterprise', name: 'Enterprise', price: 99, minutes: 10000, features: ['10,000 min/month', 'Dedicated support', 'Custom solutions'] }
          ].map((plan) => (
            <div key={plan.tier} className={`relative p-5 rounded-xl border-2 transition-all ${
              userTier === plan.tier ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'
            }`}>
              {plan.popular && <span className="absolute -top-3 left-4 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded">POPULAR</span>}
              {userTier === plan.tier && <span className="absolute -top-3 right-4 bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded">CURRENT</span>}
              
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{plan.name}</h3>
                  <p className="text-xs text-slate-500">{plan.minutes} min/month</p>
                </div>
                <span className="text-2xl font-bold">${plan.price}</span>
              </div>
              
              <ul className="space-y-2 mb-4">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />{f}
                  </li>
                ))}
              </ul>
              
              <button 
                onClick={() => handleUpgrade(plan.tier)} 
                disabled={userTier === plan.tier || isUpgrading}
                className={`w-full py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  userTier === plan.tier 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                    : 'bg-emerald-500 text-white hover:bg-emerald-600'
                }`}
              >
                {isUpgrading ? <Loader2 className="w-4 h-4 animate-spin" /> : userTier === plan.tier ? 'Current Plan' : 'Upgrade Now'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════════
  const Navigation = () => (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200">
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
                <button onClick={() => setCurrentPage('home')} className="text-sm font-medium text-slate-600 hover:text-emerald-600">Home</button>
                <button onClick={() => setCurrentPage('pricing')} className="text-sm font-medium text-slate-600 hover:text-emerald-600">Pricing</button>
              </>
            ) : isLoggedIn && (
              <>
                <button onClick={() => { setCurrentPage('dashboard'); setActiveTab('transcribe'); }} className={`text-sm font-medium ${activeTab === 'transcribe' ? 'text-emerald-600' : 'text-slate-600 hover:text-emerald-600'}`}>Transcribe</button>
                <button onClick={() => { setCurrentPage('dashboard'); setActiveTab('history'); }} className={`text-sm font-medium ${activeTab === 'history' ? 'text-emerald-600' : 'text-slate-600 hover:text-emerald-600'}`}>History</button>
                <button onClick={() => { setCurrentPage('dashboard'); setActiveTab('billing'); }} className={`text-sm font-medium ${activeTab === 'billing' ? 'text-emerald-600' : 'text-slate-600 hover:text-emerald-600'}`}>Billing</button>
              </>
            )}
          </div>

          <div className="hidden md:flex items-center gap-4">
            {isLoggedIn ? (
              <div className="flex items-center gap-4">
                <div className="px-3 py-1.5 bg-emerald-100 rounded-full">
                  <span className="text-sm font-medium text-emerald-700">{usageMinutes}/{TIER_LIMITS[userTier]} min</span>
                </div>
                <span className="text-sm font-medium text-slate-700">{username}</span>
                <button onClick={handleLogout} className="text-slate-500 hover:text-red-600"><LogOut className="w-5 h-5" /></button>
              </div>
            ) : isGuestMode ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-amber-700 font-medium bg-amber-100 px-3 py-1.5 rounded-full">Guest ({getRemainingGuestAttempts()}/{FREE_GUEST_LIMIT} free)</span>
                <button onClick={() => { setShowAuthModal(true); setAuthMode('signup'); }} className="bg-slate-900 text-white px-5 py-2 rounded-full font-medium">Sign Up</button>
              </div>
            ) : (
              <>
                <button onClick={() => { setShowAuthModal(true); setAuthMode('login'); }} className="text-sm font-medium text-slate-600">Sign In</button>
                <button onClick={() => { setShowAuthModal(true); setAuthMode('signup'); }} className="bg-slate-900 text-white px-5 py-2 rounded-full font-medium">Get Started</button>
              </>
            )}
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 p-4 space-y-4">
          {!isLoggedIn && !isGuestMode ? (
            <>
              <button onClick={() => { setCurrentPage('home'); setMobileMenuOpen(false); }} className="block w-full text-left py-2">Home</button>
              <button onClick={() => { setCurrentPage('pricing'); setMobileMenuOpen(false); }} className="block w-full text-left py-2">Pricing</button>
              <button onClick={() => { setShowAuthModal(true); setMobileMenuOpen(false); }} className="w-full bg-slate-900 text-white py-3 rounded-xl font-medium">Get Started</button>
            </>
          ) : isLoggedIn ? (
            <>
              <button onClick={() => { setActiveTab('transcribe'); setMobileMenuOpen(false); }} className="block w-full text-left py-2">Transcribe</button>
              <button onClick={() => { setActiveTab('history'); setMobileMenuOpen(false); }} className="block w-full text-left py-2">History</button>
              <button onClick={() => { setActiveTab('billing'); setMobileMenuOpen(false); }} className="block w-full text-left py-2">Billing</button>
              <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="w-full text-red-600 py-3 border border-red-200 rounded-xl">Sign Out</button>
            </>
          ) : (
            <button onClick={() => { setShowAuthModal(true); setAuthMode('signup'); setMobileMenuOpen(false); }} className="w-full bg-slate-900 text-white py-3 rounded-xl font-medium">Sign Up</button>
          )}
        </div>
      )}
    </nav>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // GUEST TRANSCRIBE PAGE
  // ═══════════════════════════════════════════════════════════════════════════
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
            <button onClick={() => { setShowAuthModal(true); setAuthMode('signup'); }}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-2.5 rounded-full font-semibold">
              Sign Up for Unlimited
            </button>
          </div>

          {/* Usage Banner */}
          <div className={`mb-6 p-5 rounded-2xl border-2 ${
            isLimitReached ? 'bg-red-50 border-red-300' : remainingAttempts === 1 ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300'
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
                  <p className={`text-lg font-bold ${isLimitReached ? 'text-red-800' : remainingAttempts === 1 ? 'text-amber-800' : 'text-emerald-800'}`}>
                    {isLimitReached ? '🔒 Free Trial Ended' : `${remainingAttempts} Free Transcription${remainingAttempts !== 1 ? 's' : ''} Left`}
                  </p>
                  <p className={`text-sm ${isLimitReached ? 'text-red-600' : remainingAttempts === 1 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {isLimitReached ? 'Sign up now to continue' : 'Sign up anytime for unlimited transcriptions'}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                {[...Array(FREE_GUEST_LIMIT)].map((_, i) => (
                  <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    i < usedAttempts ? 'bg-slate-300 text-slate-500' : 'bg-emerald-500 text-white'
                  }`}>
                    {i < usedAttempts ? '✓' : i + 1}
                  </div>
                ))}
              </div>
            </div>
            
            {isLimitReached && (
              <button onClick={() => { setShowAuthModal(true); setAuthMode('signup'); }}
                className="mt-4 w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" /> Sign Up Free - Get Unlimited Access
              </button>
            )}
          </div>

          <TranscribeSection isGuest={true} />
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════
  const Dashboard = () => (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {username}</h1>
          <p className="text-slate-600 capitalize">{userTier} Plan • {usageMinutes}/{TIER_LIMITS[userTier]} minutes used</p>
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {['transcribe', 'history', 'billing'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all ${
                activeTab === tab ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'transcribe' && <TranscribeSection isGuest={false} />}
        
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Transcription History</h2>
            {transcriptionHistory.length > 0 ? (
              <div className="space-y-4">
                {transcriptionHistory.map((item) => (
                  <div key={item.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-emerald-300 cursor-pointer"
                    onClick={() => { setTranscription(item.transcription); setDetectedLanguage(item.language); setActiveTab('transcribe'); }}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <FileAudio className="w-8 h-8 text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-900">{item.fileName}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(item.date).toLocaleDateString()} • {item.duration} min
                            {item.language && ` • ${LANGUAGES[item.language] || item.language}`}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-600 mt-3 line-clamp-2">{item.transcription}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <FileAudio className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No transcriptions yet</h3>
                <p className="text-slate-500 mb-6">Upload your first audio file to get started</p>
                <button onClick={() => setActiveTab('transcribe')} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-medium">
                  Start Transcribing
                </button>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'billing' && <BillingSection />}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // HOME PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  const HomePage = () => (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-16">
      <section className="relative py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-transparent"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 rounded-full text-emerald-700 text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" /> AI-Powered • 30+ Languages
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6">
            Transform audio into<br />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">perfect text</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10">
            Professional transcription in seconds. Support for 30+ languages with automatic detection.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => { setShowAuthModal(true); setAuthMode('signup'); }}
              className="bg-slate-900 text-white px-8 py-4 rounded-full font-semibold flex items-center justify-center gap-2">
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={handleContinueAsGuest}
              className="bg-white border border-slate-200 text-slate-700 px-8 py-4 rounded-full font-semibold flex items-center justify-center gap-2">
              <Play className="w-5 h-5" /> Try Free ({getRemainingGuestAttempts()} left)
            </button>
          </div>
        </div>
      </section>

      <section className="py-12 border-y border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center gap-8 md:gap-16">
          <div className="flex items-center gap-2 text-slate-500"><Languages className="w-5 h-5" /><span className="text-sm font-medium">30+ Languages</span></div>
          <div className="flex items-center gap-2 text-slate-500"><Shield className="w-5 h-5" /><span className="text-sm font-medium">Secure</span></div>
          <div className="flex items-center gap-2 text-slate-500"><Zap className="w-5 h-5" /><span className="text-sm font-medium">Lightning Fast</span></div>
          <div className="flex items-center gap-1 text-amber-500">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
            <span className="text-sm font-medium text-slate-600 ml-1">4.9/5</span>
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-10">Ready to get started?</h2>
          <button onClick={() => { setShowAuthModal(true); setAuthMode('signup'); }}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-4 rounded-full font-semibold">
            Get Started Free
          </button>
        </div>
      </section>

      <footer className="py-12 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-3"><VoxifyLogoSmall /><span className="font-bold text-slate-900">Voxify</span></div>
          <p className="text-sm text-slate-500">© 2024 Voxify. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PRICING PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  const PricingPage = () => (
    <div className="min-h-screen bg-slate-50 pt-24">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Simple Pricing</h1>
          <p className="text-lg text-slate-600">Choose the plan that fits your needs</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {[
            { tier: 'free', name: 'Free', price: 0, minutes: 15, features: ['15 min/month', 'All languages', 'Basic support'] },
            { tier: 'starter', name: 'Starter', price: 9, minutes: 300, features: ['300 min/month', 'All languages', 'Priority support', 'API access'] },
            { tier: 'pro', name: 'Pro', price: 29, minutes: 1000, features: ['1,000 min/month', 'All languages', '24/7 support', 'Speaker detection'], popular: true },
            { tier: 'enterprise', name: 'Enterprise', price: 99, minutes: 10000, features: ['10,000 min/month', 'All languages', 'Dedicated support', 'Custom solutions'] }
          ].map((plan) => (
            <div key={plan.tier} className={`relative bg-white p-6 rounded-2xl border-2 transition-all ${
              plan.popular ? 'border-emerald-500 shadow-xl scale-105' : 'border-slate-200'
            }`}>
              {plan.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-4 py-1 rounded-full">POPULAR</span>}
              
              <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
              <div className="mt-4 mb-6">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-slate-500">/month</span>
              </div>
              
              <ul className="space-y-3 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />{f}
                  </li>
                ))}
              </ul>
              
              <button onClick={() => { 
                if (plan.tier === 'free') { setShowAuthModal(true); setAuthMode('signup'); } 
                else { handleUpgrade(plan.tier); }
              }}
                disabled={isUpgrading}
                className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  plan.popular ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}>
                {isUpgrading ? <Loader2 className="w-4 h-4 animate-spin" /> : plan.tier === 'free' ? 'Get Started' : 'Subscribe'}
              </button>
            </div>
          ))}
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
        * { font-family: 'Plus Jakarta Sans', sans-serif; }
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
        </>
      )}
    </div>
  );
}
