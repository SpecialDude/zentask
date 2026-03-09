import React from 'react';

const PrivacyPolicyView: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-800 dark:text-slate-200">
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-8 md:p-12 mb-12">
        <h1 className="text-3xl font-bold mb-8 text-slate-900 dark:text-white">Privacy Policy</h1>
        
        <div className="space-y-6 text-sm md:text-base leading-relaxed">
          <p className="opacity-80">Last Updated: {new Date().toLocaleDateString()}</p>
          
          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">1. Introduction</h2>
            <p className="opacity-80">
              Welcome to ZenTask. We respect your privacy and are committed to protecting your personal data. 
              This privacy policy will inform you as to how we look after your personal data when you visit our 
              website or use our application (regardless of where you visit it from) and tell you about your privacy rights and how the law protects you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">2. The Data We Collect About You</h2>
            <p className="opacity-80 mb-2">We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
            <ul className="list-disc pl-5 opacity-80 space-y-1">
              <li><strong>Identity Data</strong> includes first name, last name, username or similar identifier.</li>
              <li><strong>Contact Data</strong> includes email address.</li>
              <li><strong>Technical Data</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform, and other technology on the devices you use to access this website.</li>
              <li><strong>Usage Data</strong> includes information about how you use our website, products and services (such as your tasks, lists, and synchronization preferences).</li>
              <li><strong>Integration Data</strong> includes data retrieved from third-party services you explicitly connect (e.g., Jira), such as project keys, issue summaries, and task statuses strictly for the purpose of syncing with ZenTask.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">3. How We Use Your Personal Data</h2>
            <p className="opacity-80 mb-2">We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
            <ul className="list-disc pl-5 opacity-80 space-y-1">
              <li>Where we need to perform the contract we are about to enter into or have entered into with you (e.g., providing the ZenTask service).</li>
              <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
              <li>Where we need to comply with a legal obligation.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">4. Data Security</h2>
            <p className="opacity-80">
              We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know. They will only process your personal data on our instructions and they are subject to a duty of confidentiality.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">5. Third-Party Links & Integrations</h2>
            <p className="opacity-80">
              This application may include links to third-party websites, plug-ins and applications, as well as direct integrations (like Atlassian Jira). Connecting those integrations or clicking on those links may allow third parties to collect or share data about you. We do not control these third-party websites and are not responsible for their privacy statements. When you enable an integration, we strongly encourage you to read the privacy notice of that specific third-party service.
            </p>
            <p className="opacity-80 mt-2">
              Our application uses AI features powered by Google Gemini. Task descriptions or titles you request AI assistance for may be temporarily sent to these services solely for generating the requested output, but are not used to train global AI models.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">6. Your Legal Rights</h2>
            <p className="opacity-80 mb-2">Under certain circumstances, you have rights under data protection laws in relation to your personal data. These include the right to:</p>
            <ul className="list-disc pl-5 opacity-80 space-y-1">
              <li>Request access to your personal data.</li>
              <li>Request correction of your personal data.</li>
              <li>Request erasure of your personal data.</li>
              <li>Object to processing of your personal data.</li>
              <li>Request restriction of processing your personal data.</li>
              <li>Request transfer of your personal data.</li>
              <li>Right to withdraw consent.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">7. Contact Us</h2>
            <p className="opacity-80">
              If you have any questions about this privacy policy or our privacy practices, please contact us.
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

export default PrivacyPolicyView;
