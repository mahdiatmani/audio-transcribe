import React, { useState, useEffect } from 'react';
import { contentfulClient, transformContentfulPost } from './contentfulConfig';
import { 
  Mic, FileText, Image, Video, Bot, Sparkles, Zap, Shield, Globe,
  ArrowRight, ExternalLink, Menu, X, ChevronRight, Clock, User, 
  Tag, Search, Mail, Twitter, Github, Linkedin, Youtube,
  Cpu, Wand2, MessageSquare, BarChart3, Code, Layers,
  Lock, Plus, Trash2, Edit, Save, Eye, EyeOff, LogOut, Calendar
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const SITE_CONFIG = {
  name: 'AI Need Tools',
  tagline: 'Your Hub for AI-Powered Solutions',
  domain: 'ai-need-tools.online',
};

// ⚠️ CHANGE THIS SECRET PATH AND CREDENTIALS! ⚠️
const ADMIN_CONFIG = {
  secretPath: 'dashboard-x7k9m2', // Access via: yoursite.com/#/dashboard-x7k9m2
  username: 'admin',
  password: 'AiTools2024!Secure', // CHANGE THIS!
};

// AI Tools Data
const AI_TOOLS = [
  {
    id: 'voxify',
    name: 'Voxify',
    description: 'Professional AI-powered audio transcription. Transform audio into perfect text in seconds with support for 30+ languages.',
    icon: Mic,
    url: 'https://voxify.ai-need-tools.online',
    color: 'from-emerald-400 to-teal-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    status: 'live',
    features: ['30+ Languages', 'Real-time', 'High Accuracy'],
    category: 'Audio',
  },
  {
    id: 'contentai',
    name: 'ContentAI',
    description: 'Generate high-quality blog posts, articles, and marketing copy with advanced AI that understands your brand voice.',
    icon: FileText,
    url: '#',
    color: 'from-violet-400 to-purple-500',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/20',
    status: 'coming-soon',
    features: ['SEO Optimized', 'Brand Voice', 'Multi-format'],
    category: 'Content',
  },
  {
    id: 'imagecraft',
    name: 'ImageCraft',
    description: 'Create stunning AI-generated images from text descriptions. Perfect for marketing, social media, and creative projects.',
    icon: Image,
    url: '#',
    color: 'from-pink-400 to-rose-500',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/20',
    status: 'coming-soon',
    features: ['HD Quality', 'Style Transfer', 'Batch Generation'],
    category: 'Image',
  },
  {
    id: 'videoai',
    name: 'VideoAI',
    description: 'Automatically edit, enhance, and generate video content using cutting-edge AI technology.',
    icon: Video,
    url: '#',
    color: 'from-orange-400 to-amber-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    status: 'coming-soon',
    features: ['Auto-edit', 'Subtitles', 'Enhancement'],
    category: 'Video',
  },
  {
    id: 'chatbot',
    name: 'ChatBot Pro',
    description: 'Deploy intelligent chatbots for customer support, lead generation, and automated assistance.',
    icon: MessageSquare,
    url: '#',
    color: 'from-cyan-400 to-blue-500',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
    status: 'coming-soon',
    features: ['24/7 Support', 'Multi-platform', 'Analytics'],
    category: 'Automation',
  },
  {
    id: 'datainsight',
    name: 'DataInsight',
    description: 'Transform raw data into actionable insights with AI-powered analytics and visualization.',
    icon: BarChart3,
    url: '#',
    color: 'from-green-400 to-emerald-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    status: 'coming-soon',
    features: ['Auto-analysis', 'Predictions', 'Reports'],
    category: 'Analytics',
  },
];

// Default Blog Posts
const DEFAULT_BLOG_POSTS = [
  {
    id: 1,
    title: 'The Future of AI-Powered Transcription: What to Expect in 2025',
    excerpt: 'Discover how AI transcription technology is evolving and what new features will revolutionize the way we convert speech to text.',
    content: `Artificial intelligence has transformed the transcription industry dramatically over the past few years. As we look ahead to 2025, several exciting developments are on the horizon that will further revolutionize how we convert speech to text.

## Key Trends to Watch

### 1. Real-time Accuracy Improvements
AI models are becoming increasingly accurate, with error rates dropping below 5% for most languages. This means more reliable transcriptions with less need for manual correction.

### 2. Multi-speaker Recognition
Advanced speaker diarization will make it easier to identify and separate multiple speakers in a single recording, perfect for meetings and interviews.

### 3. Emotion and Tone Detection
Future transcription tools will not only capture what was said but also how it was said, including emotional context and tone.

### 4. Integration with AI Assistants
Expect seamless integration with AI assistants that can summarize, translate, and act on transcribed content automatically.

## Conclusion

The future of AI transcription is bright, and tools like Voxify are at the forefront of these innovations. Stay tuned for more updates as we continue to improve our service.`,
    category: 'AI Trends',
    author: 'AI Need Tools Team',
    date: '2024-12-10',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop',
    slug: 'future-of-ai-transcription-2025',
    published: true,
  },
  {
    id: 2,
    title: 'How to Choose the Right AI Tool for Your Business',
    excerpt: 'A comprehensive guide to evaluating and selecting AI tools that will actually drive results for your specific use case.',
    content: `Choosing the right AI tool for your business can be overwhelming given the vast number of options available today. This guide will help you navigate the decision-making process.

## Step 1: Define Your Goals

Before exploring AI tools, clearly define what you want to achieve:
- Increase productivity?
- Reduce costs?
- Improve customer experience?
- Automate repetitive tasks?

## Step 2: Evaluate Your Technical Requirements

Consider your team's technical capabilities:
- Do you need a no-code solution?
- What integrations are required?
- What's your data security requirement?

## Step 3: Compare Features and Pricing

Create a comparison matrix of potential tools:
- Core features
- Pricing structure
- Scalability
- Support options

## Step 4: Test Before You Commit

Always take advantage of free trials or demos. Most reputable AI tools, including Voxify, offer free tiers to test the service.

## Conclusion

The right AI tool can transform your business operations. Take your time to evaluate options and choose wisely.`,
    category: 'Guides',
    author: 'AI Need Tools Team',
    date: '2024-12-08',
    readTime: '8 min read',
    image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=400&fit=crop',
    slug: 'choose-right-ai-tool-business',
    published: true,
  },
  {
    id: 3,
    title: '10 Ways AI is Transforming Content Creation',
    excerpt: 'From writing assistance to image generation, explore how artificial intelligence is reshaping the creative landscape.',
    content: `Artificial intelligence is revolutionizing content creation in ways we never imagined. Here are 10 significant ways AI is transforming the creative landscape.

## 1. Automated Writing Assistance
AI writing tools help create blog posts, social media content, and marketing copy faster than ever.

## 2. Image Generation
Tools like DALL-E and Midjourney create stunning visuals from text descriptions.

## 3. Video Editing Automation
AI can automatically edit videos, add captions, and even generate video content from scripts.

## 4. Audio Transcription
Services like Voxify convert speech to text with remarkable accuracy.

## 5. Translation Services
AI-powered translation makes content accessible to global audiences instantly.

## 6. SEO Optimization
AI analyzes and optimizes content for search engines automatically.

## 7. Personalization
AI tailors content to individual user preferences and behaviors.

## 8. Voice Synthesis
AI can generate natural-sounding voiceovers for videos and podcasts.

## 9. Content Curation
AI helps discover and recommend relevant content for your audience.

## 10. Analytics and Insights
AI provides deep insights into content performance and audience engagement.

## The Future

As AI continues to evolve, we can expect even more innovative tools to emerge. The key is to embrace these technologies while maintaining the human creativity that makes content truly engaging.`,
    category: 'AI Trends',
    author: 'AI Need Tools Team',
    date: '2024-12-05',
    readTime: '6 min read',
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&h=400&fit=crop',
    slug: 'ai-transforming-content-creation',
    published: true,
  },
];

// Local Storage Helpers
const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
};

