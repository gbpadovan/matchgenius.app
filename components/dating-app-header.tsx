'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface DatingAppHeaderProps {
  variant?: 'default' | 'chat';
}

export function DatingAppHeader({ variant = 'default' }: DatingAppHeaderProps) {
  const [mounted, setMounted] = useState(false);

  // Handle hydration issues by mounting client-side components after initial render
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={cn("sticky top-0 z-50 w-full border-b bg-background px-4", {
      'header-chat': variant === 'chat'
    })}>
      <Card className="border-none shadow-none">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-between items-center">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <CardTitle className="text-2xl font-bold">Match Genius</CardTitle>
            </Link>
          </div>

          <CardDescription className="text-lg">
            Your AI-powered dating message assistant
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}