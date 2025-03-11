'use client';

import type { User } from 'next-auth';
import { useRouter } from 'next/navigation';

import { PlusIcon, HomeIcon, CreditCardIcon, SettingsIcon } from '@/components/icons';
import { SidebarHistory } from '@/components/sidebar-history';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  const handleNavigate = (path: string) => {
    setOpenMobile(false);
    router.push(path);
  };

  return (
    <Sidebar className="group-data-[side=left]:border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row justify-between items-center">
            <Link
              href="/"
              onClick={() => {
                setOpenMobile(false);
              }}
              className="flex flex-row gap-3 items-center"
            >
              <span className="text-lg font-semibold px-2 hover:bg-muted rounded-md cursor-pointer">
                Match Perfect
              </span>
            </Link>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  type="button"
                  className="p-2 h-fit"
                  onClick={() => {
                    setOpenMobile(false);
                    router.push('/');
                    router.refresh();
                  }}
                >
                  <PlusIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent align="end">New Chat</TooltipContent>
            </Tooltip>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        {/* Navigation Links */}
        <div className="mb-4 px-3 py-2">
          <div className="flex flex-col space-y-1">
            <Link
              href="/"
              onClick={() => handleNavigate('/')}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-500 transition-all hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              <HomeIcon className="h-4 w-4" />
              <span>Home</span>
            </Link>
            
            <Link
              href="/pricing"
              onClick={() => handleNavigate('/pricing')}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-500 transition-all hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              <CreditCardIcon className="h-4 w-4" />
              <span>Pricing</span>
            </Link>
            
            <Link
              href="/account"
              onClick={() => handleNavigate('/account')}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-500 transition-all hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              <SettingsIcon className="h-4 w-4" />
              <span>Account</span>
            </Link>
          </div>
        </div>
        
        <div className="border-t my-2 mb-4"></div>
        
        <SidebarHistory user={user} />
      </SidebarContent>
      
      <SidebarFooter>{user && <SidebarUserNav user={user} />}</SidebarFooter>
    </Sidebar>
  );
}