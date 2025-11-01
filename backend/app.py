from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
import whisper
import os
from datetime import datetime, timedelta
import tempfile
import stripe

app = Flask(__name__)
CORS(app)

# Configuration
app.config['SECRET_KEY'] = 'your-secret-key-change-this'
app.config['JWT_SECRET_KEY'] = 'your-jwt-secret-change-this'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///transcribe.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db = SQLAlchemy(app)
jwt = JWTManager(app)

# Stripe configuration (get keys from stripe.com)
stripe.api_key = 'your-stripe-secret-key'

# Load Whisper model
print("Loading Whisper model...")
whisper_model = whisper.load_model("base")
print("Model loaded!")

# Subscription Plans
PLANS = {
    'free': {
        'name': 'Free',
        'price': 0,
        'monthly_limit': 10,  # 10 transcriptions per month
        'max_file_size': 25,  # MB
        'features': ['10 transcriptions/month', 'Basic support', '25MB max file']
    },
    'pro': {
        'name': 'Pro',
        'price': 9.99,
        'monthly_limit': 200,
        'max_file_size': 100,
        'features': ['200 transcriptions/month', 'Priority support', '100MB max file', 'Advanced models']
    },
    'enterprise': {
        'name': 'Enterprise',
        'price': 49.99,
        'monthly_limit': -1,  # Unlimited
        'max_file_size': 500,
        'features': ['Unlimited transcriptions', '24/7 support', '500MB max file', 'API access', 'Custom models']
    }
}

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    plan = db.Column(db.String(50), default='free')
    stripe_customer_id = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    transcriptions = db.relationship('Transcription', backref='user', lazy=True)

class Transcription(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    filename = db.Column(db.String(255))
    transcript = db.Column(db.Text)
    language = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    file_size = db.Column(db.Integer)

# Create tables
with app.app_context():
    db.create_all()

# Helper Functions
def get_user_usage(user_id):
    """Get user's current month usage"""
    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
    count = Transcription.query.filter(
        Transcription.user_id == user_id,
        Transcription.created_at >= start_of_month
    ).count()
    return count

def can_transcribe(user):
    """Check if user can transcribe based on their plan"""
    plan = PLANS[user.plan]
    if plan['monthly_limit'] == -1:  # Unlimited
        return True, None
    
    usage = get_user_usage(user.id)
    if usage >= plan['monthly_limit']:
        return False, f"Monthly limit reached. Upgrade to transcribe more."
    
    return True, None

# Routes
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    hashed_password = generate_password_hash(data['password'])
    new_user = User(email=data['email'], password=hashed_password)
    
    db.session.add(new_user)
    db.session.commit()
    
    token = create_access_token(identity=new_user.id)
    return jsonify({
        'token': token,
        'user': {
            'id': new_user.id,
            'email': new_user.email,
            'plan': new_user.plan
        }
    }), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not check_password_hash(user.password, data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    token = create_access_token(identity=user.id)
    return jsonify({
        'token': token,
        'user': {
            'id': user.id,
            'email': user.email,
            'plan': user.plan
        }
    })

@app.route('/api/user', methods=['GET'])
@jwt_required()
def get_user():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    usage = get_user_usage(user_id)
    plan = PLANS[user.plan]
    
    return jsonify({
        'id': user.id,
        'email': user.email,
        'plan': user.plan,
        'usage': usage,
        'limit': plan['monthly_limit'],
        'features': plan['features']
    })

@app.route('/api/transcribe', methods=['POST'])
@jwt_required()
def transcribe_audio():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Check usage limits
    can_use, error = can_transcribe(user)
    if not can_use:
        return jsonify({'error': error}), 403
    
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    file = request.files['audio']
    file_size_mb = len(file.read()) / (1024 * 1024)
    file.seek(0)  # Reset file pointer
    
    # Check file size limit
    plan = PLANS[user.plan]
    if file_size_mb > plan['max_file_size']:
        return jsonify({'error': f'File too large. Max size: {plan["max_file_size"]}MB'}), 400
    
    language = request.form.get('language', 'auto')
    
    try:
        # Save file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name
        
        # Transcribe
        if language == 'auto':
            result = whisper_model.transcribe(tmp_path)
        else:
            result = whisper_model.transcribe(tmp_path, language=language)
        
        os.unlink(tmp_path)
        
        # Save to database
        transcription = Transcription(
            user_id=user_id,
            filename=file.filename,
            transcript=result['text'],
            language=result['language'],
            file_size=int(file_size_mb * 1024 * 1024)
        )
        db.session.add(transcription)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'transcript': result['text'],
            'language': result['language'],
            'usage': get_user_usage(user_id),
            'limit': plan['monthly_limit']
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history', methods=['GET'])
@jwt_required()
def get_history():
    user_id = get_jwt_identity()
    transcriptions = Transcription.query.filter_by(user_id=user_id).order_by(
        Transcription.created_at.desc()
    ).limit(50).all()
    
    return jsonify([{
        'id': t.id,
        'filename': t.filename,
        'transcript': t.transcript,
        'language': t.language,
        'created_at': t.created_at.isoformat()
    } for t in transcriptions])

@app.route('/api/plans', methods=['GET'])
def get_plans():
    return jsonify(PLANS)

@app.route('/api/create-checkout-session', methods=['POST'])
@jwt_required()
def create_checkout_session():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.json
    plan = data.get('plan')
    
    if plan not in PLANS:
        return jsonify({'error': 'Invalid plan'}), 400
    
    try:
        # Create Stripe checkout session
        checkout_session = stripe.checkout.Session.create(
            customer_email=user.email,
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': f'TranscribeAI {PLANS[plan]["name"]} Plan',
                    },
                    'unit_amount': int(PLANS[plan]['price'] * 100),
                    'recurring': {'interval': 'month'},
                },
                'quantity': 1,
            }],
            mode='subscription',
            success_url='http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url='http://localhost:3000/pricing',
        )
        
        return jsonify({'checkout_url': checkout_session.url})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/webhook', methods=['POST'])
def stripe_webhook():
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, 'your-webhook-secret'
        )
        
        # Handle successful subscription
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            user = User.query.filter_by(email=session['customer_email']).first()
            if user:
                user.plan = 'pro'  # Update based on actual plan
                user.stripe_customer_id = session['customer']
                db.session.commit()
        
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)