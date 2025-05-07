import { cookies } from 'next/headers';

import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { SubscriptionGuard } from '@/components/subscription-guard';
import { authenticateUser } from '@/lib/supabase/auth-helpers';
import Script from 'next/script';

export const experimental_ppr = true;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Need to await cookies() in Next.js 15
  const cookieStore = await cookies();
  // Use the secure authentication helper
  const { authenticated, user, supabase } = await authenticateUser();
  const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <SidebarProvider defaultOpen={!isCollapsed}>
        <AppSidebar user={user} />
        <SidebarInset>
          <SubscriptionGuard>
            {children}
          </SubscriptionGuard>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
