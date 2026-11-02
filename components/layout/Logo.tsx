/** The mark: a map pin with a leaf, drawn in the accent colour so it follows the theme. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M16 2.5c-5.8 0-10.5 4.5-10.5 10.2 0 7.6 10.5 16.8 10.5 16.8s10.5-9.2 10.5-16.8C26.5 7 21.8 2.5 16 2.5z" className="fill-accent" />
      <path d="M16 20.5c-3.6-.3-5.8-2.7-5.8-6.2 0-.7.1-1.4.3-2 3.7.1 6.7 1 8.6 2.7 1.7 1.6 1.5 3.6 1.5 5.1-1.1.3-3 .5-4.6.4z" className="fill-accent-fg" />
      <path d="M12.4 17.4c2.3-2.3 4.6-3.5 7-4.1" className="stroke-accent" strokeWidth="1.1" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="text-base font-semibold tracking-tight text-fg">WasteChainMapper</span>
    </span>
  );
}
