import React, { useState, useRef, useEffect } from 'react';
import { Upload, Mic, FileAudio, Download, Loader2, CheckCircle, AlertCircle, Zap, LogOut, User, Lock, Clock, History, ChevronRight, ChevronDown, Menu, X, ArrowRight, Sparkles, Languages, Play, Shield, Star } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// API CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const FREE_GUEST_LIMIT = 3;

// Quota Limits
const TIER_LIMITS = { free: 15, starter: 300, pro: 1000, enterprise: 10000 };
const TIER_PRICES = { free: 0, starter: 9, pro: 29, enterprise: 99 };

// FREE TIER & GUEST ALLOWED LANGUAGES
const FREE_LANGS = ['auto', 'en', 'fr', 'ar'];

// ALL LANGUAGES
const LANGUAGES = {
  "auto": "Auto-detect",
  "en": "English",
  "fr": "French",
  "ar": "Arabic",
  // Locked for Free Tier
  "es": "Spanish",
  "de": "German",
  "it": "Italian",
  "pt": "Portuguese",
  "nl": "Dutch",
  "pl": "Polish",
  "ru": "Russian",
  "zh": "Chinese",
  "ja": "Japanese",
  "ko": "Korean",
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

// PayPal Logo
const PayPalLogo = ({ className = "" }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .757-.629h6.608c2.19 0 3.944.658 4.945 1.853.904 1.078 1.245 2.541.957 4.117-.021.115-.047.23-.076.344-.024.093-.05.186-.078.278-.582 2.18-1.927 3.609-3.908 4.148-1.018.276-2.152.405-3.396.405h-.832a.77.77 0 0 0-.757.629l-.67 4.094-.203 1.373a.404.404 0 0 1-.4.351l.085.654z"/>
    <path d="M19.238 8.264c-.024.093-.05.186-.078.278-.87 3.264-3.07 4.914-6.55 4.914h-1.66a.77.77 0 0 0-.757.629l-1.035 6.335a.516.516 0 0 0 .51.596h3.328a.641.641 0 0 0 .633-.54l.026-.137.502-3.074.032-.177a.641.641 0 0 1 .633-.54h.398c2.58 0 4.6-.958 5.191-3.732.247-1.161.12-2.13-.534-2.812-.196-.206-.44-.383-.72-.536.006-.068.041-.135.08-.204z" opacity="0.7"/>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════
// LOCAL STORAGE HELPERS
// ═══════════════════════════════════════════════════════════════════════════
const storage = {
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? { value: item } : null;
    } catch (err) { return null; }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (err) { return false; }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (err) { return false; }
  }
};

