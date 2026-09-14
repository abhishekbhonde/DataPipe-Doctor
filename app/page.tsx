import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { StatusBadge } from "@/components/StatusBadge";
import { SiteHeader } from "@/components/SiteHeader";
import { Spotlight } from "@/components/Spotlight";
import { GlowCard } from "@/components/GlowCard";
import { GitBranchIcon, SparkleIcon, ActivityIcon, ArrowDownIcon } from "@/components/icons";
import styles from "./page.module.css";

const FEATURES = [
  {
    icon: GitBranchIcon,
    title: "Reads your real lineage",
    body: "Parses dbt's own manifest.json — no separate SQL parser to keep in sync with your project.",
  },
  {
    icon: SparkleIcon,
    title: "Explains, doesn't just alert",
    body: "An LLM reads the failing model's SQL, its parents, and sample bad rows to write the actual root cause.",
  },
  {
    icon: ActivityIcon,
    title: "Catches flaky tests",
    body: "Tracks pass/fail across runs and flags tests that fail intermittently, not just the ones failing right now.",
  },
];

const STEPS = [
  { title: "Connect your dbt project", body: "A one-line CLI wraps your existing dbt build/test command — no config rewrite." },
  { title: "Push run results", body: "The CLI reads dbt's own manifest and run results and pushes them after every run." },
  { title: "Get the root cause", body: "Failing tests are explained in plain English, grounded in your actual SQL and lineage." },
];

export default async function Home() {
  const { userId } = await auth();

  return (
    <div className={styles.page}>
      <SiteHeader signedIn={!!userId} />

      <section className={styles.hero}>
        <Spotlight />
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <span className={styles.eyebrow}>
              <span className={styles.eyebrowDot} />
              For dbt pipelines
            </span>
            <h1 className={styles.title}>
              Your dbt tests just failed.
              <br />
              <span className={styles.accent}>Here&apos;s why.</span>
            </h1>
            <p className={styles.subtitle}>
              DataPipe Doctor reads the failing model&apos;s SQL, its lineage, and sample bad rows — then explains
              the root cause in plain English instead of leaving you to trace it by hand.
            </p>
            <div className={styles.actions}>
              <Link href={userId ? "/dashboard" : "/sign-up"} className={styles.buttonPrimary}>
                {userId ? "Go to dashboard" : "Get started free"}
              </Link>
              <Link href="/sign-in" className={styles.buttonSecondary}>
                Sign in
              </Link>
            </div>
            <p className={styles.microcopy}>Free to start · No credit card required</p>
          </div>

          <ProductPreview />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <p className={styles.sectionEyebrow}>How it works</p>
          <h2 className={styles.sectionTitle}>From a red test to a fix, in three steps</h2>
        </div>
        <div className={styles.steps}>
          {STEPS.map((s, i) => (
            <div key={s.title} className={styles.step}>
              <span className={styles.stepNumber}>{i + 1}</span>
              <p className={styles.stepTitle}>{s.title}</p>
              <p className={styles.stepBody}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section} style={{ paddingTop: 0 }}>
        <div className={styles.featureGrid}>
          {FEATURES.map((f) => (
            <GlowCard key={f.title} className={styles.feature}>
              <span className={styles.featureIcon}>
                <f.icon width={18} height={18} />
              </span>
              <p className={styles.featureTitle}>{f.title}</p>
              <p className={styles.featureBody}>{f.body}</p>
            </GlowCard>
          ))}
        </div>
      </section>

      <section className={styles.ctaBand}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Stop tracing failures by hand</h2>
          <p className={styles.ctaBody}>
            Connect a project and see a real root-cause explanation on your very next failing test.
          </p>
          <Link href={userId ? "/dashboard" : "/sign-up"} className={styles.buttonPrimary}>
            {userId ? "Go to dashboard" : "Get started free"}
          </Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} DataPipe Doctor</span>
        <span>Built for dbt</span>
      </footer>
    </div>
  );
}

function ProductPreview() {
  return (
    <GlowCard className={styles.preview}>
      <div className={styles.previewDots}>
        <span className={`${styles.dot} ${styles.dotCritical}`} />
        <span className={`${styles.dot} ${styles.dotWarning}`} />
        <span className={`${styles.dot} ${styles.dotGood}`} />
      </div>

      <div className={styles.testRow}>
        <span className={styles.testName}>not_null_orders_amount</span>
        <StatusBadge status="fail" />
      </div>

      <div className={styles.arrow}>
        <ArrowDownIcon width={16} height={16} />
      </div>

      <div className={styles.explanation}>
        <p className={styles.explanationLabel}>
          <SparkleIcon width={12} height={12} />
          AI root cause
        </p>
        <p className={styles.explanationBody}>
          The <code>orders</code> model LEFT JOINs payments, so orders without a successful payment get a{" "}
          <code>null</code> amount.
        </p>
      </div>
    </GlowCard>
  );
}
