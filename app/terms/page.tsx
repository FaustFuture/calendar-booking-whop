export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Terms of Service</h1>
        <p className="text-zinc-400 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="space-y-6 text-zinc-300">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Agreement to Terms</h2>
            <p>
              By accessing and using this calendar booking application, you accept and agree to be bound by the terms and provision of this agreement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Use License</h2>
            <p>
              Permission is granted to use this application for personal and commercial purposes, subject to the following restrictions:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-2 ml-4">
              <li>You may not use the service for any unlawful purpose</li>
              <li>You may not attempt to gain unauthorized access to the system</li>
              <li>You may not interfere with or disrupt the service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Google Account Connection</h2>
            <p>
              By connecting your Google account, you grant us permission to:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-2 ml-4">
              <li>Create calendar events on your behalf</li>
              <li>Generate Google Meet links for your bookings</li>
              <li>Access your email address for meeting invitations</li>
            </ul>
            <p className="mt-4">
              You can revoke this access at any time through your Google account settings or our app settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">User Responsibilities</h2>
            <p>You are responsible for:</p>
            <ul className="list-disc list-inside mt-2 space-y-2 ml-4">
              <li>Maintaining the security of your account</li>
              <li>All activities that occur under your account</li>
              <li>Ensuring your use of the service complies with applicable laws</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Service Availability</h2>
            <p>
              We strive to provide reliable service but do not guarantee uninterrupted access. 
              The service may be unavailable due to maintenance, updates, or unforeseen circumstances.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Limitation of Liability</h2>
            <p>
              We shall not be liable for any indirect, incidental, special, or consequential damages 
              resulting from your use or inability to use the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of the service 
              after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Contact</h2>
            <p>
              If you have questions about these Terms of Service, please contact us through your app dashboard.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

