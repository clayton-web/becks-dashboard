import Link from "next/link";

export default function CrateNotFound() {
  return (
    <div className="flex flex-col items-start gap-6 py-4">
      <h1 className="text-xl font-semibold text-zinc-100">Crate not found</h1>
      <p className="max-w-md text-sm text-zinc-400">
        This crate does not exist or you do not have access to it.
      </p>
      <Link
        href="/crates"
        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
      >
        Back to crates
      </Link>
    </div>
  );
}
