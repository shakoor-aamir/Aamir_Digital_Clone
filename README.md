# Aamir Interview Agent

A minimal Next.js app for generating interview answers that sound like Aamir Shakoor while staying grounded in curated local profile documents.

## What it does

- Accepts an interview question
- Lets the user choose an answer mode and role target
- Optionally accepts a pasted job description to tailor emphasis
- Retrieves the most relevant local profile sections with lightweight keyword scoring
- Assembles a deterministic server-side prompt from curated markdown files
- Calls an OpenAI-compatible chat completion endpoint
- Returns grounded answer text, experience areas used, and a support note

## Job Description Adaptation

When a job description is provided, the app:

- extracts lightweight themes and keywords from the pasted JD
- uses those signals to influence retrieval ranking
- tailors emphasis and terminology in the final answer
- keeps `master_profile.md` as the highest-trust factual source
- avoids unsupported alignment and softens phrasing where needed

The job description is treated as a relevance signal, not as source truth about Aamir.

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
  Workspace.tsx
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

The app keeps retrieval simple and inspectable:

1. Load local markdown documents from `data/`
2. Split them into `##` sections
3. Score sections by keyword overlap with:
   - the interview question
   - the selected role target
   - optional job-description signals
4. Prioritize `master_profile.md` for factual and biographical answers
5. Build the final prompt on the server

This keeps the system grounded without adding a vector database or external retrieval service.

## API contract

`POST /api/answer`

Request:

```json
{
  "question": "Why are you a fit for this role?",
  "answerMode": "interview",
  "roleTarget": "Product Manager",
  "jobDescription": "Own roadmap prioritization, stakeholder alignment, backlog refinement, and delivery across cross-functional teams."
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
  "supportNote": "Tailored to the supplied job description using supported profile evidence."
}
```

## Example usage

Question:
`Why are you a fit for this role?`

Job description signals:
`roadmap`, `prioritization`, `stakeholder alignment`

Expected emphasis:
product leadership, backlog clarity, roadmap thinking, and cross-functional alignment without inventing unsupported SaaS or AI claims.

Question:
`How does your background fit this role?`

Job description signals:
`AUTOSAR`, `embedded`, `diagnostics`, `architecture`

Expected emphasis:
system architecture, embedded systems, diagnostics, and automotive platform thinking.

## Notes

- The app answers only from supplied profile documents.
- No database or authentication is included.
- The mic button is still a disabled placeholder.
- Existing debug logging remains in place, with added logs for job-description handling and prompt signals.
