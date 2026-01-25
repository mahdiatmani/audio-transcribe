import React from 'react';

const TermsAndConditionsPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Terms and Conditions</h1>
          <p className="text-xl text-slate-600">Last updated: January 20, 2026</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">1. Agreement to Terms</h2>
          <p className="text-slate-700 leading-relaxed">
            By using our website and services, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 pt-4">2. Service Description</h2>
          <p className="text-slate-700 leading-relaxed">
            Voxify provides AI-powered audio transcription services. We offer various plans with different features and limitations. We reserve the right to modify or discontinue the service at any time.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 pt-4">3. User Accounts</h2>
          <p className="text-slate-700 leading-relaxed">
            You may be required to create an account to access certain features. You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 pt-4">4. User-Generated Content</h2>
          <p className="text-slate-700 leading-relaxed">
            You are solely responsible for the audio files and other content you upload to the service. You warrant that you have all necessary rights to the content and that it does not violate any applicable laws or infringe on any third-party rights. We do not claim ownership of your content.
          </p>
          <p className="text-slate-700 leading-relaxed">
            You agree not to use the service to transcribe any content that is illegal, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable. This includes, but is not limited to, content that promotes hate speech, violence, or discrimination.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 pt-4">5. Payments and Subscriptions</h2>
          <p className="text-slate-700 leading-relaxed">
            We offer both free and paid subscription plans. By selecting a paid plan, you agree to pay the applicable fees. All payments are processed through our third-party payment processor, PayPal. We do not store your full payment information.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 pt-4">6. Intellectual Property</h2>
          <p className="text-slate-700 leading-relaxed">
            Our website and its original content, features, and functionality are owned by Voxify and are protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 pt-4">7. Prohibited Activities</h2>
          <p className="text-slate-700 leading-relaxed">
            You are prohibited from using the site for any of the following purposes:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li>Engaging in any activity that is illegal or fraudulent.</li>
            <li>Transmitting any material that is defamatory, offensive, or otherwise objectionable.</li>
            <li>Attempting to interfere with the proper working of the site.</li>
            <li>Bypassing any measures we may use to prevent or restrict access to the site.</li>
            <li>Using any automated system, including without limitation "robots," "spiders," or "offline readers," to access the site in a manner that sends more request messages to the servers than a human can reasonably produce in the same period by using a conventional on-line web browser.</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 pt-4">8. Termination</h2>
          <p className="text-slate-700 leading-relaxed">
            We may terminate or suspend your account and bar access to the service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
          </p>
          
          <h2 className="text-2xl font-bold text-slate-900 pt-4">9. Disclaimer of Warranties</h2>
          <p className="text-slate-700 leading-relaxed">
            The service is provided on an "AS IS" and "AS AVAILABLE" basis. We make no warranties, express or implied, regarding the accuracy, reliability, or availability of the service.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 pt-4">10. Limitation of Liability</h2>
          <p className="text-slate-700 leading-relaxed">
            In no event shall Voxify, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the service.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 pt-4">11. Governing Law</h2>
          <p className="text-slate-700 leading-relaxed">
            These Terms shall be governed and construed in accordance with the laws of the jurisdiction in which the company is based, without regard to its conflict of law provisions.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 pt-4">12. Contact Us</h2>
          <p className="text-slate-700 leading-relaxed">
            If you have any questions about these Terms, please contact us at:
            <br />
            support@ai-need-tools.online
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditionsPage;
