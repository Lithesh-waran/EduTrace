import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTE_TITLES } from './navigation';
import { useEduTrace } from '@/lib/demo/store';
import { cn } from '@/lib/utils';

interface Crumb {
  label: string;
  to?: string;
}

function buildCrumbs(pathname: string, entityLabels: Record<string, string>): Crumb[] {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return [{ label: 'Dashboard' }];
  const scope = segments[0];
  const home = scope === 'admin' ? '/admin/dashboard' : '/institution/dashboard';
  const crumbs: Crumb[] = [{ label: 'Dashboard', to: home }];

  if (segments[1] === 'students' && segments[2]) {
    crumbs.push({ label: 'Student records', to: `/${scope}/students` });
    crumbs.push({ label: entityLabels[segments[2]] ?? 'Student record' });
    return crumbs;
  }
  if (segments[1] === 'submissions' && segments[2]) {
    crumbs.push({ label: 'Submissions', to: `/${scope}/submissions` });
    crumbs.push({ label: segments[2] });
    return crumbs;
  }
  if (segments[1] === 'institutions' && segments[2]) {
    crumbs.push({ label: 'Institution registry', to: '/admin/institutions' });
    crumbs.push({ label: entityLabels[segments[2]] ?? 'Institution details' });
    return crumbs;
  }

  const fullPath = `/${segments.join('/')}`;
  const title = ROUTE_TITLES[fullPath];
  if (title) crumbs.push({ label: title });
  return crumbs;
}

export function Breadcrumbs({ className }: { className?: string }) {
  const { pathname } = useLocation();
  const { data } = useEduTrace();

  const entityLabels: Record<string, string> = {};
  if (pathname.includes('/institutions/')) {
    for (const institution of data.institutions) entityLabels[institution.id] = institution.name;
  } else if (pathname.includes('/students/')) {
    for (const student of data.students) entityLabels[student.id] = `Record ${student.recordId}`;
  }

  const crumbs = buildCrumbs(pathname, entityLabels);

  return (
    <nav aria-label="Breadcrumb" className={cn('mb-3', className)}>
      <ol className="flex flex-wrap items-center gap-1 text-2xs text-muted-foreground">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="size-3 text-border" aria-hidden />}
              {crumb.to && !isLast ? (
                <Link
                  to={crumb.to}
                  className="inline-flex items-center gap-1 rounded px-0.5 hover:text-secondary hover:underline"
                >
                  {index === 0 && <Home className="size-3" aria-hidden />}
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current={isLast ? 'page' : undefined} className={cn(isLast && 'font-medium text-foreground')}>
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
