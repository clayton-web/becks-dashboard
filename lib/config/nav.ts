export type AppNavItem = {
  href:
    | `/dashboard`
    | `/library`
    | `/crates`
    | `/recommendations`
    | `/recommendations/saved`
    | `/settings`;
  label: string;
};

export const APP_NAV_ITEMS: readonly AppNavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/library", label: "Library" },
  { href: "/crates", label: "Crates" },
  { href: "/recommendations", label: "Board" },
  { href: "/recommendations/saved", label: "Saved paths" },
  { href: "/settings", label: "Settings" },
] as const;