// Logo Component
const Logo = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <defs>
      <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0a0a0f" />
        <stop offset="100%" stopColor="#1a1a2e" />
      </linearGradient>
      <linearGradient id="logoGlow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00d4ff" />
        <stop offset="50%" stopColor="#b400ff" />
        <stop offset="100%" stopColor="#ff00d4" />
      </linearGradient>
    </defs>
    <rect width="64" height="64" rx="14" fill="url(#logoBg)"/>
    <rect x="2" y="2" width="60" height="60" rx="12" fill="none" stroke="url(#logoGlow)" strokeWidth="1.5" opacity="0.6"/>
    <g fill="none" stroke="url(#logoGlow)" strokeWidth="2" strokeLinecap="round">
      <circle cx="32" cy="32" r="8" fill="url(#logoGlow)" opacity="0.2"/>
      <circle cx="32" cy="32" r="8"/>
      <path d="M32 24 L32 16"/><path d="M32 40 L32 48"/><path d="M24 32 L16 32"/><path d="M40 32 L48 32"/>
      <path d="M26 26 L20 20"/><path d="M38 26 L44 20"/><path d="M26 38 L20 44"/><path d="M38 38 L44 44"/>
      <circle cx="32" cy="16" r="3" fill="url(#logoGlow)"/><circle cx="32" cy="48" r="3" fill="url(#logoGlow)"/>
      <circle cx="16" cy="32" r="3" fill="url(#logoGlow)"/><circle cx="48" cy="32" r="3" fill="url(#logoGlow)"/>
      <circle cx="20" cy="20" r="2.5" fill="url(#logoGlow)"/><circle cx="44" cy="20" r="2.5" fill="url(#logoGlow)"/>
      <circle cx="20" cy="44" r="2.5" fill="url(#logoGlow)"/><circle cx="44" cy="44" r="2.5" fill="url(#logoGlow)"/>
    </g>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  
  // Blog posts state
  const [blogPosts, setBlogPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);  
  // Admin state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);

  const categories = ['all', ...new Set(AI_TOOLS.map(tool => tool.category))];
  const filteredTools = selectedCategory === 'all' ? AI_TOOLS : AI_TOOLS.filter(tool => tool.category === selectedCategory);
  const publishedPosts = blogPosts.filter(post => post.published);

  // Fetch blog posts from Contentful
  useEffect(() => {
    fetchContentfulPosts();
  }, []);

  const fetchContentfulPosts = async () => {
    try {
      setLoadingPosts(true);
      const response = await contentfulClient.getEntries({
        content_type: 'blogPost',
        order: '-sys.createdAt',
      });
      
      const transformedPosts = response.items.map(transformContentfulPost);
      setBlogPosts(transformedPosts);
      console.log('✅ Loaded posts from Contentful:', transformedPosts.length);
    } catch (error) {
      console.error('❌ Error fetching from Contentful:', error);
      // Fallback to default posts if Contentful fails
      setBlogPosts(DEFAULT_BLOG_POSTS);
    } finally {
      setLoadingPosts(false);
    }
  };

  // Check URL hash for admin
  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash.slice(2);
      if (hash === ADMIN_CONFIG.secretPath) setCurrentPage('admin');
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) { setSubscribed(true); setEmail(''); setTimeout(() => setSubscribed(false), 3000); }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminUsername === ADMIN_CONFIG.username && adminPassword === ADMIN_CONFIG.password) {
      setIsAdminLoggedIn(true); setAdminError(''); setAdminUsername(''); setAdminPassword('');
    } else { setAdminError('Invalid credentials'); }
  };

  const handleAdminLogout = () => { setIsAdminLoggedIn(false); setCurrentPage('home'); window.location.hash = ''; };

  const createPost = (postData) => {
    const newPost = { ...postData, id: Date.now(), date: new Date().toISOString().split('T')[0], slug: postData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') };
    setBlogPosts([newPost, ...blogPosts]); setIsCreatingPost(false);
  };

  const updatePost = (postId, postData) => { setBlogPosts(blogPosts.map(post => post.id === postId ? { ...post, ...postData } : post)); setEditingPost(null); };
  const deletePost = (postId) => { if (window.confirm('Delete this post?')) setBlogPosts(blogPosts.filter(post => post.id !== postId)); };
  const togglePublish = (postId) => { setBlogPosts(blogPosts.map(post => post.id === postId ? { ...post, published: !post.published } : post)); };

  // Navigation
  const Navigation = () => (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-xl border-b border-dark-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { setCurrentPage('home'); setSelectedPost(null); }}>
            <Logo size={36} />
            <span className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">AI Need Tools</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {['home', 'tools', 'blog', 'about'].map(page => (
              <button key={page} onClick={() => { setCurrentPage(page); setSelectedPost(null); }}
                className={`text-sm font-medium transition-colors capitalize ${currentPage === page ? 'text-cyan-400' : 'text-gray-400 hover:text-white'}`}>
                {page === 'tools' ? 'AI Tools' : page}
              </button>
            ))}
          </div>
          <div className="hidden md:block">
            <a href="https://voxify.ai-need-tools.online" target="_blank" rel="noopener noreferrer"
              className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold rounded-full hover:from-cyan-400 hover:to-blue-400 transition-all">
              Try Voxify Free
            </a>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-gray-400 hover:text-white">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden bg-gray-900 border-t border-gray-800 p-4 space-y-4">
          {['home', 'tools', 'blog', 'about'].map(page => (
            <button key={page} onClick={() => { setCurrentPage(page); setMobileMenuOpen(false); }}
              className="block w-full text-left py-2 text-gray-300 hover:text-cyan-400 capitalize">
              {page === 'tools' ? 'AI Tools' : page}
            </button>
          ))}
          <a href="https://voxify.ai-need-tools.online" className="block w-full text-center py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl">Try Voxify Free</a>
        </div>
      )}
    </nav>
  );

  // Hero Section
  const HeroSection = () => (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" style={{ animation: 'float 6s ease-in-out infinite' }}></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" style={{ animation: 'float 6s ease-in-out infinite', animationDelay: '3s' }}></div>
      
      <div className="relative max-w-7xl mx-auto px-4 text-center py-20">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/80 border border-gray-700 rounded-full text-sm text-gray-300 mb-8">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Discover the Power of AI</span>
          <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs font-semibold rounded-full">NEW</span>
        </div>
        
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-6">
          <span className="text-white">AI Tools for</span><br />
          <span className="bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">Every Need</span>
        </h1>
        
        <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          Your central hub for powerful AI-powered tools. From transcription to content creation, we bring you the best AI solutions.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={() => setCurrentPage('tools')}
            className="group px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-full hover:from-cyan-400 hover:to-blue-400 transition-all flex items-center justify-center gap-2">
            Explore AI Tools <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <a href="https://voxify.ai-need-tools.online" target="_blank" rel="noopener noreferrer"
            className="px-8 py-4 bg-gray-800 border border-gray-700 text-white font-semibold rounded-full hover:bg-gray-700 transition-all flex items-center justify-center gap-2">
            <Mic className="w-5 h-5 text-emerald-400" /> Try Voxify Now <ExternalLink className="w-4 h-4 opacity-50" />
          </a>
        </div>
        
        <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mt-20">
          {[{ val: '6+', label: 'AI Tools' }, { val: '30+', label: 'Languages' }, { val: '99%', label: 'Accuracy' }].map((stat, i) => (
            <div key={i}><div className="text-3xl sm:text-4xl font-bold text-white">{stat.val}</div><div className="text-sm text-gray-500">{stat.label}</div></div>
          ))}
        </div>
      </div>
    </section>
  );

  // Tool Card
  const ToolCard = ({ tool }) => {
    const Icon = tool.icon;
    const isLive = tool.status === 'live';
    const iconColor = tool.color.includes('emerald') ? '#34d399' : tool.color.includes('violet') ? '#a78bfa' : tool.color.includes('pink') ? '#f472b6' : tool.color.includes('orange') ? '#fb923c' : tool.color.includes('cyan') ? '#22d3ee' : '#4ade80';
    
    return (
      <div className={`group relative bg-gray-800/50 border ${tool.borderColor} rounded-2xl p-6 hover:translate-y-[-4px] transition-all`}>
        <div className="absolute top-4 right-4">
          {isLive ? (
            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>LIVE
            </span>
          ) : <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs font-semibold rounded-full">COMING SOON</span>}
        </div>
        <div className={`w-14 h-14 ${tool.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
          <Icon className="w-7 h-7" style={{ color: iconColor }} />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{tool.name}</h3>
        <p className="text-gray-400 text-sm mb-4 line-clamp-2">{tool.description}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {tool.features.map((f, i) => <span key={i} className="px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded-lg">{f}</span>)}
        </div>
        {isLive ? (
          <a href={tool.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300">
            Launch Tool <ExternalLink className="w-4 h-4" />
          </a>
        ) : <span className="text-sm text-gray-500">Coming Soon <ChevronRight className="w-4 h-4 inline" /></span>}
      </div>
    );
  };

  // Tools Section
  const ToolsSection = ({ showAll = false }) => (
    <section className={`py-20 ${!showAll ? 'bg-gray-800/30' : ''}`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <span className="text-cyan-400 text-sm font-semibold uppercase tracking-wider">Our Tools</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mt-2 mb-4">Powerful AI Tools</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">Discover our collection of AI-powered tools designed to boost your productivity.</p>
        </div>
        {showAll && (
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === cat ? 'bg-cyan-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(showAll ? filteredTools : AI_TOOLS.slice(0, 3)).map(tool => <ToolCard key={tool.id} tool={tool} />)}
        </div>
        {!showAll && (
          <div className="text-center mt-10">
            <button onClick={() => setCurrentPage('tools')} className="px-6 py-3 bg-gray-800 border border-gray-700 text-white rounded-full hover:bg-gray-700 inline-flex items-center gap-2">
              View All Tools <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );

  // Blog Card
  const BlogCard = ({ post, onClick }) => (
    <article onClick={onClick} className="group bg-gray-800/50 border border-gray-700 rounded-2xl overflow-hidden cursor-pointer hover:translate-y-[-4px] transition-all">
      <div className="relative h-48 overflow-hidden">
        <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent"></div>
        <span className="absolute bottom-3 left-3 px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs font-semibold rounded-lg">{post.category}</span>
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors line-clamp-2">{post.title}</h3>
        <p className="text-gray-400 text-sm mb-4 line-clamp-2">{post.excerpt}</p>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.readTime}</span>
            <span>{post.date}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </article>
  );

  // Blog Post View
  const BlogPostView = ({ post }) => (
    <div className="min-h-screen pt-24">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <button onClick={() => setSelectedPost(null)} className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 mb-8">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back to Blog
        </button>
        <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden mb-8">
          <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
        </div>
        <div className="flex items-center gap-4 mb-6">
          <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 text-sm font-semibold rounded-lg">{post.category}</span>
          <span className="text-gray-500 text-sm flex items-center gap-1"><Clock className="w-4 h-4" />{post.readTime}</span>
          <span className="text-gray-500 text-sm flex items-center gap-1"><Calendar className="w-4 h-4" />{post.date}</span>
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">{post.title}</h1>
        <div className="flex items-center gap-3 mb-8 pb-8 border-b border-gray-700">
          <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center"><User className="w-5 h-5 text-white" /></div>
          <div><p className="text-white font-medium">{post.author}</p><p className="text-gray-500 text-sm">Author</p></div>
        </div>
        <div 
          className="prose prose-invert max-w-none prose-headings:text-white prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-xl prose-h3:font-bold prose-h3:mt-6 prose-h3:mb-3 prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-4 prose-ul:list-disc prose-ul:list-inside prose-ul:space-y-2 prose-ul:text-gray-300 prose-ul:mb-4 prose-li:text-gray-300"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

  // Blog Section
  // Blog Section
  const BlogSection = ({ showAll = false }) => (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <span className="text-purple-400 text-sm font-semibold uppercase tracking-wider">Blog</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mt-2 mb-4">Latest Insights</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">Stay updated with the latest trends, tips, and news in the world of AI.</p>
        </div>
        
        {loadingPosts ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 mt-4">Loading posts from Contentful...</p>
          </div>
        ) : publishedPosts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No blog posts available yet.</p>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(showAll ? publishedPosts : publishedPosts.slice(0, 3)).map(post => (
                <BlogCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
              ))}
            </div>
            {!showAll && publishedPosts.length > 3 && (
              <div className="text-center mt-10">
                <button onClick={() => setCurrentPage('blog')} className="px-6 py-3 bg-gray-800 border border-gray-700 text-white rounded-full hover:bg-gray-700 inline-flex items-center gap-2">
                  Read More <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );

  // Features Section
  const FeaturesSection = () => (
    <section className="py-20 bg-gray-800/30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <span className="text-pink-400 text-sm font-semibold uppercase tracking-wider">Why Choose Us</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mt-2">Built for the Future</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Zap, title: 'Lightning Fast', desc: 'Process data in seconds', color: 'text-yellow-400' },
            { icon: Shield, title: 'Secure & Private', desc: 'Enterprise-grade security', color: 'text-emerald-400' },
            { icon: Globe, title: 'Multi-language', desc: '30+ languages supported', color: 'text-blue-400' },
            { icon: Cpu, title: 'Advanced AI', desc: 'Cutting-edge ML models', color: 'text-purple-400' },
          ].map((f, i) => (
            <div key={i} className="text-center p-6">
              <div className={`w-14 h-14 mx-auto mb-4 rounded-xl bg-gray-700/50 flex items-center justify-center ${f.color}`}><f.icon className="w-7 h-7" /></div>
              <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  // Newsletter
  const NewsletterSection = () => (
    <section className="py-20">
      <div className="max-w-4xl mx-auto px-4">
        <div className="relative bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 border border-gray-700 rounded-3xl p-8 sm:p-12 overflow-hidden">
          <div className="relative text-center">
            <Mail className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Stay in the Loop</h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">Get the latest AI tools, tips, and exclusive offers delivered to your inbox.</p>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email"
                className="flex-1 px-5 py-3 bg-gray-800 border border-gray-600 rounded-full text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500" required />
              <button type="submit" className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-full hover:from-cyan-400 hover:to-blue-400">Subscribe</button>
            </form>
            {subscribed && <p className="mt-4 text-emerald-400 text-sm">✓ Thanks for subscribing!</p>}
          </div>
        </div>
      </div>
    </section>
  );

  // About Page
  const AboutPage = () => (
    <div className="min-h-screen pt-24">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <span className="text-cyan-400 text-sm font-semibold uppercase tracking-wider">About Us</span>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mt-2 mb-6">Empowering Through AI</h1>
          <p className="text-xl text-gray-300">We're on a mission to make powerful AI tools accessible to everyone.</p>
        </div>
        <div className="space-y-8">
          {[
            { icon: Bot, color: 'text-cyan-400', title: 'Our Mission', content: 'At AI Need Tools, we believe that artificial intelligence should be accessible, affordable, and easy to use for everyone.' },
            { icon: Layers, color: 'text-purple-400', title: 'What We Offer', content: 'Our growing collection of AI tools covers transcription, content generation, image creation, and much more.' },
            { icon: Mail, color: 'text-pink-400', title: 'Get In Touch', content: 'Have questions? Reach out at contact@ai-need-tools.online' },
          ].map((section, i) => (
            <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <section.icon className={`w-8 h-8 ${section.color}`} /> {section.title}
              </h2>
              <p className="text-gray-300 leading-relaxed">{section.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Admin Login
  const AdminLoginPage = () => (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-900">
      <div className="w-full max-w-md">
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Admin Login</h1>
            <p className="text-gray-400 text-sm mt-2">Enter your credentials</p>
          </div>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
              <input type="text" value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white focus:outline-none focus:border-cyan-500" placeholder="Username" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white focus:outline-none focus:border-cyan-500 pr-12" placeholder="Password" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            {adminError && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{adminError}</div>}
            <button type="submit" className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:from-cyan-400 hover:to-blue-400">Login</button>
          </form>
          <button onClick={() => { setCurrentPage('home'); window.location.hash = ''; }}
            className="w-full mt-4 py-3 border border-gray-600 text-gray-400 rounded-xl hover:bg-gray-700 hover:text-white">Back to Home</button>
        </div>
      </div>
    </div>
  );

  // Blog Editor
  const BlogEditor = ({ post, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
      title: post?.title || '', excerpt: post?.excerpt || '', content: post?.content || '',
      category: post?.category || 'AI Trends', author: post?.author || 'AI Need Tools Team',
      readTime: post?.readTime || '5 min read', image: post?.image || 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop',
      published: post?.published ?? false,
    });
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-6">{post ? 'Edit Post' : 'Create New Post'}</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
            <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white focus:border-cyan-500" required /></div>
          <div><label className="block text-sm font-medium text-gray-300 mb-2">Excerpt</label>
            <textarea value={formData.excerpt} onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white resize-none focus:border-cyan-500" rows="2" required /></div>
          <div><label className="block text-sm font-medium text-gray-300 mb-2">Content (Markdown)</label>
            <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white resize-none font-mono text-sm focus:border-cyan-500" rows="12" required /></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white focus:border-cyan-500">
                {['AI Trends', 'Guides', 'Tutorials', 'News', 'Product Updates'].map(c => <option key={c}>{c}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-2">Read Time</label>
              <input type="text" value={formData.readTime} onChange={(e) => setFormData({ ...formData, readTime: e.target.value })}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white focus:border-cyan-500" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-300 mb-2">Image URL</label>
            <input type="url" value={formData.image} onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white focus:border-cyan-500" required /></div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="published" checked={formData.published} onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
              className="w-5 h-5 rounded bg-gray-900 border-gray-600 text-cyan-500" />
            <label htmlFor="published" className="text-gray-300">Publish immediately</label>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="submit" className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2">
              <Save className="w-5 h-5" /> Save Post</button>
            <button type="button" onClick={onCancel} className="px-6 py-3 border border-gray-600 text-gray-400 rounded-xl hover:bg-gray-700 hover:text-white">Cancel</button>
          </div>
        </form>
      </div>
    );
  };

  // Admin Dashboard
  const AdminDashboard = () => (
    <div className="min-h-screen pt-20 pb-12 bg-gray-900">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div><h1 className="text-2xl font-bold text-white">Admin Dashboard</h1><p className="text-gray-400">Manage your blog posts</p></div>
          <div className="flex items-center gap-4">
            <button onClick={() => { setCurrentPage('home'); window.location.hash = ''; }} className="text-gray-400 hover:text-white">View Site</button>
            <button onClick={handleAdminLogout} className="px-4 py-2 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Logout</button>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {[{ val: blogPosts.length, label: 'Total Posts', color: 'text-white' }, { val: publishedPosts.length, label: 'Published', color: 'text-emerald-400' }, { val: blogPosts.length - publishedPosts.length, label: 'Drafts', color: 'text-amber-400' }].map((s, i) => (
            <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
              <div className={`text-3xl font-bold ${s.color}`}>{s.val}</div><div className="text-gray-400 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
        {isCreatingPost ? <BlogEditor onSave={createPost} onCancel={() => setIsCreatingPost(false)} />
        : editingPost ? <BlogEditor post={editingPost} onSave={(data) => updatePost(editingPost.id, data)} onCancel={() => setEditingPost(null)} />
        : (
          <>
            <button onClick={() => setIsCreatingPost(true)}
              className="w-full mb-6 py-4 bg-gray-800/50 border-2 border-dashed border-gray-600 rounded-xl text-gray-400 hover:text-cyan-400 hover:border-cyan-500/50 flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" /> Create New Post
            </button>
            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700"><h2 className="text-lg font-bold text-white">All Posts</h2></div>
              <div className="divide-y divide-gray-700">
                {blogPosts.map(post => (
                  <div key={post.id} className="p-4 hover:bg-gray-700/30">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white truncate">{post.title}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${post.published ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {post.published ? 'Published' : 'Draft'}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm truncate">{post.excerpt}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500"><span>{post.category}</span><span>•</span><span>{post.date}</span></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => togglePublish(post.id)} className={`p-2 rounded-lg ${post.published ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-gray-500 hover:bg-gray-600'}`}>
                          {post.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setEditingPost(post)} className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-gray-600 rounded-lg"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => deletePost(post.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // Footer
  const Footer = () => (
    <footer className="bg-gray-900 border-t border-gray-800 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-4"><Logo size={32} /><span className="text-lg font-bold text-white">AI Need Tools</span></div>
            <p className="text-gray-400 text-sm mb-4">Your hub for AI-powered tools and solutions.</p>
            <div className="flex gap-3">
              {[Twitter, Github, Linkedin, Youtube].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 hover:text-cyan-400 hover:bg-gray-700">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">AI Tools</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="https://voxify.ai-need-tools.online" className="text-gray-400 hover:text-cyan-400">Voxify</a></li>
              <li><span className="text-gray-500">ContentAI (Soon)</span></li>
              <li><span className="text-gray-500">ImageCraft (Soon)</span></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => setCurrentPage('about')} className="text-gray-400 hover:text-cyan-400">About</button></li>
              <li><button onClick={() => setCurrentPage('blog')} className="text-gray-400 hover:text-cyan-400">Blog</button></li>
              <li><a href="mailto:contact@ai-need-tools.online" className="text-gray-400 hover:text-cyan-400">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-gray-400 hover:text-cyan-400">Privacy Policy</a></li>
              <li><a href="#" className="text-gray-400 hover:text-cyan-400">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">© 2024 AI Need Tools. All rights reserved.</p>
          <p className="text-gray-500 text-sm">Made with ❤️ for the AI community</p>
        </div>
      </div>
    </footer>
  );

  // Pages
  const HomePage = () => (<><HeroSection /><ToolsSection /><FeaturesSection /><BlogSection /><NewsletterSection /></>);
  const ToolsPage = () => (<div className="min-h-screen pt-24"><ToolsSection showAll={true} /><NewsletterSection /></div>);
  const BlogPage = () => selectedPost ? <BlogPostView post={selectedPost} /> : (<div className="min-h-screen pt-24"><BlogSection showAll={true} /><NewsletterSection /></div>);

  // Render
  return (
    <div className="min-h-screen bg-gray-900">
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
      {(
        <><Navigation />{currentPage === 'home' && <HomePage />}{currentPage === 'tools' && <ToolsPage />}{currentPage === 'blog' && <BlogPage />}{currentPage === 'about' && <AboutPage />}<Footer /></>
      )}
    </div>
  );
}
