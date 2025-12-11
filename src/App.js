import React, { useState, useRef, useEffect } from 'react';
import { Upload, Mic, FileAudio, Download, Loader2, CheckCircle, AlertCircle, Zap, LogOut, User, Lock, Mail, Shield, Clock, Globe, Headphones, Play, Star, ChevronRight, Menu, X, Settings, BarChart3, CreditCard, HelpCircle, ArrowRight, Sparkles } from 'lucide-react';

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

// Small version for footer/compact spaces
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

export default function AudioTranscriptionSaaS() {
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE VARIABLES - PRESERVED (Connected to backend/database)
  // ═══════════════════════════════════════════════════════════════════════════
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authError, setAuthError] = useState('');
  
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
  
  // UI State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const FREE_LIMIT = 3;
  const tierLimits = {
    free: 15,
    starter: 300,
    pro: 1000,
    enterprise: 10000
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // BACKEND FUNCTIONS - PRESERVED
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    loadUserData();
  }, [isLoggedIn]);

  const loadUserData = async () => {
    if (!isLoggedIn) return;
    
    try {
      const userData = await window.storage.get(`user:${userEmail}`);
      if (userData) {
        const data = JSON.parse(userData.value);
        setTranscriptionCount(data.transcriptionCount || 0);
        setUsageMinutes(data.usageMinutes || 0);
        setUserTier(data.tier || 'free');
        setUsername(data.username || '');
      }
      
      const historyData = await window.storage.get(`history:${userEmail}`);
      if (historyData) {
        setTranscriptionHistory(JSON.parse(historyData.value));
      }
    } catch (err) {
      console.log('No user data found, starting fresh');
    }
  };

  const saveUserData = async () => {
    if (!isLoggedIn) return;
    
    try {
      await window.storage.set(`user:${userEmail}`, JSON.stringify({
        email: userEmail,
        username,
        transcriptionCount,
        usageMinutes,
        tier: userTier,
        lastUpdated: new Date().toISOString()
      }));
      
      await window.storage.set(`history:${userEmail}`, JSON.stringify(transcriptionHistory));
    } catch (err) {
      console.error('Failed to save user data');
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      saveUserData();
    }
  }, [transcriptionCount, usageMinutes, userTier, transcriptionHistory]);

  
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

    try {
      const endpoint = authMode === 'login' ? 'login' : 'signup';
      const payload = authMode === 'signup' 
        ? { username, email, password }
        : { email, password };

      const response = await fetch(`http://localhost:8000/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        await window.storage.set(`auth:${email}`, JSON.stringify({
          email,
          password,
          username: data.user.username,
          token: data.token,
          createdAt: new Date().toISOString()
        }));

        await window.storage.set(`user:${email}`, JSON.stringify({
          email,
          username: data.user.username,
          transcriptionCount: data.user.transcription_count || 0,
          usageMinutes: data.user.usage_minutes || 0,
          tier: data.user.tier || 'free',
          createdAt: new Date().toISOString()
        }));

        setIsLoggedIn(true);
        setUserEmail(email);
        setUsername(data.user.username);
        setShowAuthModal(false);
        setEmail('');
        setPassword('');
        setCurrentPage('dashboard');
      } else {
        setAuthError(data.detail || 'Authentication failed');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setAuthError('Server error. Make sure backend is running.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserEmail('');
    setUsername('');
    setTranscriptionCount(0);
    setUsageMinutes(0);
    setUserTier('free');
    setTranscriptionHistory([]);
    setTranscription('');
    setFile(null);
    setCurrentPage('home');
  };

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

  const transcribeAudio = async () => {
    if (!file) {
      setError('Please upload or record an audio file first');
      return;
    }

    if (!isLoggedIn && transcriptionCount >= FREE_LIMIT) {
      setShowAuthModal(true);
      setError('Free limit reached. Please sign up to continue.');
      return;
    }

    const estimatedMinutes = 2;
    if (isLoggedIn && usageMinutes + estimatedMinutes > tierLimits[userTier]) {
      setError(`You've reached your ${userTier} tier limit. Please upgrade to continue.`);
      return;
    }

    setIsProcessing(true);
    setError('');
    setTranscription('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      let token = null;
      if (isLoggedIn) {
        try {
          const authData = await window.storage.get(`auth:${userEmail}`);
          if (authData) {
            const userData = JSON.parse(authData.value);
            token = userData.token;
          }
        } catch (err) {
          console.log('No token found');
        }
      }

      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('http://localhost:8000/api/transcribe', {
        method: 'POST',
        headers: headers,
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setTranscription(data.transcription);
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
        setError(data.detail || 'Transcription failed. Please try again.');
      }
    } catch (err) {
      console.error('Transcription error:', err);
      setError('Connection error. Make sure backend is running at http://localhost:8000');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTranscription = () => {
    const element = document.createElement('a');
    const file = new Blob([transcription], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'transcription.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const upgradeTier = (tier) => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      setError('Please login to upgrade your plan');
      return;
    }
    setUserTier(tier);
    setError('');
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // UI COMPONENTS
  // ═══════════════════════════════════════════════════════════════════════════

  // Auth Modal Component
  const AuthModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
      <div className="relative w-full max-w-md animate-fadeIn">
        {/* Background decoration */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-emerald-400 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-teal-400 rounded-full opacity-20 blur-3xl"></div>
        
        <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
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

          {/* Form */}
          <div className="px-8 py-8">
            <div className="space-y-4">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white transition-all text-slate-800 placeholder-slate-400"
                      placeholder="John Smith"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white transition-all text-slate-800 placeholder-slate-400"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white transition-all text-slate-800 placeholder-slate-400"
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
                onClick={handleAuth}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40"
              >
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </div>

            {/* Toggle auth mode */}
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'signup' : 'login');
                  setAuthError('');
                }}
                className="text-slate-600 hover:text-emerald-600 font-medium transition-colors"
              >
                {authMode === 'login' 
                  ? "Don't have an account? Sign up free" 
                  : 'Already have an account? Sign in'}
              </button>
            </div>

            {/* Continue without login */}
            <button
              onClick={() => {
                setShowAuthModal(false);
                setAuthError('');
              }}
              className="mt-4 w-full text-slate-500 hover:text-slate-700 font-medium text-sm py-2"
            >
              Continue as guest ({FREE_LIMIT - transcriptionCount} free transcriptions)
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Navigation Component
  const Navigation = () => (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentPage(isLoggedIn ? 'dashboard' : 'home')}>
            <VoxifyLogo size={40} />
            <span className="text-xl font-bold text-slate-900">Voxify</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {!isLoggedIn ? (
              <>
                <button onClick={() => setCurrentPage('home')} className={`text-sm font-medium transition-colors ${currentPage === 'home' ? 'text-emerald-600' : 'text-slate-600 hover:text-slate-900'}`}>
                  Home
                </button>
                <button onClick={() => setCurrentPage('pricing')} className={`text-sm font-medium transition-colors ${currentPage === 'pricing' ? 'text-emerald-600' : 'text-slate-600 hover:text-slate-900'}`}>
                  Pricing
                </button>
                <button onClick={() => setCurrentPage('features')} className={`text-sm font-medium transition-colors ${currentPage === 'features' ? 'text-emerald-600' : 'text-slate-600 hover:text-slate-900'}`}>
                  Features
                </button>
              </>
            ) : (
              <>
                <button onClick={() => { setCurrentPage('dashboard'); setActiveTab('transcribe'); }} className={`text-sm font-medium transition-colors ${activeTab === 'transcribe' ? 'text-emerald-600' : 'text-slate-600 hover:text-slate-900'}`}>
                  Transcribe
                </button>
                <button onClick={() => { setCurrentPage('dashboard'); setActiveTab('history'); }} className={`text-sm font-medium transition-colors ${activeTab === 'history' ? 'text-emerald-600' : 'text-slate-600 hover:text-slate-900'}`}>
                  History
                </button>
                <button onClick={() => { setCurrentPage('dashboard'); setActiveTab('pricing'); }} className={`text-sm font-medium transition-colors ${activeTab === 'pricing' ? 'text-emerald-600' : 'text-slate-600 hover:text-slate-900'}`}>
                  Upgrade
                </button>
              </>
            )}
          </div>

          {/* Auth Section */}
          <div className="hidden md:flex items-center gap-4">
            {isLoggedIn ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-slate-700">
                    {usageMinutes}/{tierLimits[userTier]} min
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">{username.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-700">{username}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-slate-500 hover:text-red-600 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => { setShowAuthModal(true); setAuthMode('login'); }}
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setShowAuthModal(true); setAuthMode('signup'); }}
                  className="text-sm font-medium bg-slate-900 text-white px-5 py-2.5 rounded-full hover:bg-slate-800 transition-colors"
                >
                  Get Started Free
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200">
          <div className="px-4 py-4 space-y-4">
            {!isLoggedIn ? (
              <>
                <button onClick={() => { setCurrentPage('home'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-slate-600">Home</button>
                <button onClick={() => { setCurrentPage('pricing'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-slate-600">Pricing</button>
                <button onClick={() => { setCurrentPage('features'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-slate-600">Features</button>
                <button onClick={() => { setShowAuthModal(true); setMobileMenuOpen(false); }} className="w-full bg-slate-900 text-white py-3 rounded-xl font-medium">Get Started</button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">{username.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{username}</p>
                    <p className="text-sm text-slate-500">{usageMinutes}/{tierLimits[userTier]} min used</p>
                  </div>
                </div>
                <button onClick={() => { setActiveTab('transcribe'); setCurrentPage('dashboard'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-slate-600">Transcribe</button>
                <button onClick={() => { setActiveTab('history'); setCurrentPage('dashboard'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-slate-600">History</button>
                <button onClick={() => { setActiveTab('pricing'); setCurrentPage('dashboard'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-slate-600">Upgrade</button>
                <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="w-full text-red-600 py-3 border border-red-200 rounded-xl font-medium">Sign Out</button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );

  // Home Page Component
  const HomePage = () => (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-16">
      {/* Hero Section */}
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
              <span className="block bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                perfect text
              </span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Professional-grade transcription in seconds. Upload any audio file and get accurate, formatted text instantly. Trusted by 50,000+ professionals.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => { setShowAuthModal(true); setAuthMode('signup'); }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-full font-semibold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentPage('features')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-slate-700 px-8 py-4 rounded-full font-semibold border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
              >
                <Play className="w-5 h-5" />
                See How It Works
              </button>
            </div>
            <p className="mt-6 text-sm text-slate-500">
              No credit card required • {FREE_LIMIT} free transcriptions • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 border-y border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            <div className="flex items-center gap-2 text-slate-400">
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">SOC 2 Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Lock className="w-5 h-5" />
              <span className="text-sm font-medium">256-bit Encryption</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Globe className="w-5 h-5" />
              <span className="text-sm font-medium">99.9% Uptime</span>
            </div>
            <div className="flex items-center gap-1 text-amber-500">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
              <span className="text-sm font-medium text-slate-600 ml-1">4.9/5 Rating</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              Everything you need for perfect transcriptions
            </h2>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              Professional features that make audio-to-text conversion effortless
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: 'Lightning Fast',
                description: 'Get transcriptions in seconds, not hours. Our AI processes audio at 10x real-time speed.',
                color: 'amber'
              },
              {
                icon: Shield,
                title: 'Enterprise Security',
                description: 'Your files are encrypted end-to-end. We never store your audio after processing.',
                color: 'emerald'
              },
              {
                icon: Globe,
                title: '99+ Languages',
                description: 'Support for over 99 languages and dialects with automatic detection.',
                color: 'blue'
              },
              {
                icon: Headphones,
                title: 'Speaker Detection',
                description: 'Automatically identify and label different speakers in conversations.',
                color: 'purple'
              },
              {
                icon: Clock,
                title: 'Timestamps',
                description: 'Get precise word-level timestamps for easy navigation and editing.',
                color: 'rose'
              },
              {
                icon: FileAudio,
                title: 'All Formats',
                description: 'Support for MP3, WAV, M4A, FLAC, OGG, and 20+ other audio formats.',
                color: 'teal'
              }
            ].map((feature, idx) => (
              <div key={idx} className="group p-8 bg-slate-50 rounded-2xl hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
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

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to transform your workflow?
          </h2>
          <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto">
            Join thousands of professionals who save hours every week with accurate AI transcription.
          </p>
          <button
            onClick={() => { setShowAuthModal(true); setAuthMode('signup'); }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-4 rounded-full font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-xl shadow-emerald-500/30"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <VoxifyLogoSmall size={32} />
              <span className="font-bold text-slate-900">Voxify</span>
            </div>
            <p className="text-sm text-slate-500">
              © 2024 Voxify. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );

  // Features Page Component  
  const FeaturesPage = () => (
    <div className="min-h-screen bg-white pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Powerful Features
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Everything you need to transcribe audio like a pro
          </p>
        </div>

        <div className="space-y-24">
          {/* Feature 1 */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 rounded-full text-emerald-700 text-sm font-medium mb-4">
                <Zap className="w-4 h-4" />
                Speed
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                10x Faster Than Real-Time
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed mb-6">
                Our advanced AI processes your audio at incredible speeds. A 60-minute recording takes just 6 minutes to transcribe with 99% accuracy.
              </p>
              <ul className="space-y-3">
                {['Parallel processing architecture', 'GPU-accelerated inference', 'Optimized for long-form content'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    {item}
                  </li>
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

          {/* Feature 2 */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 h-80 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">99+</div>
                <p className="text-slate-600 mt-2">Languages supported</p>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 rounded-full text-blue-700 text-sm font-medium mb-4">
                <Globe className="w-4 h-4" />
                Global
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Speak Any Language
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed mb-6">
                From English to Mandarin, Spanish to Arabic — our AI understands and transcribes accurately in over 99 languages with automatic detection.
              </p>
              <ul className="space-y-3">
                {['Auto language detection', 'Dialect-aware processing', 'Mixed-language support'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700">
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-24 text-center">
          <button
            onClick={() => { setShowAuthModal(true); setAuthMode('signup'); }}
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-full font-semibold hover:bg-slate-800 transition-all"
          >
            Try It Free
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  // Pricing Page Component
  const PricingPage = () => (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Choose the plan that fits your needs. Upgrade or downgrade anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {[
            { 
              tier: 'free', 
              name: 'Free', 
              price: '$0', 
              minutes: 15, 
              features: ['15 min/month', 'Standard quality', 'Email support', 'Basic export'],
              description: 'Perfect for trying out'
            },
            { 
              tier: 'starter', 
              name: 'Starter', 
              price: '$9', 
              minutes: 300, 
              features: ['300 min/month', 'High quality', 'Priority support', 'API access', 'Fast processing'],
              popular: true,
              description: 'Best for individuals'
            },
            { 
              tier: 'pro', 
              name: 'Pro', 
              price: '$29', 
              minutes: 1000, 
              features: ['1,000 min/month', 'Ultra quality', '24/7 support', 'API access', 'Custom vocabulary', 'Speaker detection'],
              description: 'Best for teams'
            },
            { 
              tier: 'enterprise', 
              name: 'Enterprise', 
              price: '$99', 
              minutes: 10000, 
              features: ['10,000 min/month', 'Ultra quality', 'Dedicated support', 'Custom API', 'Custom models', 'SLA guarantee'],
              description: 'Best for organizations'
            }
          ].map((plan) => (
            <div
              key={plan.tier}
              className={`relative p-6 rounded-2xl border-2 transition-all ${
                plan.popular
                  ? 'border-emerald-500 bg-white shadow-xl shadow-emerald-500/10 scale-105'
                  : userTier === plan.tier
                  ? 'border-slate-900 bg-white shadow-lg'
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
              {userTier === plan.tier && isLoggedIn && (
                <div className="absolute -top-3 right-4">
                  <span className="bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    CURRENT
                  </span>
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                <p className="text-sm text-slate-500">{plan.description}</p>
              </div>
              
              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                <span className="text-slate-500">/month</span>
              </div>
              
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button
                onClick={() => {
                  if (!isLoggedIn) {
                    setShowAuthModal(true);
                  } else {
                    upgradeTier(plan.tier);
                  }
                }}
                className={`w-full py-3 rounded-xl font-semibold transition-all ${
                  plan.popular
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/30'
                    : userTier === plan.tier && isLoggedIn
                    ? 'bg-slate-100 text-slate-400 cursor-default'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {userTier === plan.tier && isLoggedIn ? 'Current Plan' : 'Get Started'}
              </button>
            </div>
          ))}
        </div>

        {/* Enterprise CTA */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 md:p-12 text-center">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Need a custom solution?
            </h3>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto">
              For volume discounts, custom integrations, or dedicated infrastructure, let's talk.
            </p>
            <button className="inline-flex items-center gap-2 bg-white text-slate-900 px-8 py-3 rounded-full font-semibold hover:bg-slate-100 transition-all">
              Contact Sales
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Dashboard Component (Logged-in experience)
  const Dashboard = () => (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {username}
          </h1>
          <p className="text-slate-600">
            {userTier.charAt(0).toUpperCase() + userTier.slice(1)} Plan • {usageMinutes}/{tierLimits[userTier]} minutes used this month
          </p>
        </div>

        {/* Usage Progress */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Monthly Usage</h3>
            <span className="text-sm text-slate-500">{Math.round((usageMinutes / tierLimits[userTier]) * 100)}%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((usageMinutes / tierLimits[userTier]) * 100, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-slate-500">
            <span>{usageMinutes} min used</span>
            <span>{tierLimits[userTier] - usageMinutes} min remaining</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 p-1 bg-white rounded-xl shadow-sm border border-slate-200 inline-flex mb-8">
          {[
            { id: 'transcribe', label: 'Transcribe', icon: Mic },
            { id: 'history', label: 'History', icon: Clock },
            { id: 'pricing', label: 'Upgrade', icon: CreditCard }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Transcribe Tab */}
            {activeTab === 'transcribe' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-6">Upload Audio</h2>
                  
                  {/* Upload Area */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 transition-all group"
                  >
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-emerald-100 transition-colors">
                      <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                    </div>
                    <p className="text-slate-700 font-medium">Drop your audio file here or click to browse</p>
                    <p className="text-sm text-slate-500 mt-2">MP3, WAV, M4A, WebM up to 100MB</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-4 my-6">
                    <div className="flex-1 h-px bg-slate-200"></div>
                    <span className="text-sm text-slate-400 font-medium">OR RECORD</span>
                    <div className="flex-1 h-px bg-slate-200"></div>
                  </div>

                  {/* Record Button */}
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-3 ${
                      isRecording
                        ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Mic className="w-5 h-5" />
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                  </button>

                  {/* File Preview */}
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

                  {/* Error */}
                  {error && (
                    <div className="mt-6 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  {/* Transcribe Button */}
                  <button
                    onClick={transcribeAudio}
                    disabled={!file || isProcessing}
                    className="mt-6 w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        Transcribe Now
                      </>
                    )}
                  </button>
                </div>

                {/* Transcription Result */}
                {transcription && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-slate-900">Transcription</h2>
                      <button
                        onClick={downloadTranscription}
                        className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        <Download className="w-5 h-5" />
                        Download
                      </button>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                      <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{transcription}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-6">Transcription History</h2>
                {transcriptionHistory.length > 0 ? (
                  <div className="space-y-4">
                    {transcriptionHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer"
                        onClick={() => {
                          setTranscription(item.transcription);
                          setActiveTab('transcribe');
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                              <FileAudio className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{item.fileName}</p>
                              <p className="text-xs text-slate-500">
                                {new Date(item.date).toLocaleDateString()} • {item.duration} min
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-2 mt-3">{item.transcription}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileAudio className="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No transcriptions yet</h3>
                    <p className="text-slate-500 mb-6">Upload your first audio file to get started</p>
                    <button
                      onClick={() => setActiveTab('transcribe')}
                      className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-medium"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Audio
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Pricing Tab */}
            {activeTab === 'pricing' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-6">Upgrade Your Plan</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { tier: 'free', name: 'Free', price: '$0', minutes: 15, features: ['15 min/month', 'Standard quality', 'Email support'] },
                    { tier: 'starter', name: 'Starter', price: '$9', minutes: 300, features: ['300 min/month', 'High quality', 'Priority support', 'API access'], popular: true },
                    { tier: 'pro', name: 'Pro', price: '$29', minutes: 1000, features: ['1,000 min/month', 'Ultra quality', '24/7 support', 'Custom vocabulary'] },
                    { tier: 'enterprise', name: 'Enterprise', price: '$99', minutes: 10000, features: ['10,000 min/month', 'Ultra quality', 'Dedicated support', 'Custom models'] }
                  ].map((plan) => (
                    <div
                      key={plan.tier}
                      className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all ${
                        userTier === plan.tier
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 hover:border-emerald-300'
                      }`}
                      onClick={() => upgradeTier(plan.tier)}
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
                          <h3 className="font-semibold text-slate-900">{plan.name}</h3>
                          <p className="text-xs text-slate-500">{plan.minutes} min/month</p>
                        </div>
                        <span className="text-2xl font-bold text-slate-900">{plan.price}</span>
                      </div>
                      <ul className="space-y-2">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600">Total Transcriptions</span>
                  <span className="font-semibold text-slate-900">{transcriptionCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600">Minutes Used</span>
                  <span className="font-semibold text-slate-900">{usageMinutes}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600">Current Plan</span>
                  <span className="font-semibold text-emerald-600 capitalize">{userTier}</span>
                </div>
              </div>
            </div>

            {/* Upgrade CTA */}
            {userTier === 'free' && (
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
                <h3 className="font-semibold text-lg mb-2">Upgrade to Pro</h3>
                <p className="text-emerald-100 text-sm mb-4">
                  Get 1,000 minutes/month and unlock premium features.
                </p>
                <button
                  onClick={() => setActiveTab('pricing')}
                  className="w-full bg-white text-emerald-600 py-2.5 rounded-xl font-semibold hover:bg-emerald-50 transition-colors"
                >
                  View Plans
                </button>
              </div>
            )}

            {/* Help */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Need Help?</h3>
                  <p className="text-xs text-slate-500">We're here to assist</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Check our documentation or contact support for assistance.
              </p>
              <button className="w-full py-2.5 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors">
                View Documentation
              </button>
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
        
        * {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
      
      {showAuthModal && <AuthModal />}
      <Navigation />
      
      {isLoggedIn ? (
        <Dashboard />
      ) : (
        <>
          {currentPage === 'home' && <HomePage />}
          {currentPage === 'pricing' && <PricingPage />}
          {currentPage === 'features' && <FeaturesPage />}
        </>
      )}
    </div>
  );
}
