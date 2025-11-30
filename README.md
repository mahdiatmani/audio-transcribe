# 🎙️ TranscribeAI - Audio to Text Transcription SaaS

A full-stack SaaS application for converting audio files to text using AI transcription.

## ✨ Features

- 🎵 Upload audio files (MP3, WAV, M4A, WebM)
- 🎤 Record audio directly in browser
- 🤖 AI-powered transcription using Whisper
- 👤 User authentication & authorization
- 📊 Usage tracking & tier limits
- 📜 Transcription history
- 💳 Multiple pricing tiers (Free, Starter, Pro, Enterprise)
- 📱 Responsive design
- 🆓 **100% FREE to run** (no hosting costs!)

## 🛠️ Tech Stack

### Frontend
- React.js
- Tailwind CSS
- Lucide Icons
- Claude.ai Artifacts

### Backend
- FastAPI (Python)
- JWT Authentication
- Hugging Face Whisper API (FREE)
- In-memory storage (upgradable to PostgreSQL)

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- FREE Hugging Face API Key: https://huggingface.co/settings/tokens

### Backend Setup
```bash
cd transcribe-backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (copy from .env.example)
cp .env.example .env

# Edit .env and add your Hugging Face API key
# Get FREE key: https://huggingface.co/settings/tokens

# Generate SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(64))"

# Add the generated key to .env file

# Run backend
python main.py
```

Backend runs at: http://localhost:8000

### Frontend Setup
```bash
cd transcribe-ai

# Install dependencies
npm install

# Start development server
npm start
```

Frontend runs at: http://localhost:3000

## 📁 Project Structure
```
transcribe-saas/
├── transcribe-backend/          # FastAPI Backend
│   ├── main.py                  # Main API file
│   ├── requirements.txt         # Python dependencies
│   ├── .env                     # Environment variables (DO NOT COMMIT)
│   └── .env.example            # Environment template
│
├── transcribe-ai/              # React Frontend
│   ├── src/
│   │   ├── App.js              # Main React component
│   │   └── index.css           # Tailwind styles
│   ├── public/
│   │   └── index.html          # HTML with Tailwind CDN
│   └── package.json            # Node dependencies
│
├── .gitignore                  # Git ignore rules
└── README.md                   # This file
```

## 🔑 Environment Variables

Create a `.env` file in `transcribe-backend/`:
```env
SECRET_KEY=your-generated-secret-key-here
HUGGINGFACE_API_KEY=hf_your_huggingface_api_key
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=http://localhost:3000
```

## 💰 Pricing Tiers

| Tier       | Price | Minutes/Month | Features                          |
|------------|-------|---------------|-----------------------------------|
| Free       | $0    | 15 min        | Basic quality, Email support      |
| Starter    | $9    | 300 min       | High quality, API access          |
| Pro        | $29   | 1000 min      | Ultra quality, 24/7 support       |
| Enterprise | $99   | 10000 min     | Custom models, White-label        |

## 📝 API Documentation

Once the backend is running, visit: http://localhost:8000/docs

### Main Endpoints:
- `POST /auth/signup` - Register new user
- `POST /auth/login` - Login user
- `POST /api/transcribe` - Transcribe audio file
- `GET /api/user/stats` - Get user statistics
- `GET /api/transcriptions/history` - Get transcription history

## 🚀 Deployment

### Backend (100% FREE Options)

**Option 1: Render.com**
1. Connect GitHub repository
2. Select `transcribe-backend` folder
3. Add environment variables
4. Deploy (FREE tier: 750 hours/month)

**Option 2: Railway.app**
1. Connect repository
2. Set root directory to `transcribe-backend`
3. Add environment variables
4. Deploy (FREE $5 credit/month)

**Option 3: Fly.io**
1. Install Fly CLI: `brew install flyctl`
2. Login: `fly auth login`
3. Deploy: `fly launch`

### Frontend (100% FREE)

**Vercel (Recommended)**
```bash
cd transcribe-ai
npm run build
npx vercel
```

**Netlify**
```bash
cd transcribe-ai
npm run build
# Drag and drop the 'build' folder to Netlify
```

## 🛡️ Security

- ✅ JWT token authentication
- ✅ Password hashing (SHA-256)
- ✅ CORS protection
- ✅ Environment variables for secrets
- ✅ Input validation
- ✅ File type validation

## 📊 Cost Breakdown

- **Hosting**: $0 (Free tiers)
- **API**: $0 (Hugging Face free tier)
- **Database**: $0 (In-memory or free tier)
- **SSL**: $0 (Included in hosting)
- **Total**: **$0.00/month** 🎉

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Credits

- Whisper AI by OpenAI
- Hugging Face for FREE API
- Built with FastAPI & React

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Made with ❤️ by Mahdi Atmani**