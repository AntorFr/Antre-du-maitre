import type { ReactNode } from 'react';

export type IconName =
  | 'admin'
  | 'battle'
  | 'book'
  | 'check'
  | 'clock'
  | 'gem'
  | 'location'
  | 'logout'
  | 'magic'
  | 'map'
  | 'mic'
  | 'monster'
  | 'moon'
  | 'note'
  | 'scenario'
  | 'search'
  | 'shield'
  | 'skull'
  | 'spark'
  | 'star'
  | 'stop'
  | 'todo'
  | 'user'
  | 'users'
  | 'world'
  | 'zap';

type IconProps = {
  name: IconName;
  className?: string;
  title?: string;
};

const ICONS: Record<IconName, ReactNode> = {
  admin: (
    <>
      <path d="M12 3l7 3v5c0 4.5-2.9 8.4-7 10-4.1-1.6-7-5.5-7-10V6l7-3z" />
      <path d="M9.5 12.5l1.8 1.8 3.7-4" />
    </>
  ),
  battle: (
    <>
      <path d="M14.5 4.5l5 5" />
      <path d="M19 5l-9.8 9.8-2.2.7.7-2.2L17.5 3.5z" />
      <path d="M4.5 19.5l5-5" />
    </>
  ),
  book: (
    <>
      <path d="M5 4.5h10a3 3 0 0 1 3 3v12H7a2 2 0 0 1-2-2z" />
      <path d="M5 16.5A2.5 2.5 0 0 1 7.5 14H18" />
      <path d="M8 8h6" />
    </>
  ),
  check: (
    <>
      <path d="M20 6L9 17l-5-5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  gem: (
    <>
      <path d="M6.5 4.5h11L21 9l-9 11L3 9z" />
      <path d="M3 9h18" />
      <path d="M8 9l4 11 4-11" />
      <path d="M8 4.5L6.5 9" />
      <path d="M16 4.5L17.5 9" />
    </>
  ),
  location: (
    <>
      <path d="M12 21s6-5.2 6-11a6 6 0 0 0-12 0c0 5.8 6 11 6 11z" />
      <circle cx="12" cy="10" r="2" />
    </>
  ),
  logout: (
    <>
      <path d="M9 6H6.5A2.5 2.5 0 0 0 4 8.5v7A2.5 2.5 0 0 0 6.5 18H9" />
      <path d="M14 8l4 4-4 4" />
      <path d="M18 12H9" />
    </>
  ),
  magic: (
    <>
      <path d="M4 20l10-10" />
      <path d="M13 5l1-2 1 2 2 1-2 1-1 2-1-2-2-1z" />
      <path d="M19 12l.7-1.4.7 1.4 1.4.7-1.4.7-.7 1.4-.7-1.4-1.4-.7z" />
      <path d="M7 4l.6-1.2L8.2 4l1.2.6-1.2.6-.6 1.2L7 5.2l-1.2-.6z" />
    </>
  ),
  map: (
    <>
      <path d="M9 18l-5 2V6l5-2 6 2 5-2v14l-5 2z" />
      <path d="M9 4v14" />
      <path d="M15 6v14" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
      <path d="M8.5 21h7" />
    </>
  ),
  stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
  monster: (
    <>
      <path d="M7 9V6.5A2.5 2.5 0 0 1 9.5 4h5A2.5 2.5 0 0 1 17 6.5V9" />
      <path d="M5 10.5h14v5A4.5 4.5 0 0 1 14.5 20h-5A4.5 4.5 0 0 1 5 15.5z" />
      <path d="M9 14h.01" />
      <path d="M15 14h.01" />
      <path d="M10 17h4" />
    </>
  ),
  moon: (
    <>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a7.5 7.5 0 1 0 10.5 10.5z" />
    </>
  ),
  note: (
    <>
      <path d="M6 3.5h8l4 4V20H6z" />
      <path d="M14 3.5V8h4" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </>
  ),
  scenario: (
    <>
      <path d="M7 3.5h7l3 3V20H7z" />
      <path d="M14 3.5V7h3" />
      <path d="M9.5 11h5" />
      <path d="M9.5 14.5h5" />
      <path d="M9.5 18h3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16l4 4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v5c0 4.5-2.9 8.4-7 10-4.1-1.6-7-5.5-7-10V6l7-3z" />
    </>
  ),
  skull: (
    <>
      <path d="M12 3.5c-4 0-7 2.8-7 6.8 0 2.5 1.2 4.5 3 5.7v3h8v-3c1.8-1.2 3-3.2 3-5.7 0-4-3-6.8-7-6.8z" />
      <path d="M9 11h.01" />
      <path d="M15 11h.01" />
      <path d="M11 14h2" />
      <path d="M10 19v-2" />
      <path d="M14 19v-2" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />
      <path d="M4.5 4l.5 1.5L6.5 6 5 6.5 4.5 8 4 6.5 2.5 6 4 5.5z" />
    </>
  ),
  star: (
    <>
      <path d="M12 3.5l2.5 5 5.5.8-4 3.9.9 5.5L12 16.1 7.1 18.7l.9-5.5-4-3.9 5.5-.8z" />
    </>
  ),
  todo: (
    <>
      <path d="M8 6h12" />
      <path d="M8 12h12" />
      <path d="M8 18h12" />
      <path d="M4 6l1 1 2-2" />
      <path d="M4 12l1 1 2-2" />
      <path d="M4 18l1 1 2-2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M15 11a3 3 0 1 0-.6-5.9" />
      <path d="M17 20a5.5 5.5 0 0 0-3-4.9" />
    </>
  ),
  world: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16" />
      <path d="M12 4a12 12 0 0 1 0 16" />
      <path d="M12 4a12 12 0 0 0 0 16" />
    </>
  ),
  zap: (
    <>
      <path d="M13 2L4.5 13h7L11 22l8.5-12h-7z" />
    </>
  ),
};

export function Icon({ name, className = 'h-4 w-4', title }: IconProps) {
  return (
    <svg
      aria-hidden={title ? undefined : true}
      className={className}
      fill="none"
      focusable="false"
      role={title ? 'img' : undefined}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
      viewBox="0 0 24 24"
    >
      {title ? <title>{title}</title> : null}
      {ICONS[name]}
    </svg>
  );
}
