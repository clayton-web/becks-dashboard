import { cn } from "@/lib/utils/class-names";

export default function CrateDetailLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="h-3 w-16 animate-pulse rounded bg-zinc-800" />
      <div className="space-y-3">
        <div className="h-9 w-2/3 max-w-md animate-pulse rounded bg-zinc-800" />
        <div className="h-3 w-56 animate-pulse rounded bg-zinc-800/90" />
        <div className="h-20 w-full max-w-2xl animate-pulse rounded bg-zinc-900/60" />
      </div>
      <div
        className={cn(
          "h-80 animate-pulse rounded-xl border border-zinc-800/80",
          "bg-zinc-900/30 ring-1 ring-inset ring-white/5",
        )}
      />
    </div>
  );
}
