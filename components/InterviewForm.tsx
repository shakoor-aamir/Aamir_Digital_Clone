"use client";

import { useState } from "react";
import {
  ANSWER_MODES,
  AnswerMode,
  AnswerResponse,
  ROLE_TARGETS,
  RoleTarget
} from "@/lib/types";

interface InterviewFormProps {
  answerMode: AnswerMode;
  roleTarget: RoleTarget;
  loading: boolean;
  error: string | null;
  onDataChange: (value: AnswerResponse | null) => void;
  onAnswerModeChange: (value: AnswerMode) => void;
  onRoleTargetChange: (value: RoleTarget) => void;
  onLoadingChange: (value: boolean) => void;
  onErrorChange: (value: string | null) => void;
}

export function InterviewForm({
  answerMode,
  roleTarget,
  loading,
  error,
  onDataChange,
  onAnswerModeChange,
  onRoleTargetChange,
  onLoadingChange,
  onErrorChange
}: InterviewFormProps) {
  const [question, setQuestion] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onErrorChange(null);

    if (!question.trim()) {
      const message = "Please enter an interview question.";
      onErrorChange(message);
      onDataChange(null);
      return;
    }

    onLoadingChange(true);
    onDataChange(null);

    try {
      const response = await fetch("/api/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question,
          answerMode,
          roleTarget
        })
      });

      const payload = (await response.json()) as AnswerResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to generate an answer right now.");
      }

      onDataChange(payload);
      onErrorChange(null);
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Unable to generate an answer right now.";
      onErrorChange(message);
      onDataChange(null);
    } finally {
      onLoadingChange(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--text)]" htmlFor="question">
          Interview question
        </label>
        <textarea
          id="question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={8}
          placeholder="How would you describe your approach to leading platform work across product, architecture, and delivery?"
          className="min-h-[220px] w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm leading-6 text-[var(--text)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(13,92,99,0.12)]"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-[var(--text)]"
            htmlFor="answerMode"
          >
            Answer mode
          </label>
          <select
            id="answerMode"
            value={answerMode}
            onChange={(event) => onAnswerModeChange(event.target.value as AnswerMode)}
            className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(13,92,99,0.12)]"
          >
            {ANSWER_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium text-[var(--text)]"
            htmlFor="roleTarget"
          >
            Role target
          </label>
          <select
            id="roleTarget"
            value={roleTarget}
            onChange={(event) => onRoleTargetChange(event.target.value as RoleTarget)}
            className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(13,92,99,0.12)]"
          >
            {ROLE_TARGETS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Generating answer..." : "Generate answer"}
        </button>
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="inline-flex h-12 items-center justify-center rounded-2xl border border-dashed border-[var(--border-strong)] bg-white/40 px-5 text-sm font-medium text-[var(--muted)]"
        >
          Mic coming soon
        </button>
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}
