'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function AuthError() {
  return (
    <div className="flex h-dvh w-screen items-center justify-center bg-background">
      <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-8 p-8">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">Authentication Error</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            There was a problem with your authentication. This could be due to an expired link or an issue with your account.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <Button asChild>
            <Link href="/login">
              Try logging in again
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">
              Return to home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
