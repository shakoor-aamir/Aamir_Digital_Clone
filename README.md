# AI Interview Agent — Profile-Grounded LLM System

## Overview
A lightweight AI-powered interview assistant that generates **credible, role-specific answers** grounded strictly in a curated professional profile.

The system is designed to eliminate hallucination and ensure every response is **defensible in a real interview**.

---

## Problem
Most AI-generated interview answers:
- sound generic
- hallucinate experience
- lack credibility for senior roles

This project addresses that by enforcing:
- strict grounding in real profile data
- controlled response styles
- validation before output

---

## Solution
A Next.js-based application that combines:
- structured profile knowledge base
- lightweight retrieval system
- constrained prompt engineering

The result:
👉 answers that sound real, senior, and defensible

---

## Key Features

### Profile-Grounded Responses
- Uses curated markdown files (profile, experience, guardrails)
- Prevents unsupported claims and hallucinations

### Answer Modes
- Concise
- Interview (structured 2-minute answers)
- Executive (high-signal bullets)
- Technical Deep Dive

### Role Targeting
Adapts answers based on role:
- Product Manager
- Product Owner
- System Architect
- AI Product Manager
- Embedded/Automotive Leader

### Guardrails (Critical)
- No fabricated experience
- No exaggerated impact
- Explicit handling of uncertainty
- Self-check before output

---

## Architecture

```text
User Input (UI)
   ↓
API Route (Next.js)
   ↓
Retrieval Layer (Markdown-based)
   ↓
Prompt Assembly
   ↓
LLM (Grounded Generation)
   ↓
Structured Output (Answer + Evidence)

# Aamir Interview Agent

A minimal Next.js MVP for generating interview answers that sound like Aamir Shakoor using only curated local profile documents.

## What it does

- Accepts an interview question
- Lets the user choose an answer mode and role target
- Retrieves the most relevant local profile sections with lightweight keyword scoring
- Assembles a deterministic server-side prompt from curated markdown files
- Calls an OpenAI-compatible chat completion endpoint
- Returns grounded answer text, experience areas used, and a support note

## Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- Local markdown knowledge base
- OpenAI-compatible HTTP API pattern

## Project structure

```text
app/
  api/answer/route.ts
  globals.css
  layout.tsx
  page.tsx
components/
  AnswerCard.tsx
  InterviewForm.tsx
data/
  answer_styles.md
  interview_agent_prompt.md
  interview_answer_bank.md
  master_profile.md
  red_lines.md
lib/
  model.ts
  prompt.ts
  retrieval.ts
  types.ts
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
copy .env.example .env.local
```

3. Add your API key to `.env.local`.

4. Start the app:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Environment variables

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4.1-mini
OPENAI_BASE_URL=https://api.openai.com/v1
```

`OPENAI_BASE_URL` and `OPENAI_MODEL` are optional overrides so the provider can be swapped later without changing the UI or route contract.

## Retrieval approach

Weekend v1 intentionally keeps retrieval simple and inspectable:

1. Load local markdown documents from `data/`
2. Split them into `##` sections
3. Score sections by keyword overlap with the interview question and selected role target
4. Select the top sections
5. Build the final prompt on the server

This keeps the system grounded without adding a vector database or external retrieval service.

## API contract

`POST /api/answer`

Request:

```json
{
  "question": "How do you balance product strategy and architecture decisions?",
  "answerMode": "interview",
  "roleTarget": "System Architect"
}
```

Response:

```json
{
  "answer": "final answer text",
  "experienceAreasUsed": [
    "Automotive embedded systems",
    "Product leadership",
    "Systems architecture"
  ],
  "supportNote": "All major claims are supported by the provided profile documents."
}
```

## Notes

- The app is designed to answer only from supplied profile documents.
- No database or authentication is included in v1.
- The mic button is a disabled placeholder for a future voice input step.
- The architecture is ready for later additions like embeddings, job description input, or a different model provider.
