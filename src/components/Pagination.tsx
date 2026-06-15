"use client";

// Compact, self-hiding pagination. Renders nothing for a single page, so small
// lists are unaffected. Shows first/last + a window around the current page.
export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav className="mt-8 flex items-center justify-center gap-1.5">
      <PageButton disabled={page <= 1} onClick={() => onChange(page - 1)} label="Previous">
        ←
      </PageButton>
      {pageList(page, totalPages).map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1.5 text-sm text-muted">
            …
          </span>
        ) : (
          <PageButton key={p} active={p === page} onClick={() => onChange(p)}>
            {p}
          </PageButton>
        )
      )}
      <PageButton disabled={page >= totalPages} onClick={() => onChange(page + 1)} label="Next">
        →
      </PageButton>
    </nav>
  );
}

function PageButton({
  children,
  onClick,
  active,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm transition disabled:opacity-30 ${
        active
          ? "border-accent bg-accent text-white"
          : "border-border text-muted hover:border-accent/60 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

// e.g. [1, "…", 4, 5, 6, "…", 10] — first, last, and a ±1 window around current.
function pageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) out.push("…");
  for (let i = left; i <= right; i++) out.push(i);
  if (right < total - 1) out.push("…");
  out.push(total);
  return out;
}
