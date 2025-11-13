import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-foreground">
            Calendar Booking App
          </h1>
          <p className="text-xl text-text-secondary">
            Manage your availability and bookings with ease
          </p>
        </div>

        <div className="pt-8 space-y-4">
          <Link
            href="https://whop.com"
            target="_blank"
            className="inline-block px-8 py-4 bg-primary hover:bg-primary-hover text-white rounded-lg font-semibold text-lg transition-colors shadow-lg hover:shadow-xl"
          >
            Go to Whop
          </Link>
          
          <div className="flex items-center justify-center gap-6 pt-6 text-sm text-text-tertiary">
            <Link
              href="/privacy"
              className="hover:text-text-secondary transition-colors"
            >
              Privacy Policy
            </Link>
            <span>•</span>
            <Link
              href="/terms"
              className="hover:text-text-secondary transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
