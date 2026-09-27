import { ControlGlyph, Pictogram } from "@/app/design-system/iconography";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-6 py-16 text-foreground sm:px-10 lg:px-16">
      <div
        data-visual-atmosphere
        data-visual-motion
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-30 motion-safe:animate-pulse"
        style={{
          background:
            "radial-gradient(circle at 12% 14%, rgba(111, 67, 213, .42), transparent 34%), radial-gradient(circle at 84% 72%, rgba(139, 221, 211, .2), transparent 30%)",
        }}
      />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl flex-col justify-between gap-16">
        <section className="max-w-3xl space-y-7">
          <Pictogram
            name="orchestration.workflow"
            size={32}
            className="text-[var(--lg-signal)]"
          />
          <p
            data-visual-accent
            className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--lg-signal)]"
          >
            Agentic delivery environment
          </p>
          <h1 data-visual-hero-copy className="font-serif text-5xl leading-[0.95] sm:text-7xl">
            A governed starting point.
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Build the product from a precise, reviewable design foundation.
          </p>
          <Button data-ledger-ui="button">
            <ControlGlyph name="control.run" data-ledger-slot="leading-glyph" />
            Start building
          </Button>
        </section>

        <section
          data-visual-paper
          className="lg-paper grid gap-5 rounded-lg bg-background p-7 text-foreground shadow-2xl sm:grid-cols-[1fr_auto] sm:items-end"
        >
          <div className="space-y-2">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Governed foundation
            </p>
            <h2 className="font-serif text-3xl">Ready for a deliberate first iteration.</h2>
            <p data-visual-paper-copy className="max-w-xl text-sm text-muted-foreground">
              The scaffold carries exact design provenance, semantic iconography, and visual
              acceptance evidence. Human review still owns taste.
            </p>
          </div>
          <span className="font-mono text-xs text-[var(--lg-accent)]">Frontira Ledger 4.8</span>
        </section>
      </div>
    </main>
  );
}
