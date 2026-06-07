'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = {
  href: string;
  label: string;
  badge?: number | string;
  icon: (p: { className?: string }) => React.ReactElement;
};

const Icon = {
  inbox: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  ),
  doc: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8" /><path d="M8 17h8" /><path d="M8 9h2" />
    </svg>
  ),
  network: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" />
      <path d="M12 7v3M12 10l-5 7M12 10l5 7" />
    </svg>
  ),
  ledger: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h5" />
    </svg>
  ),
  chart: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21V3" /><path d="M3 21h18" /><rect x="7" y="13" width="3" height="6" /><rect x="12" y="9" width="3" height="10" /><rect x="17" y="5" width="3" height="14" />
    </svg>
  ),
  shield: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  sun: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  ),
  search: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
    </svg>
  ),
  bell: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  ),
  chevron: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
  chevronDown: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  logo: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 32 32" className={className}>
      <rect width="32" height="32" rx="8" fill="#3162d6" />
      <rect x="9" y="10" width="14" height="2.2" rx="1.1" fill="#fff" />
      <rect x="9" y="14" width="14" height="2.2" rx="1.1" fill="#fff" />
      <rect x="9" y="18" width="9" height="2.2" rx="1.1" fill="#fff" />
      <rect x="9" y="22" width="11" height="2.2" rx="1.1" fill="#fff" />
    </svg>
  ),
};

const NAV: NavItem[] = [
  { href: '/portal/queue', label: 'Intake Queue', icon: Icon.inbox },
  { href: '/portal/case', label: 'Case Review', icon: Icon.doc },
  { href: '/portal/firms', label: 'Firm Network', icon: Icon.network },
  { href: '/portal/referrals', label: 'Referral Tracking', icon: Icon.ledger },
  { href: '/portal/capacity', label: 'Attorney Capacity', icon: Icon.chart },
  { href: '/portal/safety', label: 'Safety & Compliance', icon: Icon.shield },
  { href: '/portal/settings', label: 'Settings', icon: Icon.sun },
];

const FIRMS = [
  { id: 'BayBridge_Auto_Injury', name: 'BayBridge Auto Injury', initials: 'BA', region: 'CA' },
  { id: 'Summit_Commercial_Auto', name: 'Summit Commercial Auto', initials: 'SC', region: 'CA' },
  { id: 'Pacific_Complex_Collision', name: 'Pacific Complex Collision', initials: 'PC', region: 'CA' },
  { id: 'Vista_Auto_Justice', name: 'Vista Auto Justice', initials: 'VA', region: 'CA' },
];

