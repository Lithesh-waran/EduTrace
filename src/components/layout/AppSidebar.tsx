import * as React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, GraduationCap, Landmark } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/AuthProvider';
import { isOpenIssue } from '@/lib/demo/analytics';
import { useEduTrace } from '@/lib/demo/store';
import { cn } from '@/lib/utils';
import { navForScope } from './navigation';

export function AppSidebar({
  collapsed = false,
  onToggleCollapse,
  onNavigate,
  mobile = false,
}: {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  const { user, can, isDemo } = useAuth();
  const { data } = useEduTrace();
  const scope = user?.scope ?? 'institution';
  const sections = navForScope(scope);

  const badges = React.useMemo(() => {
    const institutionId = user?.institutionId;
    const inScope = (id: string | null) =>
      scope === 'admin' ? true : id === null || id === institutionId;
    return {
      issues: data.issues.filter((issue) => isOpenIssue(issue) && inScope(issue.institutionId)).length,
      submissions: data.submissions.filter(
        (submission) =>
          inScope(submission.institutionId) &&
          ['Submitted', 'Resubmitted', 'Under Review', 'Validation in Progress'].includes(
            submission.status,
          ),
      ).length,
      notifications: data.notifications.filter(
        (notification) =>
          !notification.read &&
          (scope === 'admin'
            ? notification.institutionId === null
            : notification.institutionId === user?.institutionId),
      ).length,
    };
  }, [data, scope, user?.institutionId]);

  const institutionName = React.useMemo(
    () =>
      user?.institutionId
        ? data.institutions.find((institution) => institution.id === user.institutionId)?.name
        : undefined,
    [data.institutions, user?.institutionId],
  );

  const showText = mobile || !collapsed;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0f2947] text-white">
      <div className={cn('flex items-start gap-2.5 px-3 py-3.5', !showText && 'justify-center px-2')}>
        <Link
          to={scope === 'admin' ? '/admin/dashboard' : '/institution/dashboard'}
          className="flex min-w-0 items-center gap-2.5 rounded focus-visible:ring-2 focus-visible:ring-white/70"
          onClick={onNavigate}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded bg-white/10">
            {scope === 'admin' ? (
              <Landmark className="size-4.5 text-white" aria-hidden />
            ) : (
              <GraduationCap className="size-5 text-white" aria-hidden />
            )}
          </span>
          {showText && (
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-tight tracking-tight">EduTrace</span>
              <span className="block truncate text-[10px] leading-tight text-white/60">
                {scope === 'admin' ? 'AICTE administration' : 'Institution portal'}
              </span>
            </span>
          )}
        </Link>
        {showText && isDemo && (
          <Badge className="ml-auto border-white/20 bg-white/10 text-[9px] uppercase tracking-wide text-white/80">
            Demo
          </Badge>
        )}
      </div>

      {showText && institutionName && (
        <p className="mx-3 mb-1 truncate border-t border-white/10 pt-2 text-[11px] leading-snug text-white/70" title={institutionName}>
          {institutionName}
        </p>
      )}

      <nav
        aria-label={scope === 'admin' ? 'AICTE administration navigation' : 'Institution navigation'}
        className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-1"
      >
        {sections.map((section) => {
          const items = section.items.filter((item) => !item.permission || can(item.permission));
          if (items.length === 0) return null;
          return (
            <div key={section.title} className="mb-3">
              {showText ? (
                <p className="px-2 pb-1 text-[9px] font-semibold uppercase tracking-[0.09em] text-white/45">
                  {section.title}
                </p>
              ) : (
                <div className="mx-2 mb-2 border-t border-white/10" aria-hidden />
              )}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const count = item.badge ? badges[item.badge] : 0;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={onNavigate}
                        title={!showText ? item.label : undefined}
                        aria-label={!showText ? item.label : undefined}
                        className={({ isActive }) =>
                          cn(
                            'group flex items-center gap-2.5 rounded px-2 py-1.5 text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-white/70',
                            isActive
                              ? 'bg-white/15 text-white shadow-inner'
                              : 'text-white/72 hover:bg-white/10 hover:text-white',
                            !showText && 'justify-center px-1.5',
                          )
                        }
                      >
                        <Icon className="size-4 shrink-0" aria-hidden />
                        {showText && <span className="truncate">{item.label}</span>}
                        {count > 0 && (
                          <span
                            className={cn(
                              'ml-auto rounded-full bg-[#D99416] px-1.5 py-px text-[9px] font-semibold leading-3 text-[#241a05]',
                              !showText && 'absolute right-1 top-1 ml-0',
                            )}
                          >
                            {count > 99 ? '99+' : count}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {!mobile && (
        <div className="border-t border-white/10 p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="w-full justify-center gap-1.5 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
            {showText && <span className="text-2xs">Collapse</span>}
          </Button>
        </div>
      )}
    </div>
  );
}
