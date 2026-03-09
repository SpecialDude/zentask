import React from 'react';

const TermsOfServiceView: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-800 dark:text-slate-200">
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-8 md:p-12 mb-12">
        <h1 className="text-3xl font-bold mb-8 text-slate-900 dark:text-white">Terms of Service</h1>
        
        <div className="space-y-6 text-sm md:text-base leading-relaxed">
          <p className="opacity-80">Last Updated: {new Date().toLocaleDateString()}</p>
          
          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">1. Agreement to Terms</h2>
            <p className="opacity-80">
              By accessing or using the ZenTask application and website, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, then you may not access the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">2. Use License</h2>
            <p className="opacity-80 mb-2">Permission is granted to temporarily access the materials (information or software) on ZenTask's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
            <ul className="list-disc pl-5 opacity-80 space-y-1">
              <li>modify or copy the materials;</li>
              <li>use the materials for any commercial purpose, or for any public display (commercial or non-commercial);</li>
              <li>attempt to decompile or reverse engineer any software contained on ZenTask's website;</li>
              <li>remove any copyright or other proprietary notations from the materials; or</li>
              <li>transfer the materials to another person or "mirror" the materials on any other server.</li>
            </ul>
            <p className="opacity-80 mt-2">
              This license shall automatically terminate if you violate any of these restrictions and may be terminated by ZenTask at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">3. User Accounts</h2>
            <p className="opacity-80">
              When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">4. Integrations and Third-Party Services</h2>
            <p className="opacity-80">
              ZenTask allows you to connect your account to third-party services like Atlassian Jira and Google Gemini. By authorizing these connections, you grant ZenTask permission to access, read, and write data from those services on your behalf, strictly as intended by the application's functionality. ZenTask is not responsible for the availability, content, or practices of these third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">5. Disclaimer</h2>
            <p className="opacity-80">
              The materials on ZenTask's website are provided on an 'as is' basis. ZenTask makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">6. Limitations</h2>
            <p className="opacity-80">
              In no event shall ZenTask or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on ZenTask's website, even if ZenTask or a ZenTask authorized representative has been notified orally or in writing of the possibility of such damage.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">7. Modifications</h2>
            <p className="opacity-80">
              ZenTask may revise these terms of service for its website at any time without notice. By using this website you are agreeing to be bound by the then current version of these terms of service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">8. Governing Law</h2>
            <p className="opacity-80">
              These terms and conditions are governed by and construed in accordance with standard international law and you irrevocably submit to the exclusive jurisdiction of the courts in your location.
            </p>
          </section>
        </div>

        <div className="mt-12 text-center">
          <button 
            onClick={() => window.location.href = '/'}
            className="text-primary hover:text-primary-dark font-medium transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServiceView;