function crumbFor(pathname: string): string {
  if (pathname.startsWith('/portal/queue')) return 'Intake Queue';
  if (pathname.startsWith('/portal/case')) return 'Case Review';
  if (pathname.startsWith('/portal/firms')) return 'Firm Network';
  if (pathname.startsWith('/portal/referrals')) return 'Referral Tracking';
  if (pathname.startsWith('/portal/capacity')) return 'Attorney Capacity';
  if (pathname.startsWith('/portal/safety')) return 'Safety & Compliance';
  if (pathname.startsWith('/portal/settings')) return 'Settings';
  return '';
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [firmId, setFirmId] = useState('BayBridge_Auto_Injury');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [counts, setCounts] = useState<{ queue: number; referrals: number }>({ queue: 0, referrals: 0 });

  useEffect(() => {
    const stored = document.cookie.split('; ').find((c) => c.startsWith('firm_id='))?.split('=')[1];
    if (stored) setFirmId(stored);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/leads?firm_id=${firmId}`);
        if (!r.ok) return;
        const leads = await r.json();
        if (cancelled) return;
        const queue = leads.filter((l: { status?: string }) => !['consult_booked', 'referred', 'declined'].includes(l.status ?? 'new')).length;
        const referrals = leads.filter((l: { status?: string; triage?: { path?: string } }) =>
          l.status === 'placing' || l.status === 'referred' || l.triage?.path === 'referral'
        ).length;
        setCounts({ queue, referrals });
      } catch {}
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => { cancelled = true; clearInterval(id); };
  }, [firmId]);

  const chooseFirm = (id: string) => {
    setFirmId(id);
    document.cookie = `firm_id=${id}; path=/; max-age=31536000`;
    setPickerOpen(false);
    window.location.reload();
  };

  const currentFirm = FIRMS.find((f) => f.id === firmId) ?? FIRMS[0];

  return (
    <div className="flex h-screen w-screen bg-cf-cream text-cf-ink">
      {/* Sidebar */}
      <aside className="relative flex w-[260px] flex-col bg-cf-sidebar text-cf-sidebar-text">
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-7">
          <Icon.logo className="size-9 flex-none" />
          <div className="leading-tight">
            <div className="font-serif text-[20px] font-semibold tracking-tight text-white">Caseflow</div>
            <div className="text-[10px] font-medium tracking-[0.18em] text-cf-muted-2/80">AUTO</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="px-3 flex-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = item.href === '/portal/queue'
              ? pathname === '/portal/queue' || pathname === '/portal'
              : pathname.startsWith(item.href);
            const badge =
              item.href === '/portal/queue' ? counts.queue || undefined :
              item.href === '/portal/referrals' ? counts.referrals || undefined : undefined;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition-colors ${
                  active
                    ? 'bg-cf-sidebar-active text-white ring-1 ring-white/5'
                    : 'text-cf-sidebar-text hover:bg-cf-sidebar-hover hover:text-white'
                }`}
              >
                <item.icon className="size-[18px] flex-none opacity-80" />
                <span className="flex-1">{item.label}</span>
                {badge !== undefined && (
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    item.href === '/portal/referrals' ? 'bg-cf-blue text-white' : 'bg-white/15 text-white'
                  }`}>{badge}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Firm switcher */}
        <div className="p-3">
          {pickerOpen && (
            <div className="mb-2 overflow-hidden rounded-xl bg-cf-sidebar-active ring-1 ring-white/5">
              {FIRMS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => chooseFirm(f.id)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-[13px] hover:bg-white/5 ${
                    f.id === firmId ? 'text-white' : 'text-cf-sidebar-text'
                  }`}
                >
                  <span className="grid size-7 place-items-center rounded bg-cf-blue text-[11px] font-semibold text-white">
                    {f.initials}
                  </span>
                  <span className="flex-1 truncate">{f.name}</span>
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="flex w-full items-center gap-3 rounded-xl bg-cf-sidebar-active px-3 py-2.5 text-left transition-colors hover:bg-white/5"
          >
            <span className="grid size-9 flex-none place-items-center rounded-md bg-cf-blue text-[12px] font-semibold text-white">
              {currentFirm.initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-white">{currentFirm.name}</span>
              <span className="block truncate text-[11px] text-cf-muted-2">Network member · {currentFirm.region}</span>
            </span>
            <Icon.chevronDown className={`size-4 text-cf-muted-2 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="flex h-[68px] flex-none items-center gap-4 border-b border-cf-border bg-cf-cream/90 px-8 backdrop-blur">
          <nav className="flex items-center gap-2 text-[14px] text-cf-muted">
            <span>Caseflow</span>
            <Icon.chevron className="size-3.5 text-cf-muted-2" />
            <span className="font-medium text-cf-ink">{crumbFor(pathname)}</span>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button className="grid size-9 place-items-center rounded-full text-cf-ink-2 hover:bg-black/5"><Icon.search className="size-[18px]" /></button>
            <button className="relative grid size-9 place-items-center rounded-full text-cf-ink-2 hover:bg-black/5">
              <Icon.bell className="size-[18px]" />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-cf-red" />
            </button>
            <div className="ml-1 grid size-9 place-items-center rounded-full bg-cf-blue text-[12px] font-semibold text-white">SO</div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-cf-cream">
          {children}
        </main>
      </div>
    </div>
  );
}
