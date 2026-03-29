import { NextResponse } from "next/server";
import { generateAnswer } from "@/lib/model";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompt";
import { retrieveRelevantContext } from "@/lib/retrieval";
import {
  ANSWER_MODES,
  AnswerRequestBody,
  ROLE_TARGETS
} from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<AnswerRequestBody>;
    const question = body.question?.trim();
    const jobDescription = body.jobDescription?.trim();

    if (!question) {
      return NextResponse.json(
        { error: "Please enter an interview question." },
        { status: 400 }
      );
    }

    if (!body.answerMode || !ANSWER_MODES.includes(body.answerMode)) {
      return NextResponse.json(
        { error: "Invalid answer mode." },
        { status: 400 }
      );
    }

    if (!body.roleTarget || !ROLE_TARGETS.includes(body.roleTarget)) {
      return NextResponse.json(
        { error: "Invalid role target." },
        { status: 400 }
      );
    }

    console.log("JOB DESCRIPTION PROVIDED:", Boolean(jobDescription));

    const retrieval = await retrieveRelevantContext(
      question,
      body.roleTarget,
      jobDescription
    );
    const systemPrompt = await buildSystemPrompt();
    const userPrompt = buildUserPrompt({
      question,
      answerMode: body.answerMode,
      roleTarget: body.roleTarget,
      sections: retrieval.sections,
      jobDescriptionSignals: retrieval.jobDescriptionSignals,
      jobDescriptionProvided: Boolean(jobDescription)
    });

    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: userPrompt
      }
    ];

    console.log("===== FINAL PROMPT START =====");
    console.log(JSON.stringify(messages, null, 2));
    console.log("===== FINAL PROMPT END =====");

    const answer = await generateAnswer({
      systemPrompt,
      userPrompt
    });

    const experienceAreasUsed = answer.experienceAreasUsed.length
      ? answer.experienceAreasUsed
      : retrieval.experienceAreas;

    return NextResponse.json({
      answer: answer.answer,
      experienceAreasUsed,
      supportNote: answer.supportNote,
      debug: {
        retrievedChunksCount: retrieval.sections.length
      }
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate answer.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
