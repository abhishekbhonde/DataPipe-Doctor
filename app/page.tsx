import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
        Your dbt tests just failed. <span className="text-black/50 dark:text-white/50">Here&apos;s why.</span>
      </h1>
      <p className="max-w-xl text-black/60 dark:text-white/60">
        DataPipe Doctor reads the failing model&apos;s SQL, its lineage, and sample bad rows — then explains the root
        cause in plain English instead of leaving you to trace it by hand.
      </p>
      <Link
        href={userId ? "/dashboard" : "/sign-up"}
        className="rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background"
      >
        {userId ? "Go to dashboard" : "Get started"}
      </Link>
    </div>
  );
}
