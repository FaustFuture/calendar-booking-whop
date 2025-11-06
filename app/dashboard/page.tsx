import { Calendar, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-2xl p-10 shadow-2xl">
          <div className="flex items-center justify-center w-20 h-20 bg-emerald-500/10 rounded-full mx-auto mb-6">
            <Calendar className="w-10 h-10 text-emerald-400" />
          </div>

          <h1 className="text-3xl font-bold text-white text-center mb-4">
            Calendar App
          </h1>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-100 text-sm font-medium mb-1">
                Whop Authentication Required
              </p>
              <p className="text-amber-200/80 text-sm">
                This app requires access through a Whop company. Please access this app through your Whop dashboard.
              </p>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="bg-zinc-900/50 border border-zinc-700/30 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2 text-sm">How to Access:</h3>
              <ol className="text-zinc-400 text-sm space-y-2 list-decimal list-inside">
                <li>Log in to your Whop account</li>
                <li>Navigate to your company dashboard</li>
                <li>Access this Calendar app from your company's apps</li>
              </ol>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-700/30 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2 text-sm">App URL Format:</h3>
              <code className="text-emerald-400 text-xs bg-zinc-950/50 px-2 py-1 rounded">
                /dashboard/[companyId]
              </code>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="https://whop.com"
              target="_blank"
              className="block w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold text-center transition-colors"
            >
              Go to Whop
            </Link>

            <Link
              href="https://docs.whop.com/apps"
              target="_blank"
              className="block w-full py-3 px-4 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-semibold text-center transition-colors"
            >
              View Documentation
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
