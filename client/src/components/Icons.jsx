/* Small inline icon set (24x24, stroke). No icon library needed. */
const base = (props) => ({
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  ...props,
});

export const Home = (p) => (
  <svg {...base(p)}><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>
);
export const Building = (p) => (
  <svg {...base(p)}><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3" /></svg>
);
export const Receipt = (p) => (
  <svg {...base(p)}><path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21z" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>
);
export const Wrench = (p) => (
  <svg {...base(p)}><path d="M14.5 6.5a4 4 0 0 0 5 5L13 18a2 2 0 0 1-3-3l6.5-6.5a4 4 0 0 0-2-2z" /><path d="M5 21l4-4" /></svg>
);
export const Plus = (p) => <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>;
export const Bell = (p) => (
  <svg {...base(p)}><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
);
export const Activity = (p) => <svg {...base(p)}><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>;
export const LogOut = (p) => (
  <svg {...base(p)}><path d="M10 4H5v16h5" /><path d="M14 8l4 4-4 4M18 12H9" /></svg>
);
export const Calendar = (p) => (
  <svg {...base(p)}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
);
export const Check = (p) => <svg {...base(p)}><path d="M5 12.5 10 17 19 7" /></svg>;
export const Clock = (p) => <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
export const Wallet = (p) => (
  <svg {...base(p)}><path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2" /><rect x="3" y="7" width="18" height="12" rx="2" /><circle cx="16" cy="13" r="1.3" /></svg>
);
export const Users = (p) => (
  <svg {...base(p)}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><circle cx="17" cy="9" r="2.5" /><path d="M15.5 14.5a5 5 0 0 1 6 5" /></svg>
);
export const Door = (p) => (
  <svg {...base(p)}><path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17" /><path d="M3 21h18" /><circle cx="15" cy="12" r="1" /></svg>
);
export const Trend = (p) => <svg {...base(p)}><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></svg>;
export const Bolt = (p) => <svg {...base(p)}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>;
export const Drop = (p) => <svg {...base(p)}><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" /></svg>;
export const Wifi = (p) => (
  <svg {...base(p)}><path d="M2.5 9a15 15 0 0 1 19 0M6 12.5a10 10 0 0 1 12 0M9.5 16a5 5 0 0 1 5 0" /><circle cx="12" cy="19" r="1" fill="currentColor" /></svg>
);
export const Alert = (p) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
);
export const ChevronLeft = (p) => <svg {...base(p)}><path d="m15 6-6 6 6 6" /></svg>;
export const ChevronRight = (p) => <svg {...base(p)}><path d="m9 6 6 6-6 6" /></svg>;
export const X = (p) => <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>;
export const Edit = (p) => (
  <svg {...base(p)}><path d="M4 20h4l10-10-4-4L4 16z" /><path d="M13 7l4 4" /></svg>
);
export const Trash = (p) => (
  <svg {...base(p)}><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" /></svg>
);
export const Menu = (p) => <svg {...base(p)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
export const Send = (p) => <svg {...base(p)}><path d="M21 3 10 14" /><path d="M21 3l-7 18-4-7-7-4z" /></svg>;
export const Phone = (p) => (
  <svg {...base(p)}><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></svg>
);
