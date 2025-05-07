import type { Metadata } from 'next';
import { Toaster } from 'sonner';

import { Providers } from '@/components/providers/index';
import { SubscriptionProvider } from '@/hooks/use-subscription';
import { getAuthenticatedUser, getAuthSession } from '@/lib/supabase/helpers';
import { createClient } from '@/lib/supabase/server';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://matchgenius.app'), // app url
  title: 'Match Genius - AI-Powered Dating Messages',
  description: 'Generate perfect dating app messages with AI assistance.',
};

export const viewport = {
  maximumScale: 1, // Disable auto-zoom on mobile Safari
};

const LIGHT_THEME_COLOR = 'hsl(0 0% 100%)';
const DARK_THEME_COLOR = 'hsl(240deg 10% 3.92%)';
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get authenticated user with the helper (avoids warning)
  const { user } = await getAuthenticatedUser();
  
  // Get session separately for client-side use (doesn't cause warnings)
  const { session } = await getAuthSession();
  
  // Only fetch subscription if we have a valid user
  let subscription = null;
  if (user?.id) {
    try {
      // Initialize Supabase client
      const supabase = await createClient();
      
      // Get subscription data safely
      const { data: subscriptionData, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (subscriptionData && !error) {
        subscription = subscriptionData;
      }
    } catch (error) {
      // Silent error handling to avoid breaking the layout
      console.error('Error fetching subscription:', error);
    }
  }
  
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />
      </head>
      <body className="antialiased">
        <Providers initialSession={session}>
          <SubscriptionProvider initialSubscription={subscription}>
            <Toaster position="top-center" />
            {children}
          </SubscriptionProvider>
        </Providers>
      </body>
    </html>
  );
}