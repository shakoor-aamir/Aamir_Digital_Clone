"use client";

import { useEffect, useState } from "react";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { AnswerMode, AnswerResponse, RoleTarget } from "@/lib/types";

interface AnswerCardProps {
  data: AnswerResponse | null;
  answerMode: AnswerMode;
  roleTarget: RoleTarget;
  jobDescriptionProvided: boolean;
  loading: boolean;
  error: string | null;
}

const AUTO_PLAY = true;

export function AnswerCard({
  data,
  answerMode,
  roleTarget,
  jobDescriptionProvided,
  loading,
  error
}: AnswerCardProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const audio = useAudioPlayer();

  async function handleCopy() {
    if (!data?.answer) {
      return;
    }

    await navigator.clipboard.writeText(data.answer);
    setCopyStatus("copied");
    window.setTimeout(() => setCopyStatus("idle"), 1800);
  }

  async function handlePlayAudio() {
    if (!data?.answer) {
      return;
    }

    await audio.play(data.answer);
  }

  async function handleReplayAudio() {
    if (!data?.answer) {
      return;
    }

    if (audio.currentText !== data.answer) {
      await audio.play(data.answer);
      return;
    }

    await audio.replay();
  }

  useEffect(() => {
    if (!data?.answer) {
      audio.stop();
      return;
    }

    if (audio.currentText && audio.currentText !== data.answer) {
      audio.stop();
    }
  }, [data?.answer]);

  useEffect(() => {
    if (!AUTO_PLAY || !data?.answer) {
      return;
    }

    if (audio.currentText === data.answer) {
      return;
    }

    void audio.play(data.answer);
  }, [data?.answer]);

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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePlayAudio}
              disabled={!data?.answer || audio.isLoading}
              className="inline-flex h-10 items-center rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--text)] transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {audio.isLoading
                ? "Loading..."
                : audio.isPlaying && audio.currentText === data?.answer
                  ? "Pause"
                  : "Play"}
            </button>
            <button
              type="button"
              onClick={handleReplayAudio}
              disabled={!data?.answer || audio.isLoading}
              className="inline-flex h-10 items-center rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--text)] transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Replay
            </button>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!data?.answer}
              className="inline-flex h-10 items-center rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--text)] transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copyStatus === "copied" ? "Copied" : "Copy"}
            </button>
          </div>
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
            <div className="space-y-3">
              {jobDescriptionProvided ? (
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                  Tailored to the supplied job description
                </p>
              ) : null}
              {(audio.isLoading || (audio.isPlaying && audio.currentText === data.answer)) ? (
                <div className="inline-flex items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-2">
                  <div
                    className={`audio-wave ${audio.isPlaying ? "is-playing" : "is-loading"}`}
                    aria-hidden="true"
                  >
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="text-xs font-medium text-[var(--muted)]">
                    {audio.isLoading ? "Generating voice..." : "Playing response"}
                  </span>
                </div>
              ) : null}
              <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--text)]">
                {data.answer}
              </p>
              {audio.error ? (
                <p className="text-sm text-red-600">{audio.error}</p>
              ) : null}
            </div>
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
