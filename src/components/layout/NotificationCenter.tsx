import {
  AlertTriangle,
  Bell,
  CheckCheck,
  ClipboardList,
  GitCompareArrows,
  Info,
  ShieldCheck,
  WalletCards,
  Activity,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/shared/States';
import { relativeTime } from '@/lib/format';
import type { AppNotification, NotificationType } from '@/types';
import { cn } from '@/lib/utils';

const typeIcon: Record<NotificationType, typeof Bell> = {
  apaar: WalletCards,
  validation: AlertTriangle,
  duplicate: GitCompareArrows,
  intake: Activity,
  submission: ClipboardList,
  review: ShieldCheck,
  system: Info,
};

export function NotificationCenter({
  notifications,
  unreadCount,
  viewAllPath,
  onMarkRead,
  onMarkAllRead,
  showViewAll = true,
}: {
  notifications: AppNotification[];
  unreadCount: number;
  viewAllPath: string;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  showViewAll?: boolean;
}) {
  const navigate = useNavigate();
  const recent = [...notifications].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        >
          <Bell className="size-4" aria-hidden />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-critical px-1 text-[9px] font-semibold leading-4 text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="xs"
              className="gap-1 text-2xs"
              onClick={(event) => {
                event.preventDefault();
                onMarkAllRead();
              }}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="size-3" aria-hidden /> Mark all read
            </Button>
          </div>
        </div>
        <DropdownMenuSeparator className="my-0" />
        {recent.length === 0 ? (
          <div className="p-3">
            <EmptyState title="No notifications" description="Updates about your records will appear here." />
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto scrollbar-thin py-1">
            {recent.map((notification) => {
              const Icon = typeIcon[notification.type];
              return (
                <DropdownMenuItem
                  key={notification.id}
                  onSelect={() => {
                    onMarkRead(notification.id);
                    navigate(notification.link);
                  }}
                  className={cn(
                    'items-start gap-2.5 px-3 py-2',
                    !notification.read && 'bg-secondary/[0.045]',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded',
                      notification.read ? 'bg-muted text-muted-foreground' : 'bg-secondary/10 text-secondary',
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-1.5">
                      <span className="flex-1 text-xs font-medium leading-snug text-foreground">
                        {notification.title}
                      </span>
                      {!notification.read && (
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-secondary" aria-label="Unread" />
                      )}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-2xs leading-relaxed text-muted-foreground">
                      {notification.body}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground/80">
                      {relativeTime(notification.at)}
                    </span>
                  </span>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
        {showViewAll && (
          <>
            <DropdownMenuSeparator className="my-0" />
            <div className="p-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-2xs"
                onClick={() => navigate(viewAllPath)}
              >
                View all notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
