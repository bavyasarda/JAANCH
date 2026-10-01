import { DISCLAIMER } from "@/lib/constants";

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 prose prose-neutral dark:prose-invert">
      <h1 className="text-3xl font-bold">About Jaanch</h1>
      <p className="mt-3 text-muted-foreground">
        Jaanch checks whether a packaged product&apos;s label follows India&apos;s Legal Metrology (Packaged Commodities)
        Rules, 2011, explains the result in the user&apos;s own language, and takes a role-based action. Inspired by
        SIH 2026 PS 26034 (Ministry of Consumer Affairs).
      </p>
      <p className="mt-6 rounded-lg border bg-accent/40 p-3 text-sm">{DISCLAIMER}</p>
    </div>
  );
}
