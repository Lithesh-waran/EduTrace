import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { Breadcrumbs } from './Breadcrumbs';

const COLLAPSED_KEY = 'edutrace.sidebar.collapsed';

export function AppShell() {
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    try {
      return window.localStorage.getItem(COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        /* ignore storage errors */
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden border-r border-[#0d2340] transition-[width] duration-200 lg:block',
          collapsed ? 'w-16' : 'w-64',
        )}
        aria-label="Primary navigation"
      >
        <AppSidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent className="w-72 p-0">
          <SheetTitle>EduTrace navigation</SheetTitle>
          <SheetDescription>Portal navigation for the signed-in role.</SheetDescription>
          <AppSidebar mobile onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div
        className={cn(
          'flex min-h-screen flex-col transition-[margin] duration-200',
          collapsed ? 'lg:ml-16' : 'lg:ml-64',
        )}
      >
        <AppHeader onOpenMobileNav={() => setMobileOpen(true)} compact={collapsed} />
        <main id="main-content" className="mx-auto w-full max-w-[1500px] flex-1 px-3 py-4 sm:px-5 sm:py-5">
          <Breadcrumbs />
          <Outlet />
        </main>
        <footer className="mx-auto w-full max-w-[1500px] px-3 pb-5 sm:px-5">
          <div className="border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground">
            <p>
              EduTrace · APAAR-Based Student Data Management and Verification Platform · Smart India
              Hackathon 2026, Problem Statement 26263.
            </p>
            <p>
              Frontend demonstration. Deterministic validation only — no AI/ML. Not an official AICTE
              system, and not evidence of identity verification or regulatory approval.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