export default function AudioTranscriptionSaaS() {
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  
  const [user, setUser] = useState(null);
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
  
  const [guestTranscriptionCount, setGuestTranscriptionCount] = useState(0);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  
  const [paypalClientId, setPaypalClientId] = useState('');
  const [showPayPalModal, setShowPayPalModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  
  // NEW: Settings for Language and Mode
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [transcriptionMode, setTranscriptionMode] = useState('fast'); // 'fast' or 'quality'
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const languageDropdownRef = useRef(null);
  const paypalButtonRef = useRef(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  const getRemainingGuestAttempts = () => Math.max(0, FREE_GUEST_LIMIT - guestTranscriptionCount);
  const canGuestTranscribe = () => guestTranscriptionCount < FREE_GUEST_LIMIT;

  const loadPayPalSDK = async (clientId) => {
    if (window.paypal) { setPaypalLoaded(true); return; }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&vault=true&intent=subscription`;
      script.async = true;
      script.onload = () => { setPaypalLoaded(true); resolve(); };
      script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
      document.body.appendChild(script);
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════════════════
  const fetchUserData = async (token) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserEmail(data.email);
        setUsername(data.username);
        setUserTier(data.tier);
        setUsageMinutes(data.usage_minutes);
        setTranscriptionCount(data.transcription_count);
      } else { handleLogout(); }
    } catch (err) { console.error(err); }
  };

  const fetchHistory = async (token) => {
    if (!token) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/transcriptions/history`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            setTranscriptionHistory(Array.isArray(data) ? data : data.history || []);
        }
    } catch (err) { console.error("Failed to fetch history"); }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const tier = urlParams.get('tier');
    const subscriptionId = urlParams.get('subscription_id');
    
    if (paymentStatus === 'success' && tier) {
      if (subscriptionId && authToken) {
        capturePayPalSubscription(subscriptionId, tier);
      } else {
        setSuccessMessage(`🎉 Upgraded to ${tier}!`);
        setUserTier(tier);
        setUsageMinutes(0);
      }
      window.history.replaceState({}, '', window.location.pathname);
      setCurrentPage('dashboard');
    } else if (paymentStatus === 'cancelled') {
      setError('Payment cancelled.');
      window.history.replaceState({}, '', window.location.pathname);
    }
    
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
          setCurrentPage('dashboard');
          fetchUserData(authData.token);
          fetchHistory(authData.token);
        }
      } catch (err) { storage.remove('voxify_auth'); }
    }
    
    const count = parseInt(storage.get('voxify_guest_count')?.value || '0', 10);
    setGuestTranscriptionCount(isNaN(count) ? 0 : count);
    
    fetchPayPalConfig();
  }, []);

  const fetchPayPalConfig = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/paypal/config`);
      if (response.ok) {
        const data = await response.json();
        setPaypalClientId(data.client_id);
        if (data.client_id) loadPayPalSDK(data.client_id).catch(console.error);
      }
    } catch (err) { console.error('Failed to fetch PayPal config:', err); }
  };

  const capturePayPalSubscription = async (subscriptionId, tier) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/capture-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ subscription_id: subscriptionId, tier })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMessage(`🎉 Upgraded to ${tier}!`);
        setUserTier(tier);
        setUsageMinutes(0);
        fetchUserData(authToken);
      } else { setError(data.detail || 'Failed to activate subscription'); }
    } catch (err) { setError('Failed to activate subscription.'); }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target)) {
        setShowLanguageDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isLoggedIn && userEmail) {
      storage.set('voxify_auth', JSON.stringify({
        token: authToken, email: userEmail, username, tier: userTier,
        usageMinutes, transcriptionCount
      }));
    }
  }, [isLoggedIn, userEmail, username, userTier, usageMinutes, transcriptionCount, authToken]);

  useEffect(() => {
    storage.set('voxify_guest_count', guestTranscriptionCount.toString());
  }, [guestTranscriptionCount]);

  useEffect(() => {
    if (showPayPalModal && selectedPlan && paypalLoaded && window.paypal && paypalButtonRef.current) {
      paypalButtonRef.current.innerHTML = '';
      window.paypal.Buttons({
        style: { shape: 'pill', color: 'gold', layout: 'vertical', label: 'subscribe' },
        createSubscription: async (data, actions) => {
          try {
            const response = await fetch(`${API_BASE_URL}/api/create-subscription`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
              body: JSON.stringify({ tier: selectedPlan.tier })
            });
            const planData = await response.json();
            if (!response.ok) throw new Error(planData.detail || 'Failed to get plan');
            return actions.subscription.create({
              plan_id: planData.plan_id,
              application_context: {
                brand_name: 'Voxify',
                shipping_preference: 'NO_SHIPPING',
                user_action: 'SUBSCRIBE_NOW',
                return_url: `${window.location.origin}?payment=success&tier=${selectedPlan.tier}`,
                cancel_url: `${window.location.origin}?payment=cancelled`
              }
            });
          } catch (err) { setError(err.message); return null; }
        },
        onApprove: async (data, actions) => {
          setShowPayPalModal(false);
          setIsUpgrading(true);
          capturePayPalSubscription(data.subscriptionID, selectedPlan.tier);
          setIsUpgrading(false);
          setSelectedPlan(null);
        },
        onCancel: () => { setShowPayPalModal(false); setSelectedPlan(null); },
        onError: (err) => { setError('Payment failed.'); setShowPayPalModal(false); setSelectedPlan(null); }
      }).render(paypalButtonRef.current);
    }
  }, [showPayPalModal, selectedPlan, paypalLoaded, authToken]);

  const handleAuth = async () => {
    setAuthError('');
    if (!email || !password || (authMode === 'signup' && !username)) {
      setAuthError('Please fill in all fields');
      return;
    }
    setIsAuthLoading(true);
    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/signup';
      const body = authMode === 'login' ? { email, password } : { email, password, username };
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        setIsLoggedIn(true);
        setIsGuestMode(false);
        setAuthToken(data.token);
        setUserEmail(data.user.email);
        setUsername(data.user.username);
        setUserTier(data.user.tier || 'free');
        setUsageMinutes(data.user.usage_minutes || 0);
        setTranscriptionCount(data.user.transcription_count || 0);
        setShowAuthModal(false);
        setEmail(''); setPassword('');
        setCurrentPage('dashboard');
        setError('');
        fetchHistory(data.token);
      } else { setAuthError(data.detail || 'Authentication failed'); }
    } catch (err) { setAuthError('Connection error'); } finally { setIsAuthLoading(false); }
  };

  const handleContinueAsGuest = () => {
    if (!canGuestTranscribe()) {
      setAuthMode('signup');
      setAuthError(`You've used all ${FREE_GUEST_LIMIT} free attempts. Please sign up.`);
      setShowAuthModal(true);
      return;
    }
    setShowAuthModal(false); setAuthError(''); setIsGuestMode(true);
  };

  const handleLogout = () => {
    storage.remove('voxify_auth');
    storage.remove('voxify_history');
    setIsLoggedIn(false); setIsGuestMode(false);
    setAuthToken(''); setUserEmail(''); setUsername('');
    setUserTier('free'); setUsageMinutes(0); setTranscriptionCount(0);
    setTranscriptionHistory([]); setTranscription(''); setFile(null);
    setCurrentPage('home');
  };

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile && uploadedFile.type.startsWith('audio/')) {
      setFile(uploadedFile); setError(''); setTranscription('');
    } else { setError('Please upload a valid audio file'); }
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
      setIsRecording(true); setError(''); setTranscription('');
    } catch (err) { setError('Microphone access denied'); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); setIsRecording(false);
    }
  };

  const transcribeAudio = async () => {
    if (!file) { setError('Please upload or record an audio file first'); return; }
    if (!isLoggedIn) {
      const currentCount = parseInt(storage.get('voxify_guest_count')?.value || '0', 10);
      if (currentCount >= FREE_GUEST_LIMIT) {
        setError('Free limit reached. Please sign up to continue.');
        setShowAuthModal(true); setAuthMode('signup'); return;
      }
    }
    if (isLoggedIn && usageMinutes >= TIER_LIMITS[userTier]) {
      setError(`Usage limit reached. Please upgrade your plan.`); return;
    }

    setIsProcessing(true); setError(''); setTranscription(''); setDetectedLanguage('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', selectedLanguage);
      formData.append('mode', transcriptionMode); // Send the selected mode

      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
        method: 'POST', headers, body: formData,
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setTranscription(data.transcription);
        setDetectedLanguage(data.language || selectedLanguage);
        if (isLoggedIn) {
          setTranscriptionCount(prev => prev + 1);
          if(data.usage && data.usage.used_seconds) {
             setUsageMinutes(Math.ceil(data.usage.used_seconds / 60));
          } else {
             setUsageMinutes(prev => prev + data.duration_minutes);
          }
          fetchHistory(authToken);
        } else {
          const newCount = guestTranscriptionCount + 1;
          setGuestTranscriptionCount(newCount);
          if (newCount >= FREE_GUEST_LIMIT) {
            setTimeout(() => {
              setShowAuthModal(true); setAuthMode('signup');
              setAuthError('You have used all your free transcriptions. Sign up for unlimited access!');
            }, 2000);
          }
        }
      } else { setError(data.detail || 'Transcription failed'); }
    } catch (err) { setError('Connection error. Please try again.'); } finally { setIsProcessing(false); }
  };

  const downloadTranscription = () => {
    const blob = new Blob([transcription], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'transcription.txt'; a.click();
  };

  const handleUpgrade = async (tier) => {
    if (!isLoggedIn) { setShowAuthModal(true); setAuthMode('signup'); return; }
    if (tier === 'free' || tier === userTier) return;
    if (!paypalClientId) { setError('Payment system not available.'); return; }
    const planDetails = {
      starter: { tier: 'starter', name: 'Starter', price: 9, minutes: 300 },
      pro: { tier: 'pro', name: 'Pro', price: 29, minutes: 1000 },
      enterprise: { tier: 'enterprise', name: 'Enterprise', price: 99, minutes: 10000 }
    };
    setSelectedPlan(planDetails[tier]); setShowPayPalModal(true);
  };

  const cancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/cancel-subscription`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMessage('Subscription cancelled successfully');
        setUserTier('free'); fetchUserData(authToken);
      } else { setError(data.detail || 'Failed to cancel subscription'); }
    } catch (err) { setError('Failed to cancel subscription'); }
  };

  // --- Components ---

  const LanguageSelector = () => {
    const isRestricted = !isLoggedIn || (isLoggedIn && userTier === 'free');
    return (
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
            {Object.entries(LANGUAGES).map(([code, name]) => {
              const isLocked = isRestricted && !FREE_LANGS.includes(code);
              return (
                <button
                  key={code}
                  disabled={isLocked}
                  onClick={() => { if (!isLocked) { setSelectedLanguage(code); setShowLanguageDropdown(false); } }}
                  className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between ${
                    selectedLanguage === code 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : isLocked 
                            ? 'text-red-400 bg-red-50 cursor-not-allowed opacity-80' 
                            : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{name}</span>
                    {isLocked && <Lock className="w-3 h-3 text-red-500" />}
                  </div>
                  {selectedLanguage === code && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

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
          
          {/* Header Area with Language AND Mode Selector */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <h2 className="text-lg font-semibold text-slate-900">Upload Audio</h2>
            
            <div className="flex flex-col md:flex-row gap-3">
              {/* Mode Toggle */}
              <div className="bg-slate-100 p-1 rounded-xl flex items-center self-start md:self-auto">
                <button
                  onClick={() => setTranscriptionMode('fast')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    transcriptionMode === 'fast' 
                      ? 'bg-white text-emerald-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" /> 
                  <div className="text-left leading-tight">
                    <span className="block">Fast</span>
                    <span className="text-[10px] font-normal opacity-80">Quantized</span>
                  </div>
                </button>
                <button
                  onClick={() => setTranscriptionMode('quality')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    transcriptionMode === 'quality' 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Star className="w-3.5 h-3.5" /> 
                  <div className="text-left leading-tight">
                    <span className="block">Quality</span>
                    <span className="text-[10px] font-normal opacity-80">Slow</span>
                  </div>
                </button>
              </div>

              {/* Language Selector */}
              <LanguageSelector />
            </div>
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
              {error.startsWith('✓') ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
              <p className={`text-sm ${error.startsWith('✓') ? 'text-emerald-700' : 'text-red-700'}`}>{error}</p>
            </div>
          )}
          <button
            onClick={transcribeAudio}
            disabled={!file || isProcessing || isLimitReached}
            className="mt-6 w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {isProcessing ? <><Loader2 className="w-5 h-5 animate-spin" /> Transcribing...</> : <><Zap className="w-5 h-5" /> Transcribe Now</>}
          </button>
        </div>
        {transcription && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Transcription</h2>
                <div className="flex gap-3 text-sm text-slate-500">
                    <p>Language: {LANGUAGES[detectedLanguage] || detectedLanguage}</p>
                    <p>Mode: <span className="uppercase font-bold text-slate-700">{transcriptionMode}</span></p>
                </div>
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

  // ... (Billing, Navigation, GuestTranscribePage, Dashboard, HomePage, PricingPage remain similar to previous) ...
  // Re-pasting standard structure below for completeness of "Full App.js" response

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
              className={`px-5 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all ${activeTab === tab ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
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
                          <p className="font-medium text-slate-900">{item.filename}</p>
                          <p className="text-xs text-slate-500">
                            {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown Date'} • {item.duration_minutes || item.duration} min
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

  const PricingPage = () => (
    <div className="min-h-screen bg-slate-50 pt-24">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Simple Pricing</h1>
          <p className="text-lg text-slate-600">Choose the plan that fits your needs</p>
        </div>
        <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {[
            { tier: 'free', name: 'Free', price: 0, minutes: 15, features: ['15 min/day', 'Limited languages', 'Basic support'] },
            { tier: 'starter', name: 'Starter', price: 9, minutes: 300, features: ['300 min/month', 'All languages', 'Priority support', 'API access'] },
            { tier: 'pro', name: 'Pro', price: 29, minutes: 1000, features: ['1,000 min/month', 'All languages', '24/7 support', 'Speaker detection'], popular: true },
            { tier: 'enterprise', name: 'Enterprise', price: 99, minutes: 10000, features: ['10,000 min/month', 'All languages', 'Dedicated support', 'Custom solutions'] }
          ].map((plan) => (
            <div key={plan.tier} className={`relative bg-white p-6 rounded-2xl border-2 transition-all ${plan.popular ? 'border-emerald-500 shadow-xl scale-105' : 'border-slate-200'}`}>
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
              <button onClick={() => { if (plan.tier === 'free') { setShowAuthModal(true); setAuthMode('signup'); } else { handleUpgrade(plan.tier); }}}
                disabled={isUpgrading}
                className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${plan.popular ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                {isUpgrading ? <Loader2 className="w-4 h-4 animate-spin" /> : plan.tier === 'free' ? 'Get Started' : <><PayPalLogo className="w-4 h-4" /> Subscribe</>}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

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
      {renderPayPalModal()}
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
