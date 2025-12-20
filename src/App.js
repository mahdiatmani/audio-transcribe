import React, { useState, useRef, useEffect } from 'react';
import { Upload, Mic, FileAudio, Download, Loader2, CheckCircle, AlertCircle, Zap, LogOut, User, Lock, Clock, History, ChevronRight, ChevronDown, Menu, X, ArrowRight, Sparkles, Languages, Play, Shield, Star } from 'lucide-react';

// Audio Components
import AudioRecorder from './components/AudioRecorder';
import AudioFileDisplay from './components/AudioFileDisplay';

// ═══════════════════════════════════════════════════════════════════════════
// API CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const FREE_GUEST_LIMIT = 3;

// Quota Limits (Must match Backend)
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

// ═══════════════════════════════════════════════════════════════════════════
// TRANSCRIPTION MODES
// ═══════════════════════════════════════════════════════════════════════════
const TRANSCRIPTION_MODES = {
  fast: {
    id: 'fast',
    name: 'Fast Mode',
    icon: '⚡',
    description: 'Quick results with good accuracy',
    model: 'Whisper Turbo (Quantized)',
    speed: '~2x faster',
    details: 'Uses quantized model for faster processing. Best for quick drafts and clear audio.'
  },
  quality: {
    id: 'quality', 
    name: 'Quality Mode',
    icon: '🎯',
    description: 'Best accuracy, takes longer',
    model: 'Whisper Large v3',
    speed: 'Standard speed',
    details: 'Uses full precision model for maximum accuracy. Best for professional transcriptions.'
  }
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

// PayPal Logo SVG Component
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
  
  // MODE SELECTION
  const [selectedMode, setSelectedMode] = useState('fast');
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [transcribedMode, setTranscribedMode] = useState('');
  
  // Guest state
  const [guestTranscriptionCount, setGuestTranscriptionCount] = useState(0);
  const [isGuestMode, setIsGuestMode] = useState(false);
  
  // UI State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  
  // PayPal state
  const [paypalClientId, setPaypalClientId] = useState('');
  const [showPayPalModal, setShowPayPalModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  
  const fileInputRef = useRef(null);
  const languageDropdownRef = useRef(null);
  const modeDropdownRef = useRef(null);
  const paypalButtonRef = useRef(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  const getRemainingGuestAttempts = () => Math.max(0, FREE_GUEST_LIMIT - guestTranscriptionCount);
  const canGuestTranscribe = () => guestTranscriptionCount < FREE_GUEST_LIMIT;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYPAL SDK LOADER
  // ═══════════════════════════════════════════════════════════════════════════
  const loadPayPalSDK = async (clientId) => {
    if (window.paypal) {
      setPaypalLoaded(true);
      return;
    }
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&vault=true&intent=subscription`;
      script.async = true;
      script.onload = () => {
        setPaypalLoaded(true);
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
      document.body.appendChild(script);
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION & EFFECTS
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
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error(err);
    }
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
    } catch (err) {
        console.error("Failed to fetch history");
    }
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
        setSuccessMessage(`🎉 Successfully upgraded to ${tier.charAt(0).toUpperCase() + tier.slice(1)}! Your new limits are now active.`);
        setUserTier(tier);
        setUsageMinutes(0);
      }
      window.history.replaceState({}, '', window.location.pathname);
      setCurrentPage('dashboard');
    } else if (paymentStatus === 'cancelled') {
      setError('Payment was cancelled. You can try again anytime.');
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
      } catch (err) {
        storage.remove('voxify_auth');
      }
    }
    
    const storedGuestCount = storage.get('voxify_guest_count');
    if (storedGuestCount) {
      const count = parseInt(storedGuestCount.value, 10);
      setGuestTranscriptionCount(isNaN(count) ? 0 : count);
    } else {
      storage.set('voxify_guest_count', '0');
    }

    fetchPayPalConfig();
  }, []);

  const fetchPayPalConfig = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/paypal/config`);
      if (response.ok) {
        const data = await response.json();
        setPaypalClientId(data.client_id);
        if (data.client_id) {
          loadPayPalSDK(data.client_id).catch(console.error);
        }
      }
    } catch (err) {
      console.error('Failed to fetch PayPal config:', err);
    }
  };

  const capturePayPalSubscription = async (subscriptionId, tier) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/capture-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ subscription_id: subscriptionId, tier })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccessMessage(`🎉 Successfully upgraded to ${tier.charAt(0).toUpperCase() + tier.slice(1)}! Your new limits are now active.`);
        setUserTier(tier);
        setUsageMinutes(0);
        fetchUserData(authToken);
      } else {
        setError(data.detail || 'Failed to activate subscription');
      }
    } catch (err) {
      setError('Failed to activate subscription. Please contact support.');
    }
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
    const handleClickOutside = (event) => {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target)) {
        setShowModeDropdown(false);
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
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
              },
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
          } catch (err) {
            setError(err.message);
            return null;
          }
        },
        onApprove: async (data, actions) => {
          setShowPayPalModal(false);
          setIsUpgrading(true);
          capturePayPalSubscription(data.subscriptionID, selectedPlan.tier);
          setIsUpgrading(false);
          setSelectedPlan(null);
        },
        onCancel: () => {
          setShowPayPalModal(false);
          setSelectedPlan(null);
        },
        onError: (err) => {
          console.error('PayPal error:', err);
          setError('Payment failed. Please try again.');
          setShowPayPalModal(false);
          setSelectedPlan(null);
        }
      }).render(paypalButtonRef.current);
    }
  }, [showPayPalModal, selectedPlan, paypalLoaded, authToken]);

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
        fetchHistory(data.token);
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

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSCRIPTION
  // ═══════════════════════════════════════════════════════════════════════════
  const transcribeAudio = async () => {
    if (!file) {
      setError('Please upload or record an audio file first');
      return;
    }

    if (!isLoggedIn) {
      const currentCount = parseInt(storage.get('voxify_guest_count')?.value || '0', 10);
      if (currentCount >= FREE_GUEST_LIMIT) {
        setError('Free limit reached. Please sign up to continue.');
        setShowAuthModal(true);
        setAuthMode('signup');
        return;
      }
    }

    if (isLoggedIn && usageMinutes >= TIER_LIMITS[userTier]) {
      setError(`Usage limit reached. Please upgrade your plan.`);
      return;
    }

    setIsProcessing(true);
    setError('');
    setTranscription('');
    setDetectedLanguage('');
    setTranscribedMode('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', selectedLanguage);
      formData.append('mode', selectedMode);

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
        setTranscribedMode(data.mode || selectedMode);
        
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
  // PAYPAL PAYMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  const handleUpgrade = async (tier) => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      setAuthMode('signup');
      return;
    }

    if (tier === 'free' || tier === userTier) return;

    if (!paypalClientId) {
      setError('Payment system not available. Please try again later.');
      return;
    }

    const planDetails = {
      starter: { tier: 'starter', name: 'Starter', price: 9, minutes: 300 },
      pro: { tier: 'pro', name: 'Pro', price: 29, minutes: 1000 },
      enterprise: { tier: 'enterprise', name: 'Enterprise', price: 99, minutes: 10000 }
    };

    setSelectedPlan(planDetails[tier]);
    setShowPayPalModal(true);
  };

  const cancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/cancel-subscription`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccessMessage('Subscription cancelled successfully');
        setUserTier('free');
        fetchUserData(authToken);
      } else {
        setError(data.detail || 'Failed to cancel subscription');
      }
    } catch (err) {
      setError('Failed to cancel subscription');
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE SELECTOR COMPONENT
  // ═══════════════════════════════════════════════════════════════════════════
  const ModeSelector = () => {
    const currentMode = TRANSCRIPTION_MODES[selectedMode];
    
    return (
      <div className="relative" ref={modeDropdownRef}>
        <button
          onClick={() => setShowModeDropdown(!showModeDropdown)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 rounded-xl text-slate-700 font-medium transition-all border border-slate-200"
        >
          <span className="text-lg">{currentMode.icon}</span>
          <span>{currentMode.name}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showModeDropdown ? 'rotate-180' : ''}`} />
        </button>
        
        {showModeDropdown && (
          <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
            {Object.values(TRANSCRIPTION_MODES).map((mode) => (
              <button
                key={mode.id}
                onClick={() => {
                  setSelectedMode(mode.id);
                  setShowModeDropdown(false);
                }}
                className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                  selectedMode === mode.id ? 'bg-emerald-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{mode.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{mode.name}</p>
                        {selectedMode === mode.id && (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5">{mode.description}</p>
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-slate-500">
                          <span className="font-medium">Model:</span> {mode.model}
                        </p>
                        <p className="text-xs text-slate-500">
                          <span className="font-medium">Speed:</span> {mode.speed}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // LANGUAGE SELECTOR COMPONENT
  // ═══════════════════════════════════════════════════════════════════════════
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
                  onClick={() => {
                    if (!isLocked) {
                      setSelectedLanguage(code);
                      setShowLanguageDropdown(false);
                    }
                  }}
                  className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between ${
                    selectedLanguage === code 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : isLocked 
                            ? 'text-red-400 bg-red-50 cursor-not-allowed opacity-75' 
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
  // PAYPAL MODAL
  // ═══════════════════════════════════════════════════════════════════════════
  const renderPayPalModal = () => {
    if (!showPayPalModal || !selectedPlan) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
        <div className="relative w-full max-w-md animate-fadeIn">
          <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden">
            <button onClick={() => { setShowPayPalModal(false); setSelectedPlan(null); }} className="absolute top-4 right-4 z-10 p-2 hover:bg-slate-100 rounded-full">
              <X className="w-5 h-5 text-slate-500" />
            </button>
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 px-8 py-10 text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4">
                <PayPalLogo className="text-blue-600 w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-white">Complete Your Purchase</h2>
              <p className="text-blue-100 mt-2">Subscribe to {selectedPlan.name}</p>
            </div>
            <div className="px-8 py-8">
              <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-slate-900">{selectedPlan.name} Plan</p>
                    <p className="text-sm text-slate-500">{selectedPlan.minutes} minutes/month</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">${selectedPlan.price}</p>
                    <p className="text-sm text-slate-500">/month</p>
                  </div>
                </div>
              </div>
              <div ref={paypalButtonRef} className="min-h-[150px] flex items-center justify-center">
                {!paypalLoaded && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading PayPal...</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 text-center mt-4">
                Secure payment powered by PayPal. Cancel anytime.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSCRIBE SECTION - WITH AUDIO COMPONENTS INTEGRATED!
  // ═══════════════════════════════════════════════════════════════════════════
  const TranscribeSection = ({ isGuest = false }) => {
    const remaining = isGuest ? getRemainingGuestAttempts() : TIER_LIMITS[userTier] - usageMinutes;
    const isLimitReached = remaining <= 0;
    
    // Calculate remaining quota in SECONDS
    const remainingQuotaSeconds = isGuest 
      ? getRemainingGuestAttempts() * 180  // 3 minutes per guest attempt
      : (TIER_LIMITS[userTier] - usageMinutes) * 60;
    
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
            <div className="flex items-center gap-3">
              <ModeSelector />
              <LanguageSelector />
            </div>
          </div>
          
          {/* Mode info banner */}
          <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xl">{TRANSCRIPTION_MODES[selectedMode].icon}</span>
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {TRANSCRIPTION_MODES[selectedMode].name}
                </p>
                <p className="text-xs text-slate-600">
                  {TRANSCRIPTION_MODES[selectedMode].details}
                </p>
              </div>
            </div>
          </div>
          
          {/* File Upload Area */}
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
          
          {/* Uploaded File Display with Waveform */}
          {file && (
            <div className="mt-6">
              <AudioFileDisplay
                file={file}
                onRemove={() => {
                  setFile(null);
                  setTranscription('');
                  setError('');
                }}
                showPlayback={true}
              />
            </div>
          )}
          
          {/* OR Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-slate-200"></div>
            <span className="text-sm text-slate-400 font-medium">OR RECORD</span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>
          
          {/* Audio Recorder Component */}
          <AudioRecorder
            onRecordingComplete={(recordedFile) => {
              setFile(recordedFile);
              setError('');
              setTranscription('');
            }}
            remainingQuota={remainingQuotaSeconds}
            maxDuration={600} // 10 minutes max
          />
          
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
        
        {/* Transcription Results */}
        {transcription && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Transcription</h2>
                <div className="flex items-center gap-3 mt-1">
                  {detectedLanguage && (
                    <p className="text-sm text-slate-500">
                      Language: {LANGUAGES[detectedLanguage] || detectedLanguage}
                    </p>
                  )}
                  {transcribedMode && (
                    <>
                      <span className="text-slate-300">•</span>
                      <p className="text-sm text-slate-500 flex items-center gap-1">
                        {TRANSCRIPTION_MODES[transcribedMode].icon} {TRANSCRIPTION_MODES[transcribedMode].name}
                      </p>
                    </>
                  )}
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
            <p className="text-sm text-slate-600">{TIER_LIMITS[userTier]} minutes/{userTier === 'free' ? 'day' : 'month'}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">${TIER_PRICES[userTier]}</p>
            <p className="text-sm text-slate-500">/month</p>
          </div>
        </div>
        <div className="mt-6">
          <div className="flex justify-between mb-2">
            <span className="text-slate-600">Usage {userTier === 'free' ? 'today' : 'this month'}</span>
            <span className="font-medium">{usageMinutes} / {TIER_LIMITS[userTier]} min</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
              style={{ width: `${Math.min((usageMinutes / TIER_LIMITS[userTier]) * 100, 100)}%` }} />
          </div>
        </div>
        {userTier !== 'free' && (
          <button onClick={cancelSubscription}
            className="mt-6 w-full py-3 border border-red-200 rounded-xl text-red-600 font-medium hover:bg-red-50 flex items-center justify-center gap-2">
            Cancel Subscription
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
                  userTier === plan.tier ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isUpgrading ? <Loader2 className="w-4 h-4 animate-spin" /> : userTier === plan.tier ? 'Current Plan' : <><PayPalLogo className="w-4 h-4" /> Pay with PayPal</>}
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
                <button onClick={() => setCurrentPage('docs')} className="text-sm font-medium text-slate-600 hover:text-emerald-600">Docs</button>
                <button onClick={() => setCurrentPage('about')} className="text-sm font-medium text-slate-600 hover:text-emerald-600">About</button>
                <button onClick={() => setCurrentPage('contact')} className="text-sm font-medium text-slate-600 hover:text-emerald-600">Contact</button>
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
              <button onClick={() => { setCurrentPage('docs'); setMobileMenuOpen(false); }} className="block w-full text-left py-2">Docs</button>
              <button onClick={() => { setCurrentPage('about'); setMobileMenuOpen(false); }} className="block w-full text-left py-2">About</button>
              <button onClick={() => { setCurrentPage('contact'); setMobileMenuOpen(false); }} className="block w-full text-left py-2">Contact</button>
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
          <div className={`mb-6 p-5 rounded-2xl border-2 ${isLimitReached ? 'bg-red-50 border-red-300' : remainingAttempts === 1 ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {isLimitReached ? <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center"><Lock className="w-7 h-7 text-red-600" /></div> : <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center"><Zap className="w-7 h-7 text-emerald-600" /></div>}
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
                  <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i < usedAttempts ? 'bg-slate-300 text-slate-500' : 'bg-emerald-500 text-white'}`}>
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

  // ═══════════════════════════════════════════════════════════════════════════
  // HOME PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  const HomePage = () => (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-16">
      <section className="relative py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-transparent"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 rounded-full text-emerald-700 text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" /> AI-Powered • 30+ Languages • Dual Mode
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6">
            Transform audio into<br />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">perfect text</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10">
            Professional transcription in seconds. Choose between Fast mode for quick results or Quality mode for maximum accuracy.
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
          <div className="flex items-center gap-2 text-slate-500"><Zap className="w-5 h-5" /><span className="text-sm font-medium">Fast Mode</span></div>
          <div className="flex items-center gap-2 text-slate-500"><Shield className="w-5 h-5" /><span className="text-sm font-medium">Quality Mode</span></div>
          <div className="flex items-center gap-2 text-slate-500"><Languages className="w-5 h-5" /><span className="text-sm font-medium">30+ Languages</span></div>
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

  const PricingPage = () => <div className="min-h-screen bg-slate-50 pt-16"><div className="max-w-4xl mx-auto px-4 py-16 text-center"><h1 className="text-4xl font-bold mb-4">Pricing</h1><p className="text-slate-600">Coming soon...</p></div></div>;

  // ═══════════════════════════════════════════════════════════════════════════
  // ABOUT US PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  const AboutPage = () => (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">About Voxify</h1>
          <p className="text-xl text-slate-600">Transforming audio into text with AI precision</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Mission</h2>
          <p className="text-slate-700 leading-relaxed mb-4">
            At Voxify, we believe that audio content should be accessible to everyone. Our mission is to provide
            fast, accurate, and affordable transcription services powered by cutting-edge AI technology.
          </p>
          <p className="text-slate-700 leading-relaxed">
            Whether you're a journalist transcribing interviews, a student recording lectures, or a business
            professional documenting meetings, Voxify makes it easy to convert speech into searchable,
            editable text in seconds.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Lightning Fast</h3>
            <p className="text-slate-600">
              Our Fast Mode uses optimized AI models to deliver transcriptions up to 2x faster,
              perfect for quick turnarounds.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Maximum Accuracy</h3>
            <p className="text-slate-600">
              Quality Mode leverages Whisper Large v3 for professional-grade transcriptions with
              industry-leading accuracy.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
              <Languages className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">30+ Languages</h3>
            <p className="text-slate-600">
              Support for over 30 languages with automatic language detection, making Voxify
              perfect for global teams.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
              <User className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">User-Friendly</h3>
            <p className="text-slate-600">
              Simple, intuitive interface that works seamlessly across all devices. Upload files
              or record directly in your browser.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-slate-300 mb-6">
            Join thousands of users who trust Voxify for their transcription needs
          </p>
          <button
            onClick={() => { setShowAuthModal(true); setAuthMode('signup'); }}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-3 rounded-full font-semibold hover:from-emerald-600 hover:to-teal-600"
          >
            Start Free Trial
          </button>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTACT US PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  const ContactPage = () => {
    const [contactEmail, setContactEmail] = useState('');
    const [contactName, setContactName] = useState('');
    const [contactMessage, setContactMessage] = useState('');
    const [contactSubmitted, setContactSubmitted] = useState(false);
    const [contactError, setContactError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleContactSubmit = async (e) => {
      e.preventDefault();
      setContactError('');
      setIsSubmitting(true);

      const payload = {
        name: contactName,
        email: contactEmail,
        message: contactMessage,
      };

      console.log('🔔 Contact form submitted');
      console.log('📡 API URL:', `${API_BASE_URL}/api/contact`);
      console.log('📦 Payload:', payload);

      try {
        const response = await fetch(`${API_BASE_URL}/api/contact`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        console.log('📥 Response status:', response.status);
        console.log('📥 Response ok:', response.ok);

        const data = await response.json();
        console.log('📥 Response data:', data);

        if (response.ok) {
          console.log('✅ Contact form sent successfully!');
          setContactSubmitted(true);
          setTimeout(() => {
            setContactSubmitted(false);
            setContactEmail('');
            setContactName('');
            setContactMessage('');
          }, 5000);
        } else {
          console.error('❌ Server error:', data.detail);
          setContactError(data.detail || 'Failed to send message. Please try again.');
        }
      } catch (err) {
        console.error('❌ Network error:', err);
        setContactError('Connection error. Please try again or email us directly at support@ai-need-tools.online');
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="min-h-screen bg-slate-50 pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Contact Us</h1>
            <p className="text-xl text-slate-600">We'd love to hear from you</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Get in Touch</h2>

              {contactSubmitted ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-emerald-900 mb-2">Message Sent!</h3>
                  <p className="text-emerald-700">We'll get back to you soon.</p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Message</label>
                    <textarea
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      required
                      rows="5"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                      placeholder="How can we help you?"
                    />
                  </div>

                  {contactError && (
                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-700">{contactError}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Message'
                    )}
                  </button>
                </form>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Support</h3>
                    <p className="text-slate-600 text-sm">support@ai-need-tools.online</p>
                    <p className="text-slate-500 text-xs mt-1">We typically respond within 24 hours</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Sales</h3>
                    <p className="text-slate-600 text-sm">sales@ai-need-tools.online</p>
                    <p className="text-slate-500 text-xs mt-1">For enterprise inquiries</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Help Center</h3>
                    <p className="text-slate-600 text-sm">Find answers to common questions</p>
                    <button
                      onClick={() => setCurrentPage('home')}
                      className="text-emerald-600 hover:text-emerald-700 text-sm font-medium mt-2"
                    >
                      Visit Help Center →
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-6 text-white">
                <h3 className="font-semibold mb-2">Need Immediate Help?</h3>
                <p className="text-emerald-50 text-sm mb-4">
                  Check out our documentation and FAQs for quick answers
                </p>
                <button
                  onClick={() => setCurrentPage('home')}
                  className="bg-white text-emerald-600 px-4 py-2 rounded-lg font-medium text-sm hover:bg-emerald-50 transition-colors"
                >
                  View Documentation
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DOCUMENTATION PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  const DocumentationPage = () => {
    const [openSection, setOpenSection] = useState('getting-started');

    const toggleSection = (section) => {
      setOpenSection(openSection === section ? null : section);
    };

    return (
      <div className="min-h-screen bg-slate-50 pt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Documentation</h1>
            <p className="text-xl text-slate-600">Everything you need to know about using Voxify</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-20">
                <h3 className="font-semibold text-slate-900 mb-4">Quick Links</h3>
                <nav className="space-y-2">
                  <button onClick={() => toggleSection('getting-started')} className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${openSection === 'getting-started' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                    Getting Started
                  </button>
                  <button onClick={() => toggleSection('features')} className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${openSection === 'features' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                    Features
                  </button>
                  <button onClick={() => toggleSection('modes')} className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${openSection === 'modes' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                    Transcription Modes
                  </button>
                  <button onClick={() => toggleSection('languages')} className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${openSection === 'languages' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                    Supported Languages
                  </button>
                  <button onClick={() => toggleSection('pricing')} className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${openSection === 'pricing' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                    Pricing & Plans
                  </button>
                  <button onClick={() => toggleSection('faq')} className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${openSection === 'faq' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                    FAQ
                  </button>
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Getting Started */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Getting Started</h2>
                </div>

                <div className="space-y-4">
                  <div className="border-l-4 border-emerald-500 pl-4">
                    <h3 className="font-semibold text-slate-900 mb-2">1. Create Your Account</h3>
                    <p className="text-slate-700">Sign up for a free account to get started. No credit card required for the free tier.</p>
                  </div>

                  <div className="border-l-4 border-emerald-500 pl-4">
                    <h3 className="font-semibold text-slate-900 mb-2">2. Upload or Record Audio</h3>
                    <p className="text-slate-700">Choose to upload an audio file (MP3, WAV, M4A, WebM) or record directly in your browser. Files up to 100MB are supported.</p>
                  </div>

                  <div className="border-l-4 border-emerald-500 pl-4">
                    <h3 className="font-semibold text-slate-900 mb-2">3. Select Your Preferences</h3>
                    <p className="text-slate-700">Choose your transcription mode (Fast or Quality) and select the language or use auto-detection.</p>
                  </div>

                  <div className="border-l-4 border-emerald-500 pl-4">
                    <h3 className="font-semibold text-slate-900 mb-2">4. Get Your Transcription</h3>
                    <p className="text-slate-700">Click "Transcribe Now" and wait a few seconds. Your text will appear ready to download or copy.</p>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Star className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Key Features</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-emerald-600" /> File Upload
                    </h3>
                    <p className="text-sm text-slate-600">Support for MP3, WAV, M4A, and WebM formats up to 100MB</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl">
                    <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <Mic className="w-4 h-4 text-emerald-600" /> Live Recording
                    </h3>
                    <p className="text-sm text-slate-600">Record audio directly in your browser with waveform visualization</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl">
                    <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <Download className="w-4 h-4 text-emerald-600" /> Easy Export
                    </h3>
                    <p className="text-sm text-slate-600">Download transcriptions as text files or copy to clipboard</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl">
                    <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <History className="w-4 h-4 text-emerald-600" /> History
                    </h3>
                    <p className="text-sm text-slate-600">Access all your previous transcriptions anytime</p>
                  </div>
                </div>
              </div>

              {/* Transcription Modes */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Transcription Modes</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="border-2 border-emerald-200 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">⚡</span>
                      <h3 className="text-lg font-semibold text-slate-900">Fast Mode</h3>
                    </div>
                    <p className="text-slate-700 mb-4">Uses Whisper Turbo (Quantized) for ~2x faster processing. Best for quick drafts and clear audio.</p>
                    <ul className="space-y-2 text-sm text-slate-600">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" /> Lightning fast results
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" /> Good accuracy
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" /> Perfect for meetings
                      </li>
                    </ul>
                  </div>

                  <div className="border-2 border-emerald-200 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">🎯</span>
                      <h3 className="text-lg font-semibold text-slate-900">Quality Mode</h3>
                    </div>
                    <p className="text-slate-700 mb-4">Uses Whisper Large v3 for maximum accuracy. Best for professional transcriptions.</p>
                    <ul className="space-y-2 text-sm text-slate-600">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" /> Maximum accuracy
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" /> Better punctuation
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" /> Professional quality
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Supported Languages */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Languages className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Supported Languages</h2>
                </div>

                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="text-sm text-emerald-800">
                    <strong>Free Tier:</strong> Auto-detect, English, French, and Arabic
                  </p>
                  <p className="text-xs text-emerald-700 mt-1">
                    Upgrade to access all 30+ languages
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {Object.entries(LANGUAGES).slice(0, 12).map(([code, name]) => (
                    <div key={code} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <span className="text-emerald-600">•</span>
                      <span className="text-slate-700">{name}</span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-500 mt-4">...and 15+ more languages available with paid plans</p>
              </div>

              {/* Pricing */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Pricing & Plans</h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-slate-900 font-semibold">Plan</th>
                        <th className="text-left py-3 px-4 text-slate-900 font-semibold">Price</th>
                        <th className="text-left py-3 px-4 text-slate-900 font-semibold">Minutes</th>
                        <th className="text-left py-3 px-4 text-slate-900 font-semibold">Features</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="py-3 px-4 font-medium text-slate-900">Free</td>
                        <td className="py-3 px-4 text-slate-700">$0</td>
                        <td className="py-3 px-4 text-slate-700">15/day</td>
                        <td className="py-3 px-4 text-slate-600 text-sm">4 languages, both modes</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-3 px-4 font-medium text-slate-900">Starter</td>
                        <td className="py-3 px-4 text-slate-700">$9/mo</td>
                        <td className="py-3 px-4 text-slate-700">300/month</td>
                        <td className="py-3 px-4 text-slate-600 text-sm">All languages, API access</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-3 px-4 font-medium text-slate-900">Pro</td>
                        <td className="py-3 px-4 text-slate-700">$29/mo</td>
                        <td className="py-3 px-4 text-slate-700">1,000/month</td>
                        <td className="py-3 px-4 text-slate-600 text-sm">Priority support, speaker detection</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium text-slate-900">Enterprise</td>
                        <td className="py-3 px-4 text-slate-700">$99/mo</td>
                        <td className="py-3 px-4 text-slate-700">10,000/month</td>
                        <td className="py-3 px-4 text-slate-600 text-sm">Custom solutions, dedicated support</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* FAQ */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Frequently Asked Questions</h2>
                </div>

                <div className="space-y-4">
                  <div className="border-b border-slate-200 pb-4">
                    <h3 className="font-semibold text-slate-900 mb-2">What audio formats are supported?</h3>
                    <p className="text-slate-700">We support MP3, WAV, M4A, and WebM formats with a maximum file size of 100MB.</p>
                  </div>

                  <div className="border-b border-slate-200 pb-4">
                    <h3 className="font-semibold text-slate-900 mb-2">How accurate are the transcriptions?</h3>
                    <p className="text-slate-700">Our Quality Mode uses Whisper Large v3, achieving industry-leading accuracy. Fast Mode provides good accuracy at 2x the speed.</p>
                  </div>

                  <div className="border-b border-slate-200 pb-4">
                    <h3 className="font-semibold text-slate-900 mb-2">Can I try before subscribing?</h3>
                    <p className="text-slate-700">Yes! The free tier includes 15 minutes per day with 4 languages. You can also try as a guest with 3 free transcriptions.</p>
                  </div>

                  <div className="border-b border-slate-200 pb-4">
                    <h3 className="font-semibold text-slate-900 mb-2">How do I cancel my subscription?</h3>
                    <p className="text-slate-700">You can cancel anytime from your Billing page. No questions asked, and you'll retain access until the end of your billing period.</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Is my data secure?</h3>
                    <p className="text-slate-700">Yes! All audio files and transcriptions are encrypted and stored securely. We never share your data with third parties.</p>
                  </div>
                </div>
              </div>

              {/* Need More Help */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-center text-white">
                <h2 className="text-2xl font-bold mb-4">Still Have Questions?</h2>
                <p className="text-slate-300 mb-6">Our support team is here to help</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => setCurrentPage('contact')}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-3 rounded-full font-semibold hover:from-emerald-600 hover:to-teal-600"
                  >
                    Contact Support
                  </button>
                  <button
                    onClick={() => { setShowAuthModal(true); setAuthMode('signup'); }}
                    className="bg-white text-slate-900 px-8 py-3 rounded-full font-semibold hover:bg-slate-100"
                  >
                    Start Free Trial
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
          {currentPage === 'docs' && <DocumentationPage />}
          {currentPage === 'about' && <AboutPage />}
          {currentPage === 'contact' && <ContactPage />}
        </>
      )}
    </div>
  );
}
