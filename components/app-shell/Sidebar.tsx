"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAV_ITEMS } from "@/lib/config/nav";
import { cn } from "@/lib/utils/class-names";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex w-[15rem] shrink-0 flex-col border-r border-zinc-800/80",
        "bg-zinc-950/80 backdrop-blur-sm",
      )}
    >
      <div className="flex h-14 items-center border-b border-zinc-800/80 px-4">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Workspace
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="App">
        {APP_NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-zinc-800/90 text-zinc-50"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
