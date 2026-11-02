'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { Wordmark } from './Logo';
import { ThemeToggle } from './ThemeToggle';

export interface NavItem {
  href: string;
  label: string;
}

export const PUBLIC_LINKS: NavItem[] = [
  { href: '/map', label: 'Map' },
  { href: '/hotspots', label: 'Hotspots' },
  { href: '/stakeholder', label: 'Sites' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/flows', label: 'Waste flows' },
  { href: '/water', label: 'Water' },
  { href: '/about', label: 'How it works' },
];

interface Props {
  links?: NavItem[];
  /** Short label shown after the name, for example the section. */
  section?: string;
  /** Extra actions at the right, such as Report waste or Sign out. Shown in the mobile menu too. */
  children?: ReactNode;
}

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ links = PUBLIC_LINKS, section, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close the menu after navigating.
  useEffect(() => { setOpen(false); }, [pathname]);

  // Escape closes the menu and puts focus back on the button.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const linkClass = (href: string) =>
    `inline-flex min-h-11 items-center rounded px-3 text-sm font-semibold transition-colors duration-150 ${
      isCurrent(pathname, href) ? 'bg-accent-soft text-accent' : 'text-fg-muted hover:bg-panel-3 hover:text-fg'
    }`;

  return (
    <header className="relative z-30 shrink-0 border-b border-line bg-panel">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex min-h-11 items-center gap-3 rounded" aria-label="WasteChainMapper home">
          <Wordmark />
          {section && <span className="hidden rounded bg-panel-3 px-2 py-0.5 text-xs font-semibold text-fg-muted sm:inline">{section}</span>}
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass(l.href)} aria-current={isCurrent(pathname, l.href) ? 'page' : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          {children && <div className="hidden items-center gap-1 lg:flex">{children}</div>}
          <button
            ref={buttonRef}
            type="button"
            className="btn-ghost lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-menu" aria-label="Main" className="absolute inset-x-0 top-full border-b border-line bg-panel shadow-raised lg:hidden">
          <ul className="mx-auto w-full max-w-7xl px-4 py-2 sm:px-6">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={`${linkClass(l.href)} w-full`} aria-current={isCurrent(pathname, l.href) ? 'page' : undefined}>
                  {l.label}
                </Link>
              </li>
            ))}
            {children && <li className="mt-2 flex flex-col gap-2 border-t border-line pt-3 [&>*]:w-full">{children}</li>}
          </ul>
        </nav>
      )}
    </header>
  );
}
