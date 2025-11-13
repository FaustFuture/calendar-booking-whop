export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
        <p className="text-zinc-400 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="space-y-6 text-zinc-300">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Introduction</h2>
            <p>
              This Privacy Policy describes how we collect, use, and protect your information when you use our calendar booking application.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Information We Collect</h2>
            <p>
              When you connect your Google account, we access the following information:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-2 ml-4">
              <li>Your email address (for meeting invitations)</li>
              <li>Calendar events (to create Google Meet links)</li>
            </ul>
            <p className="mt-4">
              We do not store your Google account password or access tokens in a way that allows us to access your account without your permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc list-inside mt-2 space-y-2 ml-4">
              <li>Create Google Meet links for your bookings</li>
              <li>Send meeting invitations to attendees</li>
              <li>Manage your calendar bookings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Data Storage</h2>
            <p>
              We store booking information and meeting links in our secure database. Your Google OAuth tokens are encrypted and stored securely. 
              You can revoke access at any time through your Google account settings or by disconnecting in our app settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Third-Party Services</h2>
            <p>
              We use Google Calendar API to create meetings. Your use of Google services is subject to Google's Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside mt-2 space-y-2 ml-4">
              <li>Access your personal data</li>
              <li>Delete your account and data</li>
              <li>Revoke Google OAuth access at any time</li>
              <li>Request a copy of your data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us through your app dashboard.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

