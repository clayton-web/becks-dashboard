import type { ReactNode } from "react";

import { Sidebar } from "@/components/app-shell/Sidebar";
import { TopBar } from "@/components/app-shell/TopBar";

type AppShellProps = {
  children: ReactNode;
  userEmail: string;
};

export function AppShell({ children, userEmail }: AppShellProps) {
  return (
    <div className="flex min-h-full flex-1 bg-zinc-950 text-zinc-100">
      <Sidebar />
      <div className="flex min-h-0 flex-1 flex-col">
        <TopBar userEmail={userEmail} />
        <main id="main-content" className="flex-1 overflow-auto p-6">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
