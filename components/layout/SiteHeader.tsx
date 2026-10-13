'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Menu, X } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
}

export const PUBLIC_LINKS: NavItem[] = [
  { href: '/map', label: 'Map' },
  { href: '/flows', label: 'Waste flows' },
  { href: '/water', label: 'Water' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/stakeholder', label: 'Sites' },
];

interface Props {
  links?: NavItem[];
  /** Short label shown after the name, for example the section. */
  section?: string;
  /** Extra actions at the right, such as Admin or Sign out. Shown in the mobile menu too. */
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
      isCurrent(pathname, href) ? 'text-accent' : 'text-fg-muted hover:text-fg'
    }`;

  return (
    <header className="relative z-30 shrink-0 border-b border-line bg-panel">
      <div className="page flex min-h-14 items-center justify-between gap-4">
        <Link href="/map" className="flex min-h-11 items-center gap-3 rounded">
          <span className="text-base font-semibold text-fg">WasteChainMapper</span>
          <span className="hidden text-sm text-fg-muted sm:inline">{section ?? 'Rivers State'}</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass(l.href)} aria-current={isCurrent(pathname, l.href) ? 'page' : undefined}>
              {l.label}
            </Link>
          ))}
          {children && <div className="ml-2 flex items-center gap-1 border-l border-line pl-3">{children}</div>}
        </nav>

        <button
          ref={buttonRef}
          type="button"
          className="btn-ghost md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <nav id="mobile-menu" aria-label="Main" className="absolute inset-x-0 top-full bg-panel-2 shadow-raised md:hidden">
          <ul className="page py-2">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`${linkClass(l.href)} w-full`}
                  aria-current={isCurrent(pathname, l.href) ? 'page' : undefined}
                >
                  {l.label}
                </Link>
              </li>
            ))}
            {children && <li className="mt-2 flex flex-col gap-1 border-t border-line pt-2">{children}</li>}
          </ul>
        </nav>
      )}
    </header>
  );
}
