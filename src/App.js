import React, { useState, useRef, useEffect } from 'react';
import { Upload, Mic, FileAudio, Download, Loader2, CheckCircle, AlertCircle, Zap, LogOut, User, Lock, Mail, Globe, Sparkles, TrendingUp, Shield, Clock, BarChart3, X, Menu, ChevronRight, Star } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Add storage polyfill
if (!window.storage) {
  window.storage = {
    get: (key) => {
      const value = localStorage.getItem(key);
      return value ? Promise.resolve({ value }) : Promise.reject('Not found');
    },
    set: (key, value) => {
      localStorage.setItem(key, value);
      return Promise.resolve();
    }
  };
}

export default function AudioTranscriptionSaaS() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authError, setAuthError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  
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

  // Supported languages
  const languages = {
    'auto': '🌍 Auto-detect',
    'en': '🇬🇧 English',
    'es': '🇪🇸 Spanish',
    'fr': '🇫🇷 French',
    'de': '🇩🇪 German',
    'it': '🇮🇹 Italian',
    'pt': '🇵🇹 Portuguese',
    'nl': '🇳🇱 Dutch',
    'ru': '🇷🇺 Russian',
    'zh': '🇨🇳 Chinese',
    'ja': '🇯🇵 Japanese',
    'ko': '🇰🇷 Korean',
    'ar': '🇸🇦 Arabic',
    'hi': '🇮🇳 Hindi',
    'tr': '🇹🇷 Turkish',
    'pl': '🇵🇱 Polish',
    'uk': '🇺🇦 Ukrainian',
    'vi': '🇻🇳 Vietnamese',
    'th': '🇹🇭 Thai',
    'id': '🇮🇩 Indonesian'
  };

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

      const response = await fetch(`${API_URL}/auth/${endpoint}`, {
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
    setDetectedLanguage('');
    setShowSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', selectedLanguage);

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

      const response = await fetch(`${API_URL}/api/transcribe`, {
        method: 'POST',
        headers: headers,
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setTranscription(data.transcription);
        setTranscriptionCount(prev => prev + 1);
        setUsageMinutes(data.usage.used);
        setDetectedLanguage(data.language_name || '');
        setShowSuccess(true);
        
        const newHistoryItem = {
          id: Date.now(),
          fileName: data.filename,
          transcription: data.transcription,
          date: new Date().toISOString(),
          duration: data.duration,
          language: data.language
        };
        
        setTranscriptionHistory(prev => [newHistoryItem, ...prev].slice(0, 10));

        // Hide success message after 3 seconds
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        setError(data.detail || 'Transcription failed. Please try again.');
      }
    } catch (err) {
      console.error('Transcription error:', err);
      setError(`Connection error. Make sure backend is running at ${API_URL}`);
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

  // Auth Modal
  if (showAuthModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob top-0 -left-4"></div>
          <div className="absolute w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000 top-0 -right-4"></div>
          <div className="absolute w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000 bottom-0 left-1/2"></div>
        </div>

        <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/20">
          <button
            onClick={() => setShowAuthModal(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {authMode === 'login' ? 'Welcome back' : 'Get started free'}
            </h2>
            <p className="text-gray-600 mt-2">
              {authMode === 'login' 
                ? 'Enter your credentials to continue' 
                : 'Create your account in seconds'}
            </p>
          </div>

          <div className="space-y-4">
            {authMode === 'signup' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {authError && (
              <div className="flex items-center space-x-2 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800 font-medium">{authError}</p>
              </div>
            )}

            <button
              onClick={handleAuth}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3.5 rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
            >
              {authMode === 'login' ? 'Sign in to your account' : 'Create free account'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'signup' : 'login');
                setAuthError('');
              }}
              className="text-purple-600 hover:text-purple-700 font-semibold text-sm"
            >
              {authMode === 'login' 
                ? "Don't have an account? Sign up free" 
                : 'Already have an account? Sign in'}
            </button>
          </div>

          <button
            onClick={() => {
              setShowAuthModal(false);
              setAuthError('');
            }}
            className="mt-4 w-full text-gray-600 hover:text-gray-800 font-medium text-sm"
          >
            Continue as guest ({FREE_LIMIT - transcriptionCount} free uses left)
          </button>
        </div>
      </div>
    );
  }

  // Main App
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <div className="bg-white rounded-2xl shadow-2xl p-4 flex items-center space-x-3 border border-green-100">
            <div className="bg-green-100 rounded-full p-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Transcription complete!</p>
              <p className="text-sm text-gray-600">Your audio has been processed</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-2 rounded-xl shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  TranscribeAI
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">Powered by Whisper</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              {isLoggedIn ? (
                <>
                  <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl">
                    <BarChart3 className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-semibold text-gray-700">
                      {usageMinutes}/{tierLimits[userTier]} min
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-xl">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{username.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">{username}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 text-gray-600 hover:text-red-600 font-medium transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Sign out</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span className="font-medium">Free:</span>
                    <span className="font-bold text-purple-600">{transcriptionCount}/{FREE_LIMIT} used</span>
                  </div>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200"
                  >
                    Get Started Free
                  </button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-600 hover:text-gray-900"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-4 space-y-3">
              {isLoggedIn ? (
                <>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                    <span className="text-sm font-medium text-gray-700">Usage</span>
                    <span className="text-sm font-bold text-purple-600">{usageMinutes}/{tierLimits[userTier]} min</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center space-x-2 text-red-600 font-medium p-3 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold"
                >
                  Get Started Free
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="flex items-center space-x-2 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('transcribe')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
              activeTab === 'transcribe'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg scale-105'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <span className="flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>Transcribe</span>
            </span>
          </button>
          {isLoggedIn && (
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <span className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>History</span>
              </span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('pricing')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
              activeTab === 'pricing'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg scale-105'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <span className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>Pricing</span>
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'transcribe' && (
              <>
                {/* Main Upload Card */}
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6">
                    <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                      <Sparkles className="w-6 h-6" />
                      <span>AI-Powered Transcription</span>
                    </h2>
                    <p className="text-purple-100 mt-2">Upload or record audio in 30+ languages</p>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Language Selector */}
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-3 flex items-center space-x-2">
                        <Globe className="w-5 h-5 text-purple-600" />
                        <span>Select Language</span>
                      </label>
                      <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 hover:bg-white transition-all font-medium text-gray-700"
                      >
                        {Object.entries(languages).map(([code, name]) => (
                          <option key={code} value={code}>
                            {name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-2 flex items-center space-x-1">
                        <Shield className="w-3 h-3" />
                        <span>Auto-detect works great for most cases</span>
                      </p>
                    </div>

                    {/* Upload Area */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="relative border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50/50 transition-all group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <Upload className="w-16 h-16 text-gray-400 group-hover:text-purple-600 mx-auto mb-4 transition-colors" />
                      <p className="text-lg font-semibold text-gray-700 group-hover:text-purple-600 transition-colors">Click to upload audio file</p>
                      <p className="text-sm text-gray-500 mt-2">MP3, WAV, M4A, WebM • Max 100MB</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>

                    {/* Divider */}
                    <div className="flex items-center justify-center space-x-4">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                      <span className="text-sm font-semibold text-gray-500">OR</span>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                    </div>

                    {/* Record Button */}
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`w-full py-4 px-6 rounded-xl font-bold transition-all flex items-center justify-center space-x-3 ${
                        isRecording
                          ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/50 hover:shadow-xl'
                          : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.02]'
                      }`}
                    >
                      <Mic className={`w-6 h-6 ${isRecording ? 'animate-pulse' : ''}`} />
                      <span className="text-lg">{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
                    </button>

                    {/* File Info */}
                    {file && (
                      <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-xl">
                        <div className="bg-green-100 rounded-full p-3">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{file.name}</p>
                          <p className="text-sm text-gray-600">{(file.size / 1024 / 1024).toFixed(2)} MB • Ready to transcribe</p>
                        </div>
                      </div>
                    )}

                    {/* Error Message */}
                    {error && (
                      <div className="flex items-start space-x-3 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl">
                        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800 font-medium">{error}</p>
                      </div>
                    )}

                    {/* Transcribe Button */}
                    <button
                      onClick={transcribeAudio}
                      disabled={!file || isProcessing}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 px-8 rounded-xl font-bold text-lg hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-3 hover:scale-[1.02] disabled:hover:scale-100 shadow-lg"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          <span>Transcribing...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-6 h-6" />
                          <span>Transcribe Audio</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Results Card */}
                {transcription && (
                  <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in">
                    <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                            <CheckCircle className="w-6 h-6" />
                            <span>Transcription Complete</span>
                          </h2>
                          {detectedLanguage && (
                            <p className="text-green-100 mt-1">Language: {detectedLanguage}</p>
                          )}
                        </div>
                        <button
                          onClick={downloadTranscription}
                          className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-semibold transition-all flex items-center space-x-2 backdrop-blur-sm"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
                        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-lg">{transcription}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'history' && isLoggedIn && (
              <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <Clock className="w-8 h-8 text-purple-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Your History</h2>
                </div>
                {transcriptionHistory.length > 0 ? (
                  <div className="space-y-4">
                    {transcriptionHistory.map((item, index) => (
                      <div key={item.id} className="group p-6 bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 border-gray-100 hover:border-purple-300 hover:shadow-lg transition-all cursor-pointer">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">{index + 1}</span>
                              </div>
                              <p className="font-bold text-gray-900">{item.fileName}</p>
                            </div>
                            <div className="flex items-center space-x-3 text-sm text-gray-500">
                              <span className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{new Date(item.date).toLocaleString()}</span>
                              </span>
                              <span>•</span>
                              <span>{item.duration} min</span>
                              {item.language && (
                                <>
                                  <span>•</span>
                                  <span>{languages[item.language] || item.language}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setTranscription(item.transcription);
                              setActiveTab('transcribe');
                            }}
                            className="bg-purple-100 text-purple-600 px-4 py-2 rounded-xl font-semibold hover:bg-purple-600 hover:text-white transition-all"
                          >
                            View
                          </button>
                        </div>
                        <p className="text-gray-600 line-clamp-2">{item.transcription}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                      <FileAudio className="w-12 h-12 text-gray-400" />
                    </div>
                    <p className="text-xl font-semibold text-gray-900 mb-2">No transcriptions yet</p>
                    <p className="text-gray-600">Upload your first audio file to get started</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'pricing' && (
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
                  <p className="text-xl text-gray-600">Choose the perfect plan for your needs</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { 
                      tier: 'free', 
                      name: 'Free', 
                      price: '$0', 
                      minutes: 15, 
                      features: ['15 minutes/month', '30+ languages', 'Basic quality', 'Email support', 'API access'],
                      color: 'from-gray-600 to-gray-700',
                      popular: false
                    },
                    { 
                      tier: 'starter', 
                      name: 'Starter', 
                      price: '$9', 
                      minutes: 300, 
                      features: ['300 minutes/month', '30+ languages', 'High quality', 'Priority support', 'API access', 'Fast processing'],
                      color: 'from-blue-600 to-blue-700',
                      popular: true
                    },
                    { 
                      tier: 'pro', 
                      name: 'Professional', 
                      price: '$29', 
                      minutes: 1000, 
                      features: ['1000 minutes/month', '30+ languages', 'Ultra quality', '24/7 support', 'API access', 'Batch processing', 'Custom vocabulary'],
                      color: 'from-purple-600 to-purple-700',
                      popular: false
                    },
                    { 
                      tier: 'enterprise', 
                      name: 'Enterprise', 
                      price: '$99', 
                      minutes: 10000, 
                      features: ['10000 minutes/month', '30+ languages', 'Ultra quality', 'Dedicated support', 'API access', 'Custom models', 'White-label option', 'SLA'],
                      color: 'from-pink-600 to-pink-700',
                      popular: false
                    }
                  ].map((plan) => (
                    <div
                      key={plan.tier}
                      className={`relative bg-white rounded-3xl border-2 transition-all hover:shadow-2xl cursor-pointer group ${
                        userTier === plan.tier
                          ? 'border-purple-600 shadow-xl scale-105'
                          : 'border-gray-200 hover:border-purple-300'
                      } ${plan.popular ? 'md:scale-105' : ''}`}
                      onClick={() => upgradeTier(plan.tier)}
                    >
                      {plan.popular && (
                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                          <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center space-x-1">
                            <Star className="w-3 h-3" />
                            <span>MOST POPULAR</span>
                          </span>
                        </div>
                      )}
                      {userTier === plan.tier && (
                        <div className="absolute -top-4 right-4">
                          <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>ACTIVE</span>
                          </span>
                        </div>
                      )}
                      
                      <div className={`bg-gradient-to-r ${plan.color} p-8 rounded-t-3xl`}>
                        <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                        <div className="flex items-baseline space-x-2">
                          <span className="text-5xl font-bold text-white">{plan.price}</span>
                          <span className="text-xl text-white/80">/month</span>
                        </div>
                        <p className="text-white/90 mt-2 font-medium">{plan.minutes} minutes included</p>
                      </div>

                      <div className="p-8">
                        <ul className="space-y-4 mb-8">
                          {plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start space-x-3">
                              <div className="bg-green-100 rounded-full p-1 mt-0.5">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </div>
                              <span className="text-gray-700 font-medium">{feature}</span>
                            </li>
                          ))}
                        </ul>
                        <button
                          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                            userTier === plan.tier
                              ? 'bg-gray-200 text-gray-500 cursor-default'
                              : 'bg-gradient-to-r ' + plan.color + ' text-white hover:shadow-xl hover:scale-105'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            upgradeTier(plan.tier);
                          }}
                        >
                          {userTier === plan.tier ? 'Current Plan' : 'Get Started'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Features Grid */}
                <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl p-8 text-white">
                  <h3 className="text-3xl font-bold mb-8 text-center">Why choose TranscribeAI?</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 inline-flex mb-4">
                        <Globe className="w-8 h-8" />
                      </div>
                      <h4 className="font-bold text-lg mb-2">30+ Languages</h4>
                      <p className="text-purple-100">Support for all major languages worldwide</p>
                    </div>
                    <div className="text-center">
                      <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 inline-flex mb-4">
                        <Zap className="w-8 h-8" />
                      </div>
                      <h4 className="font-bold text-lg mb-2">Lightning Fast</h4>
                      <p className="text-purple-100">Get your transcriptions in seconds</p>
                    </div>
                    <div className="text-center">
                      <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 inline-flex mb-4">
                        <Shield className="w-8 h-8" />
                      </div>
                      <h4 className="font-bold text-lg mb-2">Secure & Private</h4>
                      <p className="text-purple-100">Your data is encrypted and protected</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          {activeTab === 'transcribe' && (
            <div className="space-y-6">
              {/* Stats Card */}
              <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl p-6 text-white shadow-xl">
                <h3 className="font-bold text-lg mb-4 flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Your Usage</span>
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-purple-100">Minutes used</span>
                      <span className="font-bold">{usageMinutes}/{tierLimits[userTier]}</span>
                    </div>
                    <div className="bg-white/20 rounded-full h-3 overflow-hidden backdrop-blur-sm">
                      <div 
                        className="bg-white h-full rounded-full transition-all duration-500"
                        style={{ width: `${(usageMinutes / tierLimits[userTier]) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/20">
                    <div className="flex justify-between">
                      <span className="text-purple-100">Transcriptions</span>
                      <span className="font-bold">{transcriptionCount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features Card */}
              <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
                <h3 className="font-bold text-lg mb-4 text-gray-900">Features</h3>
                <div className="space-y-4">
                  {[
                    { icon: Globe, text: '30+ Languages', color: 'text-blue-600' },
                    { icon: Zap, text: 'Instant Processing', color: 'text-purple-600' },
                    { icon: Shield, text: 'Secure & Private', color: 'text-green-600' },
                    { icon: Download, text: 'Export Results', color: 'text-pink-600' }
                  ].map((feature, idx) => (
                    <div key={idx} className="flex items-center space-x-3">
                      <div className={`${feature.color} bg-opacity-10 p-2 rounded-lg`}>
                        <feature.icon className={`w-5 h-5 ${feature.color}`} />
                      </div>
                      <span className="font-medium text-gray-700">{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA Card */}
              {!isLoggedIn && (
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-xl">
                  <h3 className="font-bold text-xl mb-3">Unlock unlimited transcriptions</h3>
                  <p className="text-gray-300 mb-4 text-sm">Create an account to access premium features and save your transcriptions.</p>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="w-full bg-white text-gray-900 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all flex items-center justify-center space-x-2"
                  >
                    <span>Get Started Free</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-20">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-2 rounded-xl">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">TranscribeAI</span>
              </div>
              <p className="text-gray-400 max-w-md">
                Professional AI-powered audio transcription service. Fast, accurate, and secure transcription in 30+ languages.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 TranscribeAI. Powered by OpenAI Whisper. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
