import DashboardTabs from "./components/DashboardTabs";
import { Calendar } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg shadow-emerald-500/20">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent">
                Calendar
              </h1>
              <p className="text-zinc-400 text-lg mt-1">
                Manage your bookings, availability, and recordings
              </p>
            </div>
          </div>
        </div>

        <DashboardTabs />
      </div>
    </div>
  );
}
