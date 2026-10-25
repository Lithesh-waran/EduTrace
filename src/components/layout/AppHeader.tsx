import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  FlaskConical,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth/AuthProvider';
import { initials } from '@/lib/format';
import { ROLE_LABELS } from '@/types';
import { useEduTrace } from '@/lib/demo/store';
import { NotificationCenter } from './NotificationCenter';
import { cn } from '@/lib/utils';

export function AppHeader({
  onOpenMobileNav,
  compact = false,
}: {
  onOpenMobileNav: () => void;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const { user, signOut, isDemo } = useAuth();
  const { data, actions } = useEduTrace();
  const scope = user?.scope ?? 'institution';

  const notifications = data.notifications.filter((notification) =>
    scope === 'admin'
      ? notification.institutionId === null
      : notification.institutionId === user?.institutionId,
  );
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  if (!user) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
        >
          <Menu className="size-5" />
        </Button>

        <div className={cn('min-w-0 flex-1', compact && 'lg:pl-1')}>
          <p className="truncate text-2xs font-medium uppercase tracking-wide text-muted-foreground">
            {scope === 'admin' ? 'AICTE administration' : 'Institution portal'}
          </p>
          <p className="truncate text-sm font-semibold leading-tight text-foreground">
            {scope === 'admin' ? 'National student data oversight' : user.name}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {isDemo && (
            <Badge variant="warning" className="hidden items-center gap-1 sm:inline-flex">
              <FlaskConical className="size-3" aria-hidden /> Demo data
            </Badge>
          )}
          <NotificationCenter
            notifications={notifications}
            unreadCount={unreadCount}
            viewAllPath={scope === 'admin' ? '/admin/settings' : '/institution/notifications'}
            onMarkRead={(id) => actions.markNotificationsRead([id])}
            onMarkAllRead={() => actions.markAllNotificationsRead(scope === 'admin' ? null : user.institutionId ?? null)}
            showViewAll={scope !== 'admin'}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 px-1.5" aria-label="Open profile menu">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-2xs font-semibold text-primary-foreground">
                  {initials(user.name)}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block max-w-[10rem] truncate text-xs font-medium leading-tight">
                    {user.name}
                  </span>
                  <span className="block text-[10px] leading-tight text-muted-foreground">
                    {ROLE_LABELS[user.role]}
                  </span>
                </span>
                <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Signed in</DropdownMenuLabel>
              <div className="px-2 pb-1.5">
                <p className="text-sm font-medium text-foreground">{user.name}</p>
                <p className="truncate text-2xs text-muted-foreground">{user.email}</p>
                <p className="mt-1 text-2xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
              </div>
              <DropdownMenuSeparator />
              <div className="flex items-start gap-1.5 px-2 py-1.5 text-2xs leading-relaxed text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-secondary" aria-hidden />
                {isDemo
                  ? 'Demo sign-in. Production authentication uses Keycloak (OIDC).'
                  : 'Authenticated through the configured identity provider.'}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate(scope === 'admin' ? '/admin/settings' : '/institution/settings')}>
                <Settings aria-hidden /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate(scope === 'admin' ? '/admin/users' : '/institution/users')}>
                <UserRound aria-hidden /> Account &amp; roles
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                tone="critical"
                onSelect={async () => {
                  await signOut();
                  navigate('/login');
                }}
              >
                <LogOut aria-hidden /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-warning/25 bg-warning/10 px-3 py-1 text-[10px] leading-4 text-[#7a5508] sm:px-4">
        <FlaskConical className="size-3 shrink-0" aria-hidden />
        <span className="font-medium">Demonstration build.</span>
        <span className="text-[#7a5508]/85">
          Synthetic records · APAAR/ABC verification simulated · no official AICTE system of record.
        </span>
        <Link
          to={scope === 'admin' ? '/admin/integrations' : '/institution/settings'}
          className="ml-auto hidden shrink-0 font-medium underline underline-offset-2 hover:text-[#5c3f05] sm:inline"
        >
          Integration status
        </Link>
      </div>
    </header>
  );
}
