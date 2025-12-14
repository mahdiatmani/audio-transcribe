import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Upload, Loader2, Languages, ChevronDown, CheckCircle, 
  Lock, History, User, LogOut, Zap, Clock, Maximize2, X
} from 'lucide-react';
import './App.css'; // Assuming you have a basic CSS file

// ------------------------------------------------------------------
// CONFIGURATION & CONSTANTS
// ------------------------------------------------------------------

// Base API URL (e.g., http://127.0.0.1:8000 or your domain)
const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

// Languages supported by the Whisper model (with additions for your specific request)
const LANGUAGES = {
  auto: 'Detect Language',
  en: 'English',
  fr: 'French',
  ar: 'Arabic',
  es: 'Spanish (LOCKED)',
  de: 'German (LOCKED)',
  it: 'Italian (LOCKED)',
  ja: 'Japanese (LOCKED)',
  ko: 'Korean (LOCKED)',
  zh: 'Chinese (LOCKED)',
  ru: 'Russian (LOCKED)',
  pt: 'Portuguese (LOCKED)',
  tr: 'Turkish (LOCKED)',
  nl: 'Dutch (LOCKED)',
  pl: 'Polish (LOCKED)',
  sv: 'Swedish (LOCKED)',
  da: 'Danish (LOCKED)',
  fi: 'Finnish (LOCKED)',
  he: 'Hebrew (LOCKED)',
  // ... add more as needed
};

// Languages allowed for Free/Guest users (Arabic, French, English, and Auto-Detect)
const FREE_LANGS = ['auto', 'en', 'fr', 'ar'];

// ------------------------------------------------------------------
// UTILITY COMPONENTS (Icons are imported from 'lucide-react')
// ------------------------------------------------------------------

