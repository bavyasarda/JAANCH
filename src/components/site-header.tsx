import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { ScanSearch } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="no-print sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <ScanSearch className="size-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">
            Jaanch <span className="text-muted-foreground font-semibold">जाँच</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/" className="rounded-md px-3 py-1.5 hover:bg-accent">Home</Link>
          <Link href="/rules" className="rounded-md px-3 py-1.5 hover:bg-accent">Rules</Link>
          <Link href="/about" className="rounded-md px-3 py-1.5 hover:bg-accent">About</Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
