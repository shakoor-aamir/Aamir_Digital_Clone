"use client";

import { useEffect, useRef, useState } from "react";
import { useSpeechInput } from "@/hooks/useSpeechInput";
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
  onJobDescriptionProvidedChange: (value: boolean) => void;
  onLoadingChange: (value: boolean) => void;
  onErrorChange: (value: string | null) => void;
}

const AUTO_SUBMIT_ON_SPEECH_END = false;

export function InterviewForm({
  answerMode,
  roleTarget,
  loading,
  error,
  onDataChange,
  onAnswerModeChange,
  onRoleTargetChange,
  onJobDescriptionProvidedChange,
  onLoadingChange,
  onErrorChange
}: InterviewFormProps) {
  const [question, setQuestion] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const startingQuestionRef = useRef("");
  const {
    isReady,
    isSupported,
    isListening,
    transcript,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechInput();
  const canUseSpeech = isReady && isSupported;
  const micTitle = !isReady
    ? "Checking voice input..."
    : isSupported
      ? "Start voice input"
      : "Voice input not supported in this browser";

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
    onJobDescriptionProvidedChange(Boolean(jobDescription.trim()));

    try {
      const response = await fetch("/api/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question,
          answerMode,
          roleTarget,
          jobDescription
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

  function toggleListening() {
    if (isListening) {
      stopListening();
      return;
    }

    window.dispatchEvent(new Event("aamir-audio-stop"));
    startingQuestionRef.current = question.trim();
    resetTranscript();
    startListening();
  }

  useEffect(() => {
    if (!isListening && !transcript) {
      return;
    }

    const merged = [startingQuestionRef.current, transcript.trim()]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    setQuestion(merged);
  }, [isListening, transcript]);

  useEffect(() => {
    if (!AUTO_SUBMIT_ON_SPEECH_END || isListening || !transcript.trim()) {
      return;
    }

    const form = document.getElementById("interview-form") as HTMLFormElement | null;
    form?.requestSubmit();
  }, [isListening, transcript]);

  return (
    <form className="space-y-5" id="interview-form" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-medium text-[var(--text)]" htmlFor="question">
            Interview question
          </label>
          <div className="flex items-center gap-3">
            {isListening ? (
              <span className="inline-flex items-center gap-2 text-xs font-medium text-[var(--accent)]">
                <span className="h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse"></span>
                Listening...
              </span>
            ) : null}
            <button
              type="button"
              onClick={toggleListening}
              disabled={!canUseSpeech}
              title={micTitle}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--text)] transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isListening ? "Stop" : "Start voice input"}
            </button>
          </div>
        </div>
        <textarea
          id="question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={8}
          placeholder="How would you describe your approach to leading platform work across product, architecture, and delivery?"
          className="min-h-[220px] w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm leading-6 text-[var(--text)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(13,92,99,0.12)]"
        />
        {isReady && !isSupported ? (
          <p className="text-sm text-[var(--muted)]">
            Voice input is not supported in this browser.
          </p>
        ) : null}
        {speechError ? (
          <p className="text-sm text-red-600">{speechError}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label
          className="text-sm font-medium text-[var(--text)]"
          htmlFor="jobDescription"
        >
          Job Description (optional)
        </label>
        <textarea
          id="jobDescription"
          value={jobDescription}
          onChange={(event) => setJobDescription(event.target.value)}
          rows={8}
          placeholder="Paste the job description here to tailor the answer for a specific role..."
          className="min-h-[200px] w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm leading-6 text-[var(--text)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(13,92,99,0.12)]"
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