const LanguageSelector = ({ selectedLanguage, setSelectedLanguage, userTier, isLoggedIn }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  
  // Check if locked: Guest OR Free Tier
  const isLockedUser = !isLoggedIn || (isLoggedIn && userTier === 'free');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-medium transition-all"
      >
        <Languages className="w-4 h-4" />
        <span>{LANGUAGES[selectedLanguage]}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>
      
      {showDropdown && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 max-h-80 overflow-y-auto">
          {Object.entries(LANGUAGES).map(([code, name]) => {
            // Determine if THIS language option is locked for the current user
            const isOptionLocked = isLockedUser && !FREE_LANGS.includes(code);

            return (
              <button
                key={code}
                disabled={isOptionLocked}
                onClick={() => {
                  if (!isOptionLocked) {
                    setSelectedLanguage(code);
                    setShowDropdown(false);
                  }
                }}
                className={`w-full text-left px-4 py-2 flex items-center justify-between ${
                  selectedLanguage === code 
                    ? 'bg-emerald-50 text-emerald-700' 
                    : isOptionLocked 
                      ? 'text-slate-400 bg-slate-50 cursor-not-allowed' 
                      : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{name.replace(' (LOCKED)', '')}</span>
                  {/* Red Lock Icon for locked languages */}
                  {isOptionLocked && <Lock className="w-3 h-3 text-red-500" />}
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

const QuotaDisplay = ({ usage, limit, tier }) => {
  if (!usage) return null;

  const remaining = limit - usage;
  const percentageUsed = (usage / limit) * 100;
  
  let color = 'bg-emerald-500';
  if (percentageUsed > 80) color = 'bg-amber-500';
  if (percentageUsed > 95) color = 'bg-red-500';

  const resetPeriod = tier === 'free' ? 'Daily' : 'Monthly';

  return (
    <div className="w-full bg-white p-4 rounded-xl shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Zap className="w-4 h-4 text-indigo-500" />
          {resetPeriod} Quota ({tier.toUpperCase()})
        </h3>
        <p className="text-sm font-bold text-slate-800">
          {remaining} / {limit} min remaining
        </p>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full ${color}`} 
          style={{ width: `${Math.min(100, percentageUsed)}%` }}
        ></div>
      </div>
      <p className="text-xs text-slate-500 mt-2 text-right">
        Used: {usage} min ({percentageUsed.toFixed(1)}%)
      </p>
    </div>
  );
};

const HistoryPanel = ({ isVisible, onClose, history, fetchHistory, token }) => {
  useEffect(() => {
    if (isVisible && token) {
      fetchHistory();
    }
  }, [isVisible, token, fetchHistory]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <History className="w-5 h-5 text-indigo-500" />
            Transcription History
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-grow overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-slate-500 text-center py-10">No transcription history found.</p>
          ) : (
            <div className="space-y-4">
              {history.map((item) => (
                <div key={item.id} className="bg-slate-50 p-4 rounded-lg border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-indigo-600 truncate max-w-[70%]">{item.filename}</span>
                    <div className="flex items-center space-x-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Languages className="w-3 h-3" /> {item.language}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {item.duration} min
                      </span>
                      <span>{new Date(item.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <p className="text-slate-700 text-sm line-clamp-3">{item.transcription}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------
// MAIN APP COMPONENT
// ------------------------------------------------------------------

function App() {
  // Authentication & User State
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const isLoggedIn = !!token;

  // Transcription State
  const [file, setFile] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [transcriptionResult, setTranscriptionResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Quota/Usage State
  const [usageStats, setUsageStats] = useState({ usage: 0, limit: 15, remaining: 900 });

  // History State
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true); // true for login, false for signup

  // --- API Handlers ---

  const fetchUserDetails = async (authToken = token) => {
    if (!authToken) return;
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setUser(response.data.user);
      setUsageStats({
        usage: response.data.usage_minutes,
        limit: response.data.limit_minutes,
        remaining: response.data.remaining_seconds
      });
    } catch (err) {
      console.error('Failed to fetch user details:', err);
      // If token is invalid, log out
      handleLogout();
    }
  };

  const fetchHistory = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/api/transcriptions/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistory(response.data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
      // Optional: Handle token expiration errors
    }
  };

  const handleTranscribe = async () => {
    if (!file) {
      setError('Please select an audio file first.');
      return;
    }

    setLoading(true);
    setError(null);
    setTranscriptionResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', selectedLanguage);

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post(`${API_URL}/api/transcribe`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      });

      setTranscriptionResult(response.data);
      if (token) {
        // Refresh usage stats and history if logged in
        fetchUserDetails(); 
        fetchHistory();
      }

    } catch (err) {
      if (err.response) {
        // Handle Quota/Lock errors from the backend (403)
        if (err.response.status === 403) {
            setError(err.response.data.detail);
        } else {
            setError(`Error: ${err.response.data.detail || 'Transcription failed.'}`);
        }
      } else {
        setError('A network error occurred or the API is unreachable.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSubmit = async (email, password, username) => {
    try {
      const endpoint = isLogin ? 'login' : 'signup';
      const body = { email, password };
      if (!isLogin) body.username = username;

      const response = await axios.post(`${API_URL}/auth/${endpoint}`, body);
      
      const newToken = response.data.token;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setShowAuthModal(false);
      
      // Fetch user details immediately after login/signup
      fetchUserDetails(newToken); 

    } catch (err) {
      setError(`Auth Error: ${err.response?.data?.detail || 'Something went wrong.'}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setUsageStats({ usage: 0, limit: 15, remaining: 900 }); // Reset to guest state
    setHistory([]);
  };
  
  // --- Effects ---
  
  useEffect(() => {
    if (token) {
      fetchUserDetails();
      // Only fetch history if logged in
      fetchHistory(); 
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);


  // --- Sub Components ---

  const AuthModal = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [authError, setAuthError] = useState(null);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setAuthError(null);
      if (!email || !password || (!isLogin && !username)) {
        setAuthError("All fields are required.");
        return;
      }
      try {
        await handleAuthSubmit(email, password, username);
      } catch (e) {
        setAuthError(e.message);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 relative">
          <button onClick={() => setShowAuthModal(false)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-800">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold mb-4 text-slate-800">{isLogin ? 'Login' : 'Sign Up'}</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {authError && <p className="text-red-500 text-sm">{authError}</p>}
            
            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-150"
            >
              {isLogin ? 'Login' : 'Sign Up'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-500">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setAuthError(null);
              }}
              className="text-indigo-600 hover:text-indigo-800 font-medium ml-1"
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    );
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
      
      {/* Header/Nav */}
      <header className="w-full max-w-4xl flex justify-between items-center py-6">
        <h1 className="text-3xl font-extrabold text-indigo-600 flex items-center gap-2">
          <Maximize2 className="w-6 h-6" />
          VOXIFY
        </h1>
        
        {/* User Actions */}
        <div className="flex items-center space-x-3">
          {isLoggedIn && (
            <>
              <button
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-700 font-medium transition-all"
              >
                <History className="w-4 h-4" />
                History
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </>
          )}
          {!isLoggedIn && (
            <button
              onClick={() => {
                setIsLogin(true);
                setShowAuthModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all"
            >
              <User className="w-4 h-4" />
              Login / Signup
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-4xl flex-grow pt-4">
        
        {/* User Info & Quota */}
        {isLoggedIn && (
          <div className="mb-6 space-y-3">
            <h2 className="text-xl font-semibold text-slate-800">
              Welcome back, {user?.username || 'User'}!
            </h2>
            <QuotaDisplay 
              usage={usageStats.usage} 
              limit={usageStats.limit} 
              tier={user?.tier || 'free'} 
            />
          </div>
        )}
        
        {/* File Uploader */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-indigo-100">
          <h2 className="text-xl font-bold mb-4 text-slate-800">New Transcription</h2>
          
          <div className="flex justify-between items-center mb-6">
            <p className="text-sm text-slate-500">
              {file ? `File selected: ${file.name}` : 'Select an audio file (MP3, WAV, M4A, etc.)'}
            </p>
            <LanguageSelector 
              selectedLanguage={selectedLanguage} 
              setSelectedLanguage={setSelectedLanguage} 
              userTier={user?.tier || 'free'}
              isLoggedIn={isLoggedIn}
            />
          </div>

          <div 
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
              file ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400'
            }`}
          >
            <input
              type="file"
              id="file-upload"
              accept="audio/*"
              onChange={(e) => setFile(e.target.files[0])}
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
              <p className="text-indigo-600 font-semibold">
                {file ? file.name : 'Click to Upload or Drag & Drop'}
              </p>
              {file && (
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFile(null); }}
                  className="mt-2 text-xs text-red-500 hover:text-red-700"
                >
                  Clear File
                </button>
              )}
            </label>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <button
            onClick={handleTranscribe}
            disabled={!file || loading}
            className={`mt-6 w-full py-3 flex items-center justify-center gap-2 rounded-xl text-white font-semibold transition-colors ${
              !file || loading 
                ? 'bg-indigo-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Transcribing...
              </>
            ) : (
              'Start Transcription'
            )}
          </button>
        </div>

        {/* Results Panel */}
        {transcriptionResult && (
          <div className="mt-8 bg-white p-6 rounded-xl shadow-lg border border-emerald-100">
            <h2 className="text-xl font-bold mb-4 text-emerald-700 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Transcription Complete
            </h2>
            <div className="flex justify-between items-center text-sm text-slate-600 mb-3 border-b pb-2">
              <p>
                **Language Detected:** <span className="font-medium text-slate-800">{transcriptionResult.language}</span>
              </p>
              <p>
                **Duration:** <span className="font-medium text-slate-800">{transcriptionResult.duration_minutes} min</span>
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 max-h-96 overflow-y-auto">
              <p className="whitespace-pre-wrap text-slate-700">
                {transcriptionResult.transcription}
              </p>
            </div>
          </div>
        )}
      </main>
      
      {/* Modals */}
      {showAuthModal && <AuthModal />}
      {showHistory && (
        <HistoryPanel 
          isVisible={showHistory} 
          onClose={() => setShowHistory(false)} 
          history={history}
          fetchHistory={fetchHistory}
          token={token}
        />
      )}
      
    </div>
  );
}

export default App;
