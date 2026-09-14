# DataPipe Doctor

An AI tool that explains **why** your data pipeline broke, not just that it did.

## Problem

When a dbt/data pipeline test fails ("null values found", "duplicate keys"), it tells you *what* broke but not *why*. Engineers waste time manually tracing lineage and SQL to find the real cause.

## What it does

- Reads your dbt pipeline's run results and lineage (which models depend on which)
- When a test fails, an AI looks at the failing model's SQL, its upstream dependencies, and sample bad rows
- Explains the likely root cause in plain English and suggests a fix
- Shows everything on a simple dashboard: pipeline runs, a lineage graph, and pass/fail trends

## Stack

Next.js, Postgres, AI Gateway (LLM), React Flow (lineage graph), deployed on Vercel.
