import React, { useState, useEffect } from 'react';
import { 
  Mic, FileText, Image, Video, Bot, Sparkles, Zap, Shield, Globe, 
  ArrowRight, ExternalLink, Menu, X, ChevronRight, Clock, User, 
  Tag, Search, Mail, Twitter, Github, Linkedin, Youtube,
  Cpu, Wand2, MessageSquare, BarChart3, Code, Layers
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const SITE_CONFIG = {
  name: 'AI Need Tools',
  tagline: 'Your Hub for AI-Powered Solutions',
  domain: 'ai-need-tools.online',
};

// AI Tools Data - Add your tools here
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

// Blog Posts Data
const BLOG_POSTS = [
  {
    id: 1,
    title: 'The Future of AI-Powered Transcription: What to Expect in 2025',
    excerpt: 'Discover how AI transcription technology is evolving and what new features will revolutionize the way we convert speech to text.',
    category: 'AI Trends',
    author: 'AI Need Tools Team',
    date: 'Dec 10, 2024',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop',
    slug: 'future-of-ai-transcription-2025',
  },
  {
    id: 2,
    title: 'How to Choose the Right AI Tool for Your Business',
    excerpt: 'A comprehensive guide to evaluating and selecting AI tools that will actually drive results for your specific use case.',
    category: 'Guides',
    author: 'AI Need Tools Team',
    date: 'Dec 8, 2024',
    readTime: '8 min read',
    image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=400&fit=crop',
    slug: 'choose-right-ai-tool-business',
  },
  {
    id: 3,
    title: '10 Ways AI is Transforming Content Creation',
    excerpt: 'From writing assistance to image generation, explore how artificial intelligence is reshaping the creative landscape.',
    category: 'AI Trends',
    author: 'AI Need Tools Team',
    date: 'Dec 5, 2024',
    readTime: '6 min read',
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&h=400&fit=crop',
    slug: 'ai-transforming-content-creation',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// LOGO COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
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
      <path d="M32 24 L32 16"/>
      <path d="M32 40 L32 48"/>
      <path d="M24 32 L16 32"/>
      <path d="M40 32 L48 32"/>
      <path d="M26 26 L20 20"/>
      <path d="M38 26 L44 20"/>
      <path d="M26 38 L20 44"/>
      <path d="M38 38 L44 44"/>
      <circle cx="32" cy="16" r="3" fill="url(#logoGlow)"/>
      <circle cx="32" cy="48" r="3" fill="url(#logoGlow)"/>
      <circle cx="16" cy="32" r="3" fill="url(#logoGlow)"/>
      <circle cx="48" cy="32" r="3" fill="url(#logoGlow)"/>
      <circle cx="20" cy="20" r="2.5" fill="url(#logoGlow)"/>
      <circle cx="44" cy="20" r="2.5" fill="url(#logoGlow)"/>
      <circle cx="20" cy="44" r="2.5" fill="url(#logoGlow)"/>
      <circle cx="44" cy="44" r="2.5" fill="url(#logoGlow)"/>
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

  // Get unique categories
  const categories = ['all', ...new Set(AI_TOOLS.map(tool => tool.category))];

  // Filter tools by category
  const filteredTools = selectedCategory === 'all' 
    ? AI_TOOLS 
    : AI_TOOLS.filter(tool => tool.category === selectedCategory);

  // Handle newsletter subscription
  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════════
  const Navigation = () => (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-xl border-b border-dark-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => setCurrentPage('home')}
          >
            <Logo size={36} />
            <div>
              <span className="text-lg font-bold font-display text-white group-hover:text-cyan-400 transition-colors">
                AI Need Tools
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => setCurrentPage('home')} 
              className={`text-sm font-medium transition-colors ${currentPage === 'home' ? 'text-cyan-400' : 'text-dark-300 hover:text-white'}`}
            >
              Home
            </button>
            <button 
              onClick={() => setCurrentPage('tools')} 
              className={`text-sm font-medium transition-colors ${currentPage === 'tools' ? 'text-cyan-400' : 'text-dark-300 hover:text-white'}`}
            >
              AI Tools
            </button>
            <button 
              onClick={() => setCurrentPage('blog')} 
              className={`text-sm font-medium transition-colors ${currentPage === 'blog' ? 'text-cyan-400' : 'text-dark-300 hover:text-white'}`}
            >
              Blog
            </button>
            <button 
              onClick={() => setCurrentPage('about')} 
              className={`text-sm font-medium transition-colors ${currentPage === 'about' ? 'text-cyan-400' : 'text-dark-300 hover:text-white'}`}
            >
              About
            </button>
          </div>

          {/* CTA Button */}
          <div className="hidden md:flex items-center gap-4">
            <a 
              href="https://voxify.ai-need-tools.online" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold rounded-full hover:from-cyan-400 hover:to-blue-400 transition-all glow-cyan"
            >
              Try Voxify Free
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="md:hidden p-2 text-dark-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-dark-800 border-t border-dark-700 animate-fadeIn">
          <div className="px-4 py-6 space-y-4">
            <button onClick={() => { setCurrentPage('home'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-dark-200 hover:text-cyan-400">Home</button>
            <button onClick={() => { setCurrentPage('tools'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-dark-200 hover:text-cyan-400">AI Tools</button>
            <button onClick={() => { setCurrentPage('blog'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-dark-200 hover:text-cyan-400">Blog</button>
            <button onClick={() => { setCurrentPage('about'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-dark-200 hover:text-cyan-400">About</button>
            <a 
              href="https://voxify.ai-need-tools.online" 
              className="block w-full text-center py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl mt-4"
            >
              Try Voxify Free
            </a>
          </div>
        </div>
      )}
    </nav>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // HERO SECTION
  // ═══════════════════════════════════════════════════════════════════════════
  const HeroSection = () => (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 grid-pattern"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-pink-500/5 rounded-full blur-3xl"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-dark-800/80 backdrop-blur border border-dark-700 rounded-full text-sm text-dark-200 mb-8 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Discover the Power of AI</span>
          <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs font-semibold rounded-full">NEW</span>
        </div>
        
        {/* Main Heading */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold font-display mb-6 animate-slideUp">
          <span className="text-white">AI Tools for</span>
          <br />
          <span className="gradient-text">Every Need</span>
        </h1>
        
        {/* Subheading */}
        <p className="text-lg sm:text-xl text-dark-300 max-w-2xl mx-auto mb-10 animate-slideUp" style={{ animationDelay: '0.2s' }}>
          Your central hub for powerful AI-powered tools. From transcription to content creation, 
          we bring you the best AI solutions to supercharge your productivity.
        </p>
        
        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slideUp" style={{ animationDelay: '0.4s' }}>
          <button 
            onClick={() => setCurrentPage('tools')}
            className="group px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-full hover:from-cyan-400 hover:to-blue-400 transition-all glow-cyan flex items-center justify-center gap-2"
          >
            Explore AI Tools
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <a 
            href="https://voxify.ai-need-tools.online" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group px-8 py-4 bg-dark-800 border border-dark-600 text-white font-semibold rounded-full hover:bg-dark-700 hover:border-dark-500 transition-all flex items-center justify-center gap-2"
          >
            <Mic className="w-5 h-5 text-emerald-400" />
            Try Voxify Now
            <ExternalLink className="w-4 h-4 opacity-50" />
          </a>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mt-20 animate-slideUp" style={{ animationDelay: '0.6s' }}>
          <div>
            <div className="text-3xl sm:text-4xl font-bold font-display text-white">6+</div>
            <div className="text-sm text-dark-400">AI Tools</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-bold font-display text-white">30+</div>
            <div className="text-sm text-dark-400">Languages</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-bold font-display text-white">99%</div>
            <div className="text-sm text-dark-400">Accuracy</div>
          </div>
        </div>
      </div>
      
      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-dark-600 rounded-full flex justify-center pt-2">
          <div className="w-1 h-2 bg-cyan-400 rounded-full"></div>
        </div>
      </div>
    </section>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // TOOL CARD COMPONENT
  // ═══════════════════════════════════════════════════════════════════════════
  const ToolCard = ({ tool }) => {
    const Icon = tool.icon;
    const isLive = tool.status === 'live';
    
    return (
      <div className={`group relative bg-dark-800/50 backdrop-blur border ${tool.borderColor} rounded-2xl p-6 card-hover hover:border-opacity-50 transition-all`}>
        {/* Status Badge */}
        <div className="absolute top-4 right-4">
          {isLive ? (
            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              LIVE
            </span>
          ) : (
            <span className="px-2 py-1 bg-dark-700 text-dark-400 text-xs font-semibold rounded-full">
              COMING SOON
            </span>
          )}
        </div>
        
        {/* Icon */}
        <div className={`w-14 h-14 ${tool.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
          <Icon className={`w-7 h-7 bg-gradient-to-r ${tool.color} bg-clip-text`} style={{ color: 'transparent', backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))` }} />
          <Icon className={`w-7 h-7 absolute`} style={{ 
            background: `linear-gradient(135deg, ${tool.color.includes('emerald') ? '#34d399, #14b8a6' : tool.color.includes('violet') ? '#a78bfa, #a855f7' : tool.color.includes('pink') ? '#f472b6, #fb7185' : tool.color.includes('orange') ? '#fb923c, #f59e0b' : tool.color.includes('cyan') ? '#22d3ee, #3b82f6' : '#4ade80, #10b981'})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }} />
        </div>
        
        {/* Content */}
        <h3 className="text-xl font-bold font-display text-white mb-2">{tool.name}</h3>
        <p className="text-dark-400 text-sm mb-4 line-clamp-2">{tool.description}</p>
        
        {/* Features */}
        <div className="flex flex-wrap gap-2 mb-4">
          {tool.features.map((feature, i) => (
            <span key={i} className="px-2 py-1 bg-dark-700/50 text-dark-300 text-xs rounded-lg">
              {feature}
            </span>
          ))}
        </div>
        
        {/* CTA */}
        {isLive ? (
          <a 
            href={tool.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className={`flex items-center gap-2 text-sm font-semibold bg-gradient-to-r ${tool.color} bg-clip-text text-transparent hover:opacity-80 transition-opacity`}
          >
            Launch Tool <ExternalLink className="w-4 h-4" style={{ color: tool.color.includes('emerald') ? '#34d399' : '#22d3ee' }} />
          </a>
        ) : (
          <button disabled className="flex items-center gap-2 text-sm font-semibold text-dark-500 cursor-not-allowed">
            Coming Soon <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // TOOLS SECTION
  // ═══════════════════════════════════════════════════════════════════════════
  const ToolsSection = ({ showAll = false }) => (
    <section className={`py-20 ${!showAll ? 'bg-dark-800/30' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-cyan-400 text-sm font-semibold tracking-wider uppercase">Our Tools</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display text-white mt-2 mb-4">
            Powerful AI Tools
          </h2>
          <p className="text-dark-400 max-w-2xl mx-auto">
            Discover our collection of AI-powered tools designed to boost your productivity and streamline your workflow.
          </p>
        </div>
        
        {/* Category Filter */}
        {showAll && (
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-cyan-500 text-white'
                    : 'bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-white'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        )}
        
        {/* Tools Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(showAll ? filteredTools : AI_TOOLS.slice(0, 3)).map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
        
        {/* View All Button */}
        {!showAll && (
          <div className="text-center mt-10">
            <button 
              onClick={() => setCurrentPage('tools')}
              className="group px-6 py-3 bg-dark-800 border border-dark-600 text-white font-medium rounded-full hover:bg-dark-700 hover:border-dark-500 transition-all inline-flex items-center gap-2"
            >
              View All Tools
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </section>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // BLOG CARD COMPONENT
  // ═══════════════════════════════════════════════════════════════════════════
  const BlogCard = ({ post }) => (
    <article className="group bg-dark-800/50 backdrop-blur border border-dark-700 rounded-2xl overflow-hidden card-hover">
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img 
          src={post.image} 
          alt={post.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900/80 to-transparent"></div>
        <span className="absolute bottom-3 left-3 px-2 py-1 bg-cyan-500/20 backdrop-blur text-cyan-400 text-xs font-semibold rounded-lg">
          {post.category}
        </span>
      </div>
      
      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-bold font-display text-white mb-2 group-hover:text-cyan-400 transition-colors line-clamp-2">
          {post.title}
        </h3>
        <p className="text-dark-400 text-sm mb-4 line-clamp-2">
          {post.excerpt}
        </p>
        
        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-dark-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {post.readTime}
            </span>
            <span>{post.date}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </article>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // BLOG SECTION
  // ═══════════════════════════════════════════════════════════════════════════
  const BlogSection = ({ showAll = false }) => (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-purple-400 text-sm font-semibold tracking-wider uppercase">Blog</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display text-white mt-2 mb-4">
            Latest Insights
          </h2>
          <p className="text-dark-400 max-w-2xl mx-auto">
            Stay updated with the latest trends, tips, and news in the world of AI.
          </p>
        </div>
        
        {/* Blog Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {BLOG_POSTS.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
        
        {/* View All Button */}
        {!showAll && (
          <div className="text-center mt-10">
            <button 
              onClick={() => setCurrentPage('blog')}
              className="group px-6 py-3 bg-dark-800 border border-dark-600 text-white font-medium rounded-full hover:bg-dark-700 hover:border-dark-500 transition-all inline-flex items-center gap-2"
            >
              Read More Articles
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </section>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // FEATURES SECTION
  // ═══════════════════════════════════════════════════════════════════════════
  const FeaturesSection = () => (
    <section className="py-20 bg-dark-800/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-pink-400 text-sm font-semibold tracking-wider uppercase">Why Choose Us</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display text-white mt-2">
            Built for the Future
          </h2>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Zap, title: 'Lightning Fast', desc: 'Process data in seconds with optimized AI models', color: 'text-yellow-400' },
            { icon: Shield, title: 'Secure & Private', desc: 'Enterprise-grade security for your data', color: 'text-emerald-400' },
            { icon: Globe, title: 'Multi-language', desc: 'Support for 30+ languages worldwide', color: 'text-blue-400' },
            { icon: Cpu, title: 'Advanced AI', desc: 'Powered by cutting-edge machine learning', color: 'text-purple-400' },
          ].map((feature, i) => (
            <div key={i} className="text-center p-6">
              <div className={`w-14 h-14 mx-auto mb-4 rounded-xl bg-dark-700/50 flex items-center justify-center ${feature.color}`}>
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold font-display text-white mb-2">{feature.title}</h3>
              <p className="text-dark-400 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // NEWSLETTER SECTION
  // ═══════════════════════════════════════════════════════════════════════════
  const NewsletterSection = () => (
    <section className="py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 border border-dark-700 rounded-3xl p-8 sm:p-12 overflow-hidden">
          {/* Background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
          
          <div className="relative text-center">
            <Mail className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-white mb-3">
              Stay in the Loop
            </h2>
            <p className="text-dark-400 mb-8 max-w-lg mx-auto">
              Get the latest AI tools, tips, and exclusive offers delivered straight to your inbox.
            </p>
            
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 px-5 py-3 bg-dark-800 border border-dark-600 rounded-full text-white placeholder-dark-500 focus:outline-none focus:border-cyan-500 transition-colors"
                required
              />
              <button 
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-full hover:from-cyan-400 hover:to-blue-400 transition-all"
              >
                Subscribe
              </button>
            </form>
            
            {subscribed && (
              <p className="mt-4 text-emerald-400 text-sm animate-fadeIn">
                ✓ Thanks for subscribing!
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ABOUT PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  const AboutPage = () => (
    <div className="min-h-screen pt-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <span className="text-cyan-400 text-sm font-semibold tracking-wider uppercase">About Us</span>
          <h1 className="text-4xl sm:text-5xl font-bold font-display text-white mt-2 mb-6">
            Empowering Through AI
          </h1>
          <p className="text-xl text-dark-300 max-w-2xl mx-auto">
            We're on a mission to make powerful AI tools accessible to everyone.
          </p>
        </div>
        
        <div className="prose prose-invert max-w-none">
          <div className="bg-dark-800/50 border border-dark-700 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold font-display text-white mb-4 flex items-center gap-3">
              <Bot className="w-8 h-8 text-cyan-400" />
              Our Mission
            </h2>
            <p className="text-dark-300 leading-relaxed">
              At AI Need Tools, we believe that artificial intelligence should be accessible, 
              affordable, and easy to use for everyone. Our platform brings together the best 
              AI-powered tools to help individuals and businesses automate tasks, boost productivity, 
              and unlock new possibilities.
            </p>
          </div>
          
          <div className="bg-dark-800/50 border border-dark-700 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold font-display text-white mb-4 flex items-center gap-3">
              <Layers className="w-8 h-8 text-purple-400" />
              What We Offer
            </h2>
            <p className="text-dark-300 leading-relaxed mb-4">
              Our growing collection of AI tools covers a wide range of use cases:
            </p>
            <ul className="space-y-2 text-dark-300">
              <li className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-emerald-400" />
                <strong className="text-white">Voxify</strong> - AI-powered audio transcription with 30+ language support
              </li>
              <li className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-violet-400" />
                <strong className="text-white">Content Generation</strong> - Coming soon
              </li>
              <li className="flex items-center gap-2">
                <Image className="w-5 h-5 text-pink-400" />
                <strong className="text-white">Image Creation</strong> - Coming soon
              </li>
              <li className="flex items-center gap-2">
                <Code className="w-5 h-5 text-cyan-400" />
                <strong className="text-white">And more...</strong> - We're constantly building new tools
              </li>
            </ul>
          </div>
          
          <div className="bg-dark-800/50 border border-dark-700 rounded-2xl p-8">
            <h2 className="text-2xl font-bold font-display text-white mb-4 flex items-center gap-3">
              <Mail className="w-8 h-8 text-pink-400" />
              Get In Touch
            </h2>
            <p className="text-dark-300 leading-relaxed">
              Have questions, suggestions, or want to collaborate? We'd love to hear from you.
              Reach out to us at <a href="mailto:contact@ai-need-tools.online" className="text-cyan-400 hover:underline">contact@ai-need-tools.online</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════════════════
  const Footer = () => (
    <footer className="bg-dark-900 border-t border-dark-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <Logo size={32} />
              <span className="text-lg font-bold font-display text-white">AI Need Tools</span>
            </div>
            <p className="text-dark-400 text-sm mb-4">
              Your hub for AI-powered tools and solutions.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-9 h-9 bg-dark-800 rounded-lg flex items-center justify-center text-dark-400 hover:text-cyan-400 hover:bg-dark-700 transition-all">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 bg-dark-800 rounded-lg flex items-center justify-center text-dark-400 hover:text-cyan-400 hover:bg-dark-700 transition-all">
                <Github className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 bg-dark-800 rounded-lg flex items-center justify-center text-dark-400 hover:text-cyan-400 hover:bg-dark-700 transition-all">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 bg-dark-800 rounded-lg flex items-center justify-center text-dark-400 hover:text-cyan-400 hover:bg-dark-700 transition-all">
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>
          
          {/* Tools */}
          <div>
            <h4 className="text-white font-semibold mb-4">AI Tools</h4>
            <ul className="space-y-2">
              <li><a href="https://voxify.ai-need-tools.online" className="text-dark-400 hover:text-cyan-400 text-sm transition-colors">Voxify</a></li>
              <li><span className="text-dark-500 text-sm">ContentAI (Coming Soon)</span></li>
              <li><span className="text-dark-500 text-sm">ImageCraft (Coming Soon)</span></li>
              <li><span className="text-dark-500 text-sm">VideoAI (Coming Soon)</span></li>
            </ul>
          </div>
          
          {/* Company */}
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li><button onClick={() => setCurrentPage('about')} className="text-dark-400 hover:text-cyan-400 text-sm transition-colors">About</button></li>
              <li><button onClick={() => setCurrentPage('blog')} className="text-dark-400 hover:text-cyan-400 text-sm transition-colors">Blog</button></li>
              <li><a href="#" className="text-dark-400 hover:text-cyan-400 text-sm transition-colors">Careers</a></li>
              <li><a href="mailto:contact@ai-need-tools.online" className="text-dark-400 hover:text-cyan-400 text-sm transition-colors">Contact</a></li>
            </ul>
          </div>
          
          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-dark-400 hover:text-cyan-400 text-sm transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-dark-400 hover:text-cyan-400 text-sm transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-dark-400 hover:text-cyan-400 text-sm transition-colors">Cookie Policy</a></li>
            </ul>
          </div>
        </div>
        
        {/* Bottom */}
        <div className="pt-8 border-t border-dark-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-dark-500 text-sm">
            © 2024 AI Need Tools. All rights reserved.
          </p>
          <p className="text-dark-500 text-sm">
            Made with ❤️ for the AI community
          </p>
        </div>
      </div>
    </footer>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // HOME PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  const HomePage = () => (
    <>
      <HeroSection />
      <ToolsSection />
      <FeaturesSection />
      <BlogSection />
      <NewsletterSection />
    </>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // TOOLS PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  const ToolsPage = () => (
    <div className="min-h-screen pt-24">
      <ToolsSection showAll={true} />
      <NewsletterSection />
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // BLOG PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  const BlogPage = () => (
    <div className="min-h-screen pt-24">
      <BlogSection showAll={true} />
      <NewsletterSection />
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-dark-900 noise-overlay">
      <Navigation />
      
      {currentPage === 'home' && <HomePage />}
      {currentPage === 'tools' && <ToolsPage />}
      {currentPage === 'blog' && <BlogPage />}
      {currentPage === 'about' && <AboutPage />}
      
      <Footer />
    </div>
  );
}
