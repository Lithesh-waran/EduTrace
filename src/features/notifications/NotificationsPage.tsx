import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCheck,
  ClipboardList,
  GitCompareArrows,
  Info,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { Panel } from '@/components/shared/Panel';
import { EmptyState } from '@/components/shared/States';
import { SearchAndFilters } from '@/components/shared/SearchAndFilters';
import { useInstitutionData } from '@/hooks/useScopeData';
import { formatDateTime, formatNumber, relativeTime } from '@/lib/format';
import type { NotificationType } from '@/types';

const ICONS: Record<NotificationType, typeof Bell> = {
  apaar: WalletCards,
  validation: AlertTriangle,
  duplicate: GitCompareArrows,
  intake: Activity,
  submission: ClipboardList,
  review: ShieldCheck,
  system: Info,
};

const ALL = 'all';

export function NotificationsPage() {
  const { notifications, actions, institutionId } = useInstitutionData();
  const navigate = useNavigate();
  const [filter, setFilter] = React.useState(ALL);
  const [type, setType] = React.useState(ALL);
  const [query, setQuery] = React.useState('');

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return notifications.filter((notification) => {
      if (filter === 'unread' && notification.read) return false;
      if (filter === 'read' && !notification.read) return false;
      if (type !== ALL && notification.type !== type) return false;
      if (needle && !`${notification.title} ${notification.body}`.toLowerCase().includes(needle)) {
        return false;
      }
      return true;
    });
  }, [notifications, filter, type, query]);

  const unread = notifications.filter((notification) => !notification.read).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        description="Updates about validation findings, intake discrepancies, submissions and review decisions for your institution."
        meta={
          <>
            <Badge variant="outline">{formatNumber(notifications.length)} total</Badge>
            <Badge variant="critical">{formatNumber(unread)} unread</Badge>
          </>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => actions.markAllNotificationsRead(institutionId)}
            disabled={unread === 0}
          >
            <CheckCheck className="size-4" aria-hidden /> Mark all read
          </Button>
        }
      />

      <Panel bodyClassName="p-0">
        <div className="border-b border-border p-3">
          <SearchAndFilters
            search={query}
            onSearchChange={setQuery}
            searchLabel="Search notifications"
            searchPlaceholder="Search notification text"
            filters={[
              {
                key: 'read',
                label: 'Read state',
                value: filter,
                onChange: setFilter,
                options: [
                  { value: ALL, label: 'All notifications' },
                  { value: 'unread', label: 'Unread only' },
                  { value: 'read', label: 'Read only' },
                ],
              },
              {
                key: 'type',
                label: 'Category',
                value: type,
                onChange: setType,
                options: [
                  { value: ALL, label: 'All categories' },
                  { value: 'apaar', label: 'APAAR' },
                  { value: 'validation', label: 'Validation' },
                  { value: 'duplicate', label: 'Duplicates' },
                  { value: 'intake', label: 'Intake' },
                  { value: 'submission', label: 'Submissions' },
                  { value: 'review', label: 'Review' },
                  { value: 'system', label: 'System' },
                ],
              },
            ]}
            onReset={() => {
              setFilter(ALL);
              setType(ALL);
              setQuery('');
            }}
            resultLabel={`${formatNumber(filtered.length)} notification(s) shown.`}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No notifications match"
              description="Change the filters to see other notifications. New events appear as records and submissions change."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((notification) => {
              const Icon = ICONS[notification.type];
              return (
                <li
                  key={notification.id}
                  className={notification.read ? 'px-3 py-2.5' : 'bg-secondary/[0.035] px-3 py-2.5'}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={
                        notification.read
                          ? 'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground'
                          : 'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded bg-secondary/10 text-secondary'
                      }
                    >
                      <Icon className="size-3.5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-xs font-semibold text-foreground">{notification.title}</p>
                        {!notification.read && <Badge variant="info">Unread</Badge>}
                        <Badge variant="muted">{notification.type}</Badge>
                        <span className="ml-auto text-2xs text-muted-foreground">
                          {relativeTime(notification.at)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {notification.body}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                        {formatDateTime(notification.at)}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            actions.markNotificationsRead([notification.id]);
                            navigate(notification.link);
                          }}
                        >
                          Open related record
                        </Button>
                        {!notification.read && (
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => actions.markNotificationsRead([notification.id])}
                          >
                            Mark as read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <p className="text-2xs leading-relaxed text-muted-foreground">
        Notifications in this demonstration are generated locally when records, batches or review
        decisions change. Production notifications are delivered by the backend and may also use
        email or SMS through an approved provider.
      </p>
    </div>
  );
}
