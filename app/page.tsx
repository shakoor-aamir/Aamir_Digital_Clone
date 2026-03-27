import { Workspace } from "@/components/Workspace";

export default function HomePage() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)] backdrop-blur">
          <div className="border-b border-[var(--border)] px-6 py-8 sm:px-8">
            <div className="max-w-3xl space-y-3">
              <span className="inline-flex rounded-full border border-[var(--border)] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                Weekend v1 MVP
              </span>
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)] sm:text-4xl">
                Aamir Interview Agent
              </h1>
              <p className="text-sm leading-6 text-[var(--muted)] sm:text-base">
                Ask an interview question and get a grounded answer assembled only
                from curated profile documents, with clear support notes and
                experience areas used.
              </p>
            </div>
          </div>
          <Workspace />
        </section>
      </div>
    </main>
  );
}
