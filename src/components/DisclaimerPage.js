import React from 'react';

const DisclaimerPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Disclaimer</h1>
          <p className="text-xl text-slate-600">Last updated: January 20, 2026</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">1. Accuracy of Information</h2>
          <p className="text-slate-700 leading-relaxed">
            The information provided by Voxify ("we," "us," or "our") on our website is for general informational purposes only. All information on the Site is provided in good faith, however, we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any information on the Site, including transcriptions.
          </p>
          <p className="text-slate-700 leading-relaxed">
            Our AI-powered transcription service is not 100% accurate. The quality of the transcription depends on the quality of the audio input. We recommend reviewing all transcriptions for accuracy.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 pt-4">2. No Professional Advice</h2>
          <p className="text-slate-700 leading-relaxed">
            The information provided on the Site is not intended to be a substitute for professional advice. Any reliance you place on such information is strictly at your own risk. We disclaim all liability and responsibility arising from any reliance placed on such materials by you or any other visitor to the Site, or by anyone who may be informed of any of its contents.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 pt-4">3. External Links Disclaimer</h2>
          <p className="text-slate-700 leading-relaxed">
            The Site may contain (or you may be sent through the Site) links to other websites or content belonging to or originating from third parties or links to websites and features in banners or other advertising. Such external links are not investigated, monitored, or checked for accuracy, adequacy, validity, reliability, availability, or completeness by us.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 pt-4">4. Testimonials Disclaimer</h2>
          <p className="text-slate-700 leading-relaxed">
            The Site may contain testimonials by users of our products and/or services. These testimonials reflect the real-life experiences and opinions of such users. However, the experiences are personal to those particular users, and may not necessarily be representative of all users of our products and/or services. We do not claim, and you should not assume, that all users will have the same experiences.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 pt-4">5. Contact Us</h2>
          <p className="text-slate-700 leading-relaxed">
            If you have any questions about this Disclaimer, please contact us at:
            <br />
            support@ai-need-tools.online
          </p>
        </div>
      </div>
    </div>
  );
};

export default DisclaimerPage;
