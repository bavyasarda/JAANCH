import { DISCLAIMER } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="no-print border-t">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 text-xs text-muted-foreground flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>{DISCLAIMER}</p>
        <p>
          Open source · MIT ·{" "}
          <a className="underline underline-offset-2" href="https://github.com/bavyasarda/JAANCH" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </p>
      </div>
    </footer>
  );
}
