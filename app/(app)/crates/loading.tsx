import { cn } from "@/lib/utils/class-names";

export default function CratesLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-2">
        <div className="h-3 w-24 animate-pulse rounded bg-zinc-800" />
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-800" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-zinc-800/80" />
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className={cn(
              "h-32 animate-pulse rounded-xl border border-zinc-800/80",
              "bg-zinc-900/40 ring-1 ring-inset ring-white/5",
            )}
          />
        ))}
      </ul>
    </div>
  );
}
