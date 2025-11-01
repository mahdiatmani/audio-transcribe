import { useState, useEffect } from 'react';
import { Upload, FileAudio, Loader2, Download, Copy, Trash2, Clock, LogOut, CreditCard, Zap, Crown, CheckCircle } from 'lucide-react';

export default function AudioTranscriber() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [showAuth, setShowAuth] = useState(!token);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [file, setFile] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('transcribe');
  const [history, setHistory] = useState([]);
  const [plans, setPlans] = useState({});

  useEffect(() => {
    if (token) {
      fetchUser();
      fetchHistory();
      fetchPlans();
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/user', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setUser(data);
    } catch (err) {
      console.error('Failed to fetch user:', err);
      logout();
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setHistory(data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/plans');
      const data = await response.json();
      setPlans(data);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    }
  };

  const handleAuth = async () => {
    setError('');
    
    const endpoint = isLogin ? '/api/login' : '/api/register';
    
    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        setShowAuth(false);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setShowAuth(true);
  };

  const handleTranscribe = async () => {
    if (!file) {
      setError('Please select an audio file');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('audio', file);
    formData.append('language', 'auto');

    try {
      const response = await fetch('http://localhost:5000/api/transcribe', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setTranscript(data.transcript);
        fetchUser();
        fetchHistory();
      } else {
        setError(data.error || 'Transcription failed');
      }
    } catch (err) {
      setError('Failed to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan) => {
    try {
      const response = await fetch('http://localhost:5000/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan })
      });
      
      const data = await response.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (err) {
      setError('Failed to create checkout session');
    }
  };

  if (showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileAudio className="text-white" size={32} />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">TranscribeAI</h1>
            <p className="text-gray-600">Convert speech to text with AI</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                  isLogin ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                  !isLogin ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                Sign Up
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleAuth}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                {isLogin ? 'Login' : 'Create Account'}
              </button>
            </div>

            {!isLogin && (
              <p className="text-sm text-gray-500 text-center mt-4">
                Start with 10 free transcriptions per month
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <FileAudio className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">TranscribeAI</h1>
              <p className="text-xs text-gray-500">AI-Powered Transcription</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{user.email}</span>
                    {user.plan === 'free' && <Zap size={16} className="text-yellow-500" />}
                    {user.plan === 'pro' && <Crown size={16} className="text-blue-500" />}
                    {user.plan === 'enterprise' && <Crown size={16} className="text-purple-500" />}
                  </div>
                  <p className="text-xs text-gray-500">
                    {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)} Plan
                  </p>
                  {user.limit !== -1 && (
                    <p className="text-xs text-gray-600 mt-1">
                      {user.usage}/{user.limit} used this month
                    </p>
                  )}
                </div>
                <button
                  onClick={logout}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                >
                  <LogOut size={20} />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('transcribe')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'transcribe'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Transcribe
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              History
            </button>
            <button
              onClick={() => setActiveTab('pricing')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'pricing'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Pricing
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {activeTab === 'transcribe' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Usage Warning */}
            {user && user.limit !== -1 && user.usage >= user.limit * 0.8 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 font-medium">
                  ⚠️ You've used {user.usage} of {user.limit} transcriptions this month.
                  <button
                    onClick={() => setActiveTab('pricing')}
                    className="ml-2 text-blue-600 hover:underline"
                  >
                    Upgrade now
                  </button>
                </p>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Audio File</h3>
              <div
                onClick={() => document.getElementById('fileInput').click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center bg-gray-50 hover:bg-gray-100 hover:border-blue-400 transition-all cursor-pointer"
              >
                <input
                  id="fileInput"
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="hidden"
                />
                <Upload className="mx-auto text-blue-600 mb-4" size={48} />
                <p className="text-gray-900 font-semibold mb-2">Drop your audio file here</p>
                <p className="text-sm text-gray-500">or click to browse</p>
              </div>

              {file && (
                <div className="mt-6 bg-blue-50 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileAudio className="text-blue-600" size={24} />
                    <div>
                      <p className="font-semibold text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-600">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="p-2 hover:bg-red-100 rounded-lg text-red-600"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              )}

              <button
                onClick={handleTranscribe}
                disabled={!file || loading}
                className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="inline animate-spin mr-2" size={20} />
                    Processing...
                  </>
                ) : (
                  'Start Transcription'
                )}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {transcript && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Transcription Result</h3>
                <div className="bg-gray-50 rounded-lg p-6">
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{transcript}</p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(transcript)}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Copy size={18} />
                  Copy Text
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Transcription History</h3>
              {history.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-gray-500">No transcriptions yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{item.filename}</h4>
                        <span className="text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-gray-700 text-sm line-clamp-2">{item.transcript}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h2>
              <p className="text-gray-600">Upgrade anytime as your needs grow</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {Object.entries(plans).map(([key, plan]) => (
                <div
                  key={key}
                  className={`bg-white rounded-2xl shadow-lg border-2 p-8 ${
                    user?.plan === key ? 'border-blue-600' : 'border-gray-200'
                  }`}
                >
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <div className="text-4xl font-bold text-gray-900 mb-2">
                      ${plan.price}
                      <span className="text-lg text-gray-600">/mo</span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features?.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {user?.plan === key ? (
                    <button
                      disabled
                      className="w-full py-3 bg-gray-200 text-gray-600 rounded-lg font-semibold cursor-not-allowed"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(key)}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
                    >
                      {plan.price === 0 ? 'Current Plan' : 'Upgrade Now'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}