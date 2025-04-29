import type { Metadata } from 'next';
import { Toaster } from 'sonner';

import { Providers } from '@/components/providers/index';
import { SubscriptionProvider } from '@/hooks/use-subscription';
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
  // Fetch the user's subscription
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  let subscription = null;
  
  if (session?.user?.id) {
    try {
      // Get subscription from Supabase
      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      subscription = subscriptionData;
      console.log('Root Layout: Fetched initial subscription data for user:', session.user.id);
    } catch (error) {
      console.error('Root Layout: Error fetching subscription data:', error);
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
        <Providers>
          <SubscriptionProvider initialSubscription={subscription}>
            <Toaster position="top-center" />
            {children}
          </SubscriptionProvider>
        </Providers>
      </body>
    </html>
  );
}