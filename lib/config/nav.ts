export type AppNavItem = {
  href: `/dashboard` | `/library` | `/crates` | `/analysis` | `/settings`;
  label: string;
};

export const APP_NAV_ITEMS: readonly AppNavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/library", label: "Library" },
  { href: "/crates", label: "Crates" },
  { href: "/analysis", label: "Analysis" },
  { href: "/settings", label: "Settings" },
] as const;
