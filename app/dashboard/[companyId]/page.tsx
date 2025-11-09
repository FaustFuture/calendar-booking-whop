import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyWhopUser, syncWhopUserToSupabase } from "@/lib/auth";
import { WhopUserProvider } from "@/lib/context/WhopUserContext";
import { ToastProvider } from "@/lib/context/ToastContext";
import { ConfirmDialogProvider } from "@/lib/context/ConfirmDialogContext";
import DashboardTabs from "@/app/dashboard/components/DashboardTabs";

export default async function DashboardPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;

  // Verify Whop authentication and check access to determine proper role
  const authResult = await verifyWhopUser(companyId, true);

  if (!authResult.success || !authResult.user) {
    // Redirect to auth error page
    redirect('/auth/error?message=' + encodeURIComponent(authResult.error || 'Authentication failed'));
  }

  const whopUser = authResult.user;

  // Sync user to Supabase for relationships
  // try {
  //   await syncWhopUserToSupabase(whopUser);
  // } catch (error) {
  //   console.error('Failed to sync user to database:', error);
  //   redirect('/auth/error?message=' + encodeURIComponent('Failed to sync user data. Please try refreshing the page.'));
  // }

  // Prepare user object for context
  const userContextData = {
    userId: whopUser.userId,
    companyId: whopUser.companyId,
    role: whopUser.role,
    email: whopUser.email,
    name: whopUser.name
  };

  return (
    <ToastProvider>
      <ConfirmDialogProvider>
        <WhopUserProvider user={userContextData}>
          <div className="min-h-screen bg-background">
            <DashboardTabs companyId={companyId} />
          </div>
        </WhopUserProvider>
      </ConfirmDialogProvider>
    </ToastProvider>
  );
}
