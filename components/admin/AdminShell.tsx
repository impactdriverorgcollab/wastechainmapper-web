'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ExternalLink, LogOut, Menu, X } from 'lucide-react';
import { Wordmark } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import type { NavItem } from '@/components/layout/SiteHeader';

export interface NavGroup {
  label: string;
  links: NavItem[];
}

interface Props {
  groups: NavGroup[];
  /** Short name of the area, shown beside the product name: Admin or Partner. */
  section: string;
  /** Who is signed in, shown in the top bar so a shared computer is not a surprise. */
  person?: string | null;
  onSignOut: () => void;
  children: ReactNode;
}

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The staff area has more pages than fit in one header row. The top bar holds who is signed in and
 * the account actions. The pages are listed in groups: in a column beside the content on wide
 * screens, and in a menu on phones and tablets.
 */
export function AdminShell({ groups, section, person, onSignOut, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const list = (
    <ul className="space-y-5">
      {groups.map((g) => (
        <li key={g.label}>
          <p className="mb-1 px-3 text-xs font-semibold text-fg-subtle">{g.label}</p>
          <ul>
            {g.links.map((l) => {
              const current = isCurrent(pathname, l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={current ? 'page' : undefined}
                    className={`flex min-h-11 items-center border-l-2 px-3 text-sm transition-colors duration-150 lg:min-h-9 ${
                      current ? 'border-accent bg-panel-2 font-semibold text-fg' : 'border-transparent text-fg-muted hover:bg-panel-2 hover:text-fg'
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="relative z-30 shrink-0 border-b border-line bg-panel">
        <div className="mx-auto flex h-14 w-full max-w-screen-2xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex shrink-0 items-center gap-3">
            <Link href="/" className="flex shrink-0 items-center rounded">
              <Wordmark />
              <span className="sr-only">home</span>
            </Link>
            <span className="hidden shrink-0 rounded bg-panel-3 px-2 py-0.5 text-xs font-semibold text-fg-muted sm:inline">{section}</span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {person && <span className="mr-2 hidden max-w-48 truncate text-sm text-fg-muted md:inline" title={person}>{person}</span>}
            <Link href="/map" className="btn-ghost hidden lg:inline-flex">
              Public site<ExternalLink size={14} aria-hidden="true" />
            </Link>
            <ThemeToggle />
            <button type="button" onClick={onSignOut} className="btn-ghost hidden lg:inline-flex">
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </button>
            <button
              ref={buttonRef}
              type="button"
              className="btn-ghost lg:hidden"
              aria-expanded={open}
              aria-controls="admin-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {open && (
          <nav id="admin-menu" aria-label={`${section} pages`} className="absolute inset-x-0 top-full max-h-menu overflow-y-auto border-b border-line bg-panel shadow-raised lg:hidden">
            <div className="mx-auto w-full max-w-screen-2xl px-4 py-4 sm:px-6">
              <p className="mb-5 truncate px-3 text-sm text-fg-muted md:hidden">{section} area{person ? `, signed in as ${person}` : ''}</p>
              {list}
              <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row">
                <Link href="/map" className="btn-ghost w-full sm:w-auto">Public site<ExternalLink size={14} aria-hidden="true" /></Link>
                <button type="button" onClick={onSignOut} className="btn-ghost w-full sm:w-auto">
                  <LogOut size={16} aria-hidden="true" />
                  Sign out
                </button>
              </div>
            </div>
          </nav>
        )}
      </header>

      <div className="mx-auto flex w-full max-w-screen-2xl flex-1">
        <nav aria-label={`${section} pages`} className="hidden w-56 shrink-0 border-r border-line pl-3 lg:block">
          <div className="sticky top-0 max-h-dvh overflow-y-auto py-6 pr-3">{list}</div>
        </nav>
        <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
