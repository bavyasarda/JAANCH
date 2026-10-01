import { JaanchForm } from "@/components/jaanch-form";

export default function Home() {
  return (
    <div className="jaali-bg flex-1">
      <section className="mx-auto w-full max-w-5xl px-4 pt-10 pb-6 text-center sm:pt-16">
        <p className="text-sm font-medium text-primary">Legal Metrology label checker · भारत</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
          Jaanch <span className="text-muted-foreground">जाँच</span>
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">Packet ki jaanch, aapki bhasha mein.</p>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
          Upload a label photo or paste a product link. An AI agent checks it against the Legal Metrology
          (Packaged Commodities) Rules, 2011, explains the result in your language, and drafts the next step for you.
        </p>
      </section>
      <section className="mx-auto w-full max-w-3xl px-4 pb-16">
        <JaanchForm />
      </section>
    </div>
  );
}
