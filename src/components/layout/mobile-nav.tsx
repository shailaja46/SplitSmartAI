'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Compass, Sparkles, FileSpreadsheet, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const pathname = usePathname();

  const links = [
    { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Trips', href: '/trips', icon: Compass },
    { label: 'AI', href: '/ai-insights', icon: Sparkles },
    { label: 'Reports', href: '/reports', icon: FileSpreadsheet },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 px-2 py-1.5 z-40 flex items-center justify-around shadow-lg">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[11px] font-medium transition-all',
              isActive ? 'text-indigo-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-900'
            )}
          >
            <Icon className={cn('w-5 h-5 mb-0.5', isActive ? 'text-indigo-600' : 'text-slate-400')} />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
