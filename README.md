# Aamir Interview Agent

A grounded AI interview agent that turns real experience into role-tailored, defensible answers.

## 🚀 Live Demo

Try it here:  
https://aamir-digital-clone.vercel.app/

This is a grounded AI interview agent that answers only from real experience.

## Problem Statement

Most AI-generated interview answers fail in exactly the ways that matter most:

- they hallucinate experience
- they sound generic and over-polished
- they ignore role context
- they cannot distinguish between strong evidence and weak alignment

That makes them risky for senior candidates, technical interviews, and product leadership conversations where credibility matters.

## Solution

Aamir Interview Agent is a hybrid RAG interview system that generates answers from structured profile evidence, adapts to job descriptions, and routes response behavior by role type.

Instead of relying on vague prompting alone, it combines:

- local profile knowledge in markdown
- semantic retrieval with embeddings
- deterministic rule-based reranking
- role-aware routing for embedded, product, and AI-product roles
- prompt grounding and suppression logic to reduce hallucination

The result is an answer engine that is personalized, inspectable, and much more defensible than a generic chatbot.

## Key Features

- Hybrid RAG pipeline with semantic retrieval plus deterministic reranking
- Structured markdown knowledge base for profile facts, experience areas, styles, and guardrails
- Job description adaptation to shift emphasis toward the target role
- Role-aware routing for:
  - embedded / system roles
  - product roles
  - AI-first / AI product roles
- Prompt grounding designed to avoid unsupported claims
- Fact-oriented retrieval for timeline, education, certifications, and company history
- Debug logging for chunk selection, reranking, suppression, and final prompt context
- Local JSON index for embeddings, without requiring a vector database
- 🔊 Voice Output — Answers can be played using a lightweight, quickly generated AI voice for real-time interaction
- 🎤 Voice Input — Ask questions using your microphone with real-time transcription
- 🗣️ Conversational Flow — Speak → generate → listen, creating a natural interaction loop

## System Architecture

```text
User Question + Role Target + Optional Job Description
                |
                v
        Role Routing Layer
  (embedded / product / ai-product)
                |
                v
      Hybrid Retrieval Pipeline
  - semantic search over local embeddings
  - rule-based reranking
  - metadata boosts / suppression
                |
                v
       Grounded Prompt Assembly
  - opening hints
  - suppression hints
  - validation rules
  - selected evidence chunks
                |
                v
        OpenAI-Compatible Model
                |
                v
 Structured JSON Answer + Support Note
```

## Tech Stack

- Next.js 15+ App Router
- TypeScript
- Tailwind CSS
- OpenAI-compatible chat completion API
- OpenAI embeddings API
- Local markdown knowledge base
- Local JSON RAG index
- Vercel deployment

## How It Works

1. User types or speaks a question
2. Job description is parsed (if provided)
3. Role is detected dynamically
4. Relevant profile data is retrieved using Hybrid RAG
5. Retrieved content is reranked using role-aware logic
6. LLM generates a grounded answer
7. Answer can be played as audio using AI-generated voice

## Example Use Case

A user pastes a Senior Product Manager job description for an AI-first startup and asks:

> Why are you a strong fit for this role?

The system will:

- detect AI-product signals such as ownership, experimentation, prototype, and ecosystem
- retrieve AI-building and product-execution evidence from the profile
- avoid opening with automotive embedded identity
- emphasize hands-on product experimentation, grounding, validation, and execution where supported
- Supports voice input and AI-generated voice output for a more natural interaction.

That produces a more credible answer than a generic AI response or a static personal bio.

## 🎙️ Voice Interaction

The system includes a lightweight voice interaction layer:

- Speak your question using the microphone
- The system transcribes it into text
- Generates a grounded answer
- Plays the answer back using a lightweight AI-generated voice

This design prioritizes fast interaction and rapid prototyping over heavy voice infrastructure.

## Roadmap

- Improve index rebuilding workflows and content versioning
- Add richer admin tooling for managing profile evidence
- Introduce optional answer trace/debug mode in the UI
- Expand the system from personal clone to reusable multi-profile platform
- Support additional model providers with the same retrieval core
- Voice conversation mode (continuous interaction)
- Real-time streaming voice interface
- Improved audio UX (waveforms, playback controls)

## Positioning

This project sits at the intersection of:

- AI product design
- retrieval engineering
- grounded generation
- personal knowledge systems
- defensible interview automation

It is currently framed as a personal digital clone, but the underlying product direction is broader:

**an AI system for high-trust, role-aware, evidence-grounded communication.**

That can extend beyond interviews into:

- executive profile assistants
- AI-native candidate preparation
- domain-specific personal copilots
- trust-sensitive professional narrative systems

## ⚙️ Run Locally

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

Install dependencies:

```bash
npm install
```

Create your environment file:

```bash
copy .env.example .env.local
```

Set the required environment variables in `.env.local`:

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4.1-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_BASE_URL=https://api.openai.com/v1
```

Build the local RAG index:

```bash
npm run build:index
```

Start the development server:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Future Direction

The long-term opportunity is not just an interview tool.

This can evolve into a reusable platform for grounded AI identity systems, where a model can speak credibly on behalf of a person, expert, or domain-specific operator without drifting into hallucination or vague generalities.

The strongest future direction is a productized framework for:

- grounded digital clones
- role-aware professional copilots
- evidence-backed narrative generation
- human-trust AI interfaces

## Author

Built by Aamir Shakoor as part of a broader exploration into grounded AI systems, hybrid RAG, and high-trust AI product experiences.
