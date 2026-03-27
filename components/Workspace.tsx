"use client";

import { useState } from "react";
import { AnswerCard } from "@/components/AnswerCard";
import { InterviewForm } from "@/components/InterviewForm";
import { AnswerMode, AnswerResponse, RoleTarget } from "@/lib/types";

export function Workspace() {
  const [data, setData] = useState<AnswerResponse | null>(null);
  const [answerMode, setAnswerMode] = useState<AnswerMode>("interview");
  const [roleTarget, setRoleTarget] = useState<RoleTarget>("AI Product Manager");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <InterviewForm
        answerMode={answerMode}
        roleTarget={roleTarget}
        loading={loading}
        error={error}
        onDataChange={setData}
        onAnswerModeChange={setAnswerMode}
        onRoleTargetChange={setRoleTarget}
        onLoadingChange={setLoading}
        onErrorChange={setError}
      />
      <AnswerCard
        data={data}
        answerMode={answerMode}
        roleTarget={roleTarget}
        loading={loading}
        error={error}
      />
    </div>
  );
}
