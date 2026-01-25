import React from 'react';

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Privacy Policy</h1>
          <p className="text-xl text-slate-600">Last updated: January 25, 2026</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
          <p className="text-slate-700 leading-relaxed">
            Welcome to Voxify ("we", "us", "our"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 pt-4">1. Information We Collect</h2>
          <p className="text-slate-700 leading-relaxed">
            We may collect information about you in a variety of ways. The information we may collect on the Site includes:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li>
              <strong>Personal Data:</strong> Personally identifiable information, such as your name, email address, and payment information, that you voluntarily give to us when you register with the Site or when you choose to participate in various activities related to the Site, such as online chat and message boards.
            </li>
            <li>
              <strong>Derivative Data:</strong> Information our servers automatically collect when you access the Site, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the Site.
            </li>
            <li>
              <strong>Financial Data:</strong> Financial information, such as data related to your payment method (e.g., valid credit card number, card brand, expiration date) that we may collect when you purchase, order, return, exchange, or request information about our services from the Site. We store only very limited, if any, financial information that we collect. Otherwise, all financial information is stored by our payment processor (PayPal), and you are encouraged to review their privacy policy and contact them directly for responses to your questions.
            </li>
            <li>
              <strong>User Content:</strong> Audio files and the resulting transcriptions that you upload or generate through our service. You are responsible for the content you provide.
            </li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 pt-4">2. Use of Your Information</h2>
          <p className="text-slate-700 leading-relaxed">
            Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Site to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li>Create and manage your account.</li>
            <li>Process your payments and subscriptions.</li>
            <li>Provide and improve our transcription services.</li>
            <li>Email you regarding your account or order.</li>
            <li>Monitor and analyze usage and trends to improve your experience with the Site.</li>
            <li>Prevent fraudulent transactions, monitor against theft, and protect against criminal activity.</li>
            <li>Respond to your customer service requests.</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 pt-4">3. Disclosure of Your Information</h2>
          <p className="text-slate-700 leading-relaxed">
            We may share information we have collected about you in certain situations. Your information may be disclosed as follows:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li>
              <strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may share your information as permitted or required by any applicable law, rule, or regulation.
            </li>
            <li>
              <strong>Third-Party Service Providers:</strong> We may share your information with third parties that perform services for us or on our behalf, including payment processing, data analysis, email delivery, hosting services, customer service, and marketing assistance.
            </li>
            <li>
              <strong>Business Transfers:</strong> We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.
            </li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 pt-4">4. Cookies and Tracking Technologies</h2>
          <p className="text-slate-700 leading-relaxed">
            We use cookies and similar tracking technologies to track activity on our Site and hold certain information. Cookies are files with a small amount of data which may include an anonymous unique identifier. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li>
              <strong>Essential Cookies:</strong> Required for the website to function properly, including authentication and security features.
            </li>
            <li>
              <strong>Analytics Cookies:</strong> We use Google Analytics to understand how visitors interact with our website. This helps us improve our services.
            </li>
            <li>
              <strong>Advertising Cookies:</strong> We use Google AdSense to display advertisements. These cookies may track your browsing habits to show you relevant ads.
            </li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 pt-4">5. Advertising</h2>
          <p className="text-slate-700 leading-relaxed">
            We use Google AdSense to display advertisements on our Site. Google AdSense uses cookies to serve ads based on your prior visits to our Site or other websites. Google's use of advertising cookies enables it and its partners to serve ads based on your visit to our Site and/or other sites on the Internet.
          </p>
          <p className="text-slate-700 leading-relaxed mt-4">
            You may opt out of personalized advertising by visiting{' '}
            <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 underline">
              Google Ads Settings
            </a>
            . Alternatively, you can opt out of a third-party vendor's use of cookies for personalized advertising by visiting{' '}
            <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 underline">
              www.aboutads.info/choices
            </a>
            .
          </p>

          <h2 className="text-2xl font-bold text-slate-900 pt-4">6. Security of Your Information</h2>
          <p className="text-slate-700 leading-relaxed">
            We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 pt-4">7. Your Rights (GDPR)</h2>
          <p className="text-slate-700 leading-relaxed">
            If you are a resident of the European Economic Area (EEA), you have certain data protection rights under the General Data Protection Regulation (GDPR):
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li><strong>Right to Access:</strong> You have the right to request copies of your personal data.</li>
            <li><strong>Right to Rectification:</strong> You have the right to request that we correct any information you believe is inaccurate or complete information you believe is incomplete.</li>
            <li><strong>Right to Erasure:</strong> You have the right to request that we erase your personal data, under certain conditions.</li>
            <li><strong>Right to Restrict Processing:</strong> You have the right to request that we restrict the processing of your personal data, under certain conditions.</li>
            <li><strong>Right to Object:</strong> You have the right to object to our processing of your personal data, under certain conditions.</li>
            <li><strong>Right to Data Portability:</strong> You have the right to request that we transfer the data we have collected to another organization, or directly to you, under certain conditions.</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 pt-4">8. California Privacy Rights (CCPA)</h2>
          <p className="text-slate-700 leading-relaxed">
            If you are a California resident, you have the right to request that we disclose certain information about our collection and use of your personal information over the past 12 months. You also have the right to request that we delete your personal information. To exercise these rights, please contact us using the information below.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 pt-4">9. Children's Privacy</h2>
          <p className="text-slate-700 leading-relaxed">
            Our Site is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and you are aware that your child has provided us with personal information, please contact us.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 pt-4">10. Changes to This Privacy Policy</h2>
          <p className="text-slate-700 leading-relaxed">
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date at the top of this Privacy Policy.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 pt-4">12. Contact Us</h2>
          <p className="text-slate-700 leading-relaxed">
            If you have questions or comments about this Privacy Policy, please contact us at:
            <br />
            support@ai-need-tools.online
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
