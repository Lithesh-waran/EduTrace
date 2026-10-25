import { GraduationCap, ShieldCheck } from 'lucide-react';

export function AuthLayout({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="relative hidden flex-col justify-between bg-[#0f2947] px-10 py-9 text-white lg:flex">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded bg-white/10">
              <GraduationCap className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-base font-semibold leading-tight">EduTrace</p>
              <p className="text-[11px] leading-tight text-white/60">Student data management &amp; verification</p>
            </div>
          </div>

          <h1 className="mt-14 max-w-md text-[28px] font-semibold leading-[1.2] tracking-tight">
            APAAR-based student data management and verification for AICTE-approved institutions.
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">
            Institutions maintain enrolment records, track identifier status and resolve
            discrepancies. AICTE reviewers monitor submissions, intake compliance and institution
            verification from one administrative workspace.
          </p>

          <ul className="mt-8 space-y-3 text-sm text-white/75">
            {[
              'Deterministic validation rules with row-level evidence',
              'Approved intake compared against verified active enrolment',
              'Submission, correction and review workflow with audit history',
              'Role-scoped portals for institutions and AICTE administrators',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#8fb6de]" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2 border-t border-white/10 pt-4 text-[11px] leading-relaxed text-white/55">
          <p>
            Smart India Hackathon 2026 · Problem Statement 26263. This build is a frontend
            demonstration with synthetic data.
          </p>
          <p>
            No live APAAR/ABC or AICTE integration is performed. Production authentication is
            intended to use Keycloak with OpenID Connect.
          </p>
        </div>
      </aside>

      <main className="flex min-h-screen flex-col justify-center px-4 py-8 sm:px-8">
        <div className="mx-auto w-full max-w-[26rem]">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <span className="flex size-8 items-center justify-center rounded bg-primary text-primary-foreground">
              <GraduationCap className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight">EduTrace</p>
              <p className="text-[10px] leading-tight text-muted-foreground">
                APAAR-based student data verification
              </p>
            </div>
          </div>
          <div className="mb-5">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
