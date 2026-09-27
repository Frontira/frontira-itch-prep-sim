import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-semibold tracking-tight">Hello from itch-prep-sim</h1>
      <p className="max-w-prose text-center text-muted-foreground">
        Your Next.js 16 + shadcn/ui scaffold is ready. Edit{" "}
        <code className="font-mono">app/page.tsx</code> to get started.
      </p>
      <Button>Get started</Button>
    </main>
  );
}
