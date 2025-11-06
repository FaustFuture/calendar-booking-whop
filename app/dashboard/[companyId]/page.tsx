import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyWhopUser, syncWhopUserToSupabase } from "@/lib/auth";
import { WhopUserProvider } from "@/lib/context/WhopUserContext";
import DashboardTabs from "@/app/dashboard/components/DashboardTabs";

export default async function DashboardPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;

  // Verify Whop authentication
  const authResult = await verifyWhopUser(companyId);

  if (!authResult.success || !authResult.user) {
    // Redirect to auth error page
    redirect('/auth/error?message=' + encodeURIComponent(authResult.error || 'Authentication failed'));
  }

  const whopUser = authResult.user;

  // Sync user to Supabase for relationships
  await syncWhopUserToSupabase(whopUser);

  // Prepare user object for context
  const userContextData = {
    userId: whopUser.userId,
    companyId: whopUser.companyId,
    role: whopUser.role,
    email: whopUser.email,
    name: whopUser.name
  };

  return (
    <WhopUserProvider user={userContextData}>
      <div className="min-h-screen bg-background">
        <DashboardTabs companyId={companyId} />
      </div>
    </WhopUserProvider>
  );
}
