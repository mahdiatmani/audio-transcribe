import React, { useState, useRef, useEffect } from 'react';
import { Upload, Mic, FileAudio, Download, Loader2, CheckCircle, AlertCircle, Zap, LogOut, User, Lock, Mail } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';


export default function AudioTranscriptionSaaS() {
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

      // Call backend API
      const response = await fetch(`${API_URL}/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        // Save token and user data
        await window.storage.set(`auth:${email}`, JSON.stringify({
          email,
          password, // Keep for local validation
          username: data.user.username,
          token: data.token, // Save JWT token from backend
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

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Get auth token from storage (if logged in)
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

      // Call YOUR backend API instead of Anthropic
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
  if (showAuthModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="bg-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-gray-600 mt-2">
              {authMode === 'login' 
                ? 'Login to continue transcribing' 
                : 'Sign up to get unlimited access'}
            </p>
          </div>

          <div className="space-y-4">
            {authMode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Your name"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {authError && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">{authError}</p>
              </div>
            )}

            <button
              onClick={handleAuth}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
            >
              {authMode === 'login' ? 'Login' : 'Sign Up'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'signup' : 'login');
                setAuthError('');
              }}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {authMode === 'login' 
                ? "Don't have an account? Sign up" 
                : 'Already have an account? Login'}
            </button>
          </div>

          <button
            onClick={() => {
              setShowAuthModal(false);
              setAuthError('');
            }}
            className="mt-4 w-full text-gray-600 hover:text-gray-800 font-medium"
          >
            Continue without login ({FREE_LIMIT - transcriptionCount} free transcriptions left)
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <FileAudio className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">TranscribeAI</h1>
            </div>
            <div className="flex items-center space-x-4">
              {isLoggedIn ? (
                <>
                  <div className="text-sm">
                    <span className="text-gray-600">Usage: </span>
                    <span className="font-semibold text-indigo-600">
                      {usageMinutes}/{tierLimits[userTier]} min
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">{username}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1 text-red-600 hover:text-red-700 font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="text-sm">
                    <span className="text-gray-600">Free: </span>
                    <span className="font-semibold text-indigo-600">
                      {transcriptionCount}/{FREE_LIMIT} used
                    </span>
                  </div>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Login / Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-1 mb-6 inline-flex space-x-1">
          <button
            onClick={() => setActiveTab('transcribe')}
            className={`px-6 py-2 rounded-md font-medium transition-all ${
              activeTab === 'transcribe'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Transcribe
          </button>
          {isLoggedIn && (
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              History
            </button>
          )}
          <button
            onClick={() => setActiveTab('pricing')}
            className={`px-6 py-2 rounded-md font-medium transition-all ${
              activeTab === 'pricing'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pricing
          </button>
        </div><div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'transcribe' && (
              <>
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Audio</h2>
                  
                  <div className="space-y-4">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors"
                    >
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium">Click to upload audio file</p>
                      <p className="text-sm text-gray-500 mt-1">MP3, WAV, M4A, WebM (max 100MB)</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>

                    <div className="flex items-center justify-center space-x-4">
                      <div className="flex-1 h-px bg-gray-300"></div>
                      <span className="text-gray-500 text-sm">OR</span>
                      <div className="flex-1 h-px bg-gray-300"></div>
                    </div>

                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                        isRecording
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      <Mic className="w-5 h-5" />
                      <span>{isRecording ? 'Stop Recording' : 'Record Audio'}</span>
                    </button>

                    {file && (
                      <div className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-green-900 truncate">{file.name}</p>
                          <p className="text-xs text-green-700">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    )}

                    <button
                      onClick={transcribeAudio}
                      disabled={!file || isProcessing}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Transcribing...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5" />
                          <span>Transcribe Audio</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {transcription && (
                  <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold text-gray-900">Transcription</h2>
                      <button
                        onClick={downloadTranscription}
                        className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        <Download className="w-5 h-5" />
                        <span>Download</span>
                      </button>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{transcription}</p>
                    </div>
                  </div>
                )}
              </>
            )}{activeTab === 'history' && isLoggedIn && (
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Transcription History</h2>
                {transcriptionHistory.length > 0 ? (
                  <div className="space-y-3">
                    {transcriptionHistory.map((item) => (
                      <div key={item.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.fileName}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(item.date).toLocaleString()} • {item.duration} min
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setTranscription(item.transcription);
                              setActiveTab('transcribe');
                            }}
                            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                          >
                            View
                          </button>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-3">{item.transcription}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileAudio className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No transcriptions yet</p>
                    <p className="text-sm text-gray-500 mt-1">Upload an audio file to get started</p>
                  </div>
                )}
              </div>
            )}{activeTab === 'pricing' && (
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Choose Your Plan</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { 
                      tier: 'free', 
                      name: 'Free', 
                      price: '$0', 
                      minutes: 15, 
                      features: ['15 min/month', 'Basic quality', 'Email support', 'Standard processing'],
                      color: 'gray'
                    },
                    { 
                      tier: 'starter', 
                      name: 'Starter', 
                      price: '$9', 
                      minutes: 300, 
                      features: ['300 min/month', 'High quality', 'Priority support', 'API access', 'Fast processing'],
                      color: 'blue',
                      popular: true
                    },
                    { 
                      tier: 'pro', 
                      name: 'Pro', 
                      price: '$29', 
                      minutes: 1000, 
                      features: ['1000 min/month', 'Ultra quality', '24/7 support', 'API access', 'Custom vocabulary', 'Batch processing'],
                      color: 'purple'
                    },
                    { 
                      tier: 'enterprise', 
                      name: 'Enterprise', 
                      price: '$99', 
                      minutes: 10000, 
                      features: ['10000 min/month', 'Ultra quality', 'Dedicated support', 'API access', 'Custom models', 'White-label option'],
                      color: 'indigo'
                    }
                  ].map((plan) => (
                    <div
                      key={plan.tier}
                      className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all ${
                        userTier === plan.tier
                          ? 'border-indigo-600 bg-indigo-50 shadow-lg'
                          : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
                      }`}
                      onClick={() => upgradeTier(plan.tier)}
                    >
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                            POPULAR
                          </span>
                        </div>
                      )}
                      {userTier === plan.tier && (
                        <div className="absolute -top-3 right-4">
                          <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>CURRENT</span>
                          </span>
                        </div>
                      )}
                      <div className="text-center mb-4">
                        <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                        <div className="mt-2">
                          <span className="text-4xl font-bold text-indigo-600">{plan.price}</span>
                          <span className="text-gray-600">/month</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">{plan.minutes} minutes included</p>
                      </div>
                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start space-x-2">
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <button
                        className={`w-full py-3 rounded-lg font-semibold transition-all ${
                          userTier === plan.tier
                            ? 'bg-gray-300 text-gray-600 cursor-default'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          upgradeTier(plan.tier);
                        }}
                      >
                        {userTier === plan.tier ? 'Current Plan' : 'Select Plan'}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white">
                  <h3 className="text-xl font-semibold mb-2">Need More?</h3>
                  <p className="text-indigo-100 mb-4">
                    For custom enterprise solutions, API integration, or volume discounts, contact our sales team.
                  </p>
                  <button className="bg-white text-indigo-600 px-6 py-2 rounded-lg font-medium hover:bg-indigo-50 transition-colors">
                    Contact Sales
                  </button>
                </div>
              </div>
            )}
          </div>

          {activeTab === 'transcribe' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Pricing</h2>
                <div className="space-y-3">
                  {[
                    { tier: 'free', name: 'Free', price: '$0', minutes: 15, features: ['15 min/month', 'Basic quality', 'Email support'] },
                    { tier: 'starter', name: 'Starter', price: '$9', minutes: 300, features: ['300 min/month', 'High quality', 'Priority support', 'API access'] },
                    { tier: 'pro', name: 'Pro', price: '$29', minutes: 1000, features: ['1000 min/month', 'Ultra quality', '24/7 support', 'API access', 'Custom vocabulary'] },
                    { tier: 'enterprise', name: 'Enterprise', price: '$99', minutes: 10000, features: ['10000 min/month', 'Ultra quality', 'Dedicated support', 'API access', 'Custom models'] }
                  ].map((plan) => (
                    <div
                      key={plan.tier}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        userTier === plan.tier
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-300'
                      }`}
                      onClick={() => upgradeTier(plan.tier)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                          <p className="text-sm text-gray-600">{plan.minutes} min/month</p>
                        </div>
                        <span className="text-2xl font-bold text-indigo-600">{plan.price}</span>
                      </div>
                      <ul className="space-y-1">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="text-xs text-gray-600 flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-md p-6 text-white">
                <h3 className="font-semibold text-lg mb-2">Need API Access?</h3>
                <p className="text-sm text-indigo-100 mb-4">
                  Integrate our transcription API into your apps. Starting at $0.10/minute.
                </p>
                <button className="w-full bg-white text-indigo-600 py-2 px-4 rounded-lg font-medium hover:bg-indigo-50 transition-colors">
                  View API Docs
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
