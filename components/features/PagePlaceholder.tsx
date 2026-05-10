import { cn } from "@/lib/utils/class-names";

type PagePlaceholderProps = {
  title: string;
  subtitle?: string;
  phase?: string;
};

export function PagePlaceholder({
  title,
  subtitle,
  phase,
}: PagePlaceholderProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-6 py-8",
        "ring-1 ring-inset ring-white/5",
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-violet-400/90">
        {phase ?? "Placeholder"}
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          {subtitle}
        </p>
      ) : null}
    </section>
  );
}
