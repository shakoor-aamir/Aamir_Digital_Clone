"use client";

import { useState } from "react";
import { AnswerMode, AnswerResponse, RoleTarget } from "@/lib/types";

interface AnswerCardProps {
  data: AnswerResponse | null;
  answerMode: AnswerMode;
  roleTarget: RoleTarget;
  loading: boolean;
  error: string | null;
}

export function AnswerCard({
  data,
  answerMode,
  roleTarget,
  loading,
  error
}: AnswerCardProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");

  async function handleCopy() {
    if (!data?.answer) {
      return;
    }

    await navigator.clipboard.writeText(data.answer);
    setCopyStatus("copied");
    window.setTimeout(() => setCopyStatus("idle"), 1800);
  }

  return (
    <aside className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] p-5">
      <div className="flex h-full flex-col">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">Generated answer</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Grounded output with support notes and experience tags.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!data?.answer}
            className="inline-flex h-10 items-center rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--text)] transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copyStatus === "copied" ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="flex-1 rounded-[20px] border border-[var(--border)] bg-white/80 p-4">
          {loading ? (
            <div className="space-y-3">
              <div className="h-4 w-28 animate-pulse rounded bg-[var(--background-strong)]" />
              <div className="h-4 w-full animate-pulse rounded bg-[var(--background-strong)]" />
              <div className="h-4 w-[92%] animate-pulse rounded bg-[var(--background-strong)]" />
              <div className="h-4 w-[74%] animate-pulse rounded bg-[var(--background-strong)]" />
            </div>
          ) : data ? (
            <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--text)]">
              {data.answer}
            </p>
          ) : (
            <p className="text-sm leading-7 text-[var(--muted)]">
              Ask a question to generate an answer grounded in the curated Aamir
              profile documents.
            </p>
          )}
        </div>

        <div className="mt-4 space-y-3 rounded-[20px] border border-[var(--border)] bg-white/70 p-4 text-sm">
          <div className="flex items-start justify-between gap-4">
            <span className="text-[var(--muted)]">Answer mode</span>
            <span className="text-right font-medium text-[var(--text)]">{answerMode}</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <span className="text-[var(--muted)]">Role target</span>
            <span className="text-right font-medium text-[var(--text)]">{roleTarget}</span>
          </div>
          <div className="space-y-2">
            <span className="block text-[var(--muted)]">Experience areas used</span>
            <div className="flex flex-wrap gap-2">
              {(data?.experienceAreasUsed?.length
                ? data.experienceAreasUsed
                : ["Awaiting answer"]).map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1 text-xs font-medium text-[var(--text)]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <span className="block text-[var(--muted)]">Confidence note</span>
            <p className="leading-6 text-[var(--text)]">
              {error
                ? error
                : data?.supportNote ||
                  "Support checking will appear here after generation."}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
