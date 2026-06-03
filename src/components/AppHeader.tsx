import Link from "next/link";

export function AppHeader() {
  return (
    <header className="border-b border-border bg-surface/60 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight text-lg">
          <span className="text-accent">◆</span> Meta Creatives Generator
        </Link>
        <Link
          href="/projects/new"
          className="text-sm rounded-lg bg-accent px-4 py-2 font-medium text-white hover:opacity-90 transition"
        >
          + New project
        </Link>
      </div>
    </header>
  );
}
