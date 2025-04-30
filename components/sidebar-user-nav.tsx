'use client';
import { ChevronUp } from 'lucide-react';
import Image from 'next/image';
import type { User } from '@supabase/supabase-js';
import { signOut } from '@/app/(auth)/actions';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { HomeIcon, CreditCardIcon, SettingsIcon } from '@/components/icons';
import { useSidebar } from '@/components/ui/sidebar';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

export function SidebarUserNav({ user }: { user: User | null }) {
  const { setTheme, theme } = useTheme();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  const handleNavigate = (path: string) => {
    setOpenMobile(false);
    router.push(path);
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent bg-background data-[state=open]:text-sidebar-accent-foreground h-10 w-full">
              <div className="flex items-center gap-2 p-2">
                <div className="rounded-full overflow-hidden h-8 w-8 bg-primary/10">
                  <Image
                    src={`/avatars/0${Math.floor(Math.random() * 8) + 1}.png`}
                    alt={user?.email || 'User'}
                    width={32}
                    height={32}
                  />
                </div>
                <span className="truncate flex-1 text-left">{user?.email}</span>
                <ChevronUp className="h-4 w-4 shrink-0" />
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="bottom"
            align="start"
            className="w-[--radix-popper-anchor-width]"
          >
            <DropdownMenuItem
              className="flex items-center gap-2 cursor-pointer"
              onSelect={() => handleNavigate('/')}
            >
              <HomeIcon className="h-4 w-4" />
              <span>Home</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2 cursor-pointer"
              onSelect={() => handleNavigate('/pricing')}
            >
              <CreditCardIcon className="h-4 w-4" />
              <span>Pricing</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2 cursor-pointer"
              onSelect={() => handleNavigate('/account')}
            >
              <SettingsIcon className="h-4 w-4" />
              <span>Account</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {`Toggle ${theme === 'light' ? 'dark' : 'light'} mode`}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <button
                type="button"
                className="w-full cursor-pointer"
                onClick={() => signOut()}
              >
                Sign out
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
