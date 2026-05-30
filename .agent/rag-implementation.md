# RAG Implementation Plan for Gemi AI Coach

## Goal

Improve Gemi's coaching quality without returning to slow responses.

The current local model can respond quickly, but its advice is too brief and generic. The next layer should make answers more useful by combining:

- deterministic routing for simple requests
- curated fitness and nutrition knowledge
- retrieval before generation
- structured answer templates
- safety guardrails for health-related advice
- performance budgets so local inference stays usable on mobile

This document describes the recommended implementation.

---

## Core Principle

Do not rely on the local LFM model as the only source of coaching intelligence.

Use the model mainly for natural language generation and personalization. Use app logic, user data, and a curated knowledge base to decide what advice should be given.

Recommended stack:

1. Intent Router decides what kind of request this is.
2. User Context Builder collects profile, goals, workout logs, diet logs, and recent activity.
3. Retrieval Layer finds relevant evidence cards from a curated knowledge base.
4. Answer Planner creates a structured response outline.
5. Local Model turns the plan into friendly coaching text.
6. Safety Layer blocks or reframes risky advice.

---

## 1. Intent Router

### Purpose

Route messages to the cheapest and most accurate response path.

Simple messages should not call the local model. Specific coaching questions should use retrieval and a larger answer budget.

### Suggested Intent Types

| Intent | Example | Response Path |
| --- | --- | --- |
| Greeting | "hi", "hello" | Instant template |
| Thanks | "thanks" | Instant template |
| Capability | "what can you do for me?" | App capability template |
| Workout recommendation | "best chest workout" | RAG + workout answer template |
| Workout plan | "make me a 4 day split" | RAG + structured plan generator |
| Exercise technique | "how to bench press?" | RAG + technique template |
| Nutrition advice | "how much protein do I need?" | RAG + calculator + template |
| Meal suggestion | "what should I eat after training?" | RAG + user diet context |
| Progress analysis | "am I improving?" | User logs + trend analyzer |
| Injury or pain | "my shoulder hurts when benching" | Safety template + recommend professional help |
| Out of scope | unrelated topics | Brief redirect to fitness/nutrition |

### Implementation Idea

Start with a rule-based router before using any model classifier.

Example:

```ts
type CoachIntent =
  | 'greeting'
  | 'thanks'
  | 'capability'
  | 'workout_recommendation'
  | 'workout_plan'
  | 'exercise_technique'
  | 'nutrition'
  | 'meal_suggestion'
  | 'progress_analysis'
  | 'injury_or_pain'
  | 'out_of_scope'
  | 'general_coaching';
```

Rule-based routing is fast, transparent, and good enough for the first version.

Later, add a tiny classifier prompt or embedding-based classifier only if rules become hard to maintain.

---

## 2. RAG Knowledge Base

### Purpose

Give the local model reliable, practical knowledge instead of asking it to invent advice.

The knowledge base should not be raw PDFs dumped into the prompt. It should be curated into small evidence cards.

### Recommended Knowledge Card Format

```ts
type EvidenceCard = {
  id: string;
  topic: string;
  tags: string[];
  audience: 'beginner' | 'intermediate' | 'advanced' | 'general';
  claim: string;
  practicalAdvice: string[];
  dosage?: {
    setsPerWeek?: string;
    reps?: string;
    intensity?: string;
    frequency?: string;
    protein?: string;
    calories?: string;
  };
  contraindications?: string[];
  source: {
    title: string;
    organization?: string;
    url?: string;
    year?: number;
    sourceType: 'guideline' | 'position_stand' | 'systematic_review' | 'study' | 'textbook' | 'internal';
  };
  evidenceLevel: 'high' | 'moderate' | 'limited';
  lastReviewedAt: string;
};
```

### Example Evidence Card

```json
{
  "id": "hypertrophy-progressive-overload-001",
  "topic": "muscle hypertrophy",
  "tags": ["hypertrophy", "progressive overload", "resistance training"],
  "audience": "general",
  "claim": "Muscle growth is supported by progressive overload, sufficient weekly volume, appropriate effort, and recovery.",
  "practicalAdvice": [
    "Train each target muscle 2 or more times per week when recovery allows.",
    "Use mostly compound lifts plus isolation work for the target muscle.",
    "Progress by adding reps first, then load, while keeping form stable."
  ],
  "dosage": {
    "reps": "Mostly 6 to 15 reps, with some higher-rep isolation work.",
    "frequency": "Usually 2 sessions per muscle per week works well for many lifters."
  },
  "contraindications": [
    "Do not train through sharp pain.",
    "Reduce volume if soreness or performance decline persists."
  ],
  "source": {
    "title": "Resistance Training for Health and Fitness",
    "organization": "American College of Sports Medicine",
    "sourceType": "guideline"
  },
  "evidenceLevel": "high",
  "lastReviewedAt": "2026-05-31"
}
```

### Source Tiers

Use source tiers so the app prefers stronger evidence.

Tier 1:

- official guidelines
- professional society position stands
- systematic reviews and meta-analyses

Tier 2:

- randomized controlled trials
- large observational studies
- sports nutrition or exercise science textbooks

Tier 3:

- expert consensus
- internal coaching heuristics
- app-specific recommendations

Avoid:

- random fitness blogs
- influencer content
- unsupported supplement claims
- AI-generated claims without source review

### Suggested Starting Topics

Training:

- hypertrophy basics
- strength basics
- progressive overload
- beginner full-body training
- push/pull/legs
- chest training
- back training
- leg training
- glute training
- shoulder training
- arm training
- warmups
- rest periods
- deloads
- recovery

Nutrition:

- protein intake
- calorie deficit
- calorie surplus
- meal timing
- hydration
- fiber
- carbohydrates around training
- fat intake
- micronutrients
- supplements with stronger evidence, such as creatine and caffeine

Safety:

- pain during exercise
- overtraining signs
- eating disorder risk language
- medical disclaimer boundaries
- pregnancy, minors, older adults, and chronic condition caution

---

## 3. Retrieval Before Generation

### Purpose

Before calling the model, retrieve a small set of relevant cards and feed only those cards into the prompt.

The local model should not receive the whole knowledge base.

### First Version Retrieval

Start simple:

1. Normalize user query.
2. Detect intent and keywords.
3. Score evidence cards using keyword/tag overlap.
4. Add user profile and recent logs.
5. Select top 3 to 5 cards.
6. Build a compact context block.

This is fast and can run fully on-device.

### Later Retrieval Upgrade

Add embeddings when needed.

Options:

- Precompute embeddings offline and ship them with the app.
- Use a tiny local embedding model if performance allows.
- Use Supabase pgvector on the backend if online retrieval is acceptable.
- Use hybrid retrieval: keyword filter first, vector ranking second.

Recommended first implementation:

- bundle `knowledgeCards.json`
- use lexical BM25-like scoring or weighted tag matching
- keep retrieval local and private

### Retrieval Scoring Example

Score card by:

- intent match: +5
- exact topic match: +4
- tag match: +2 per tag
- evidence level high: +2
- user goal match: +2
- recent log relevance: +1 to +3
- contraindication match: force safety response

---

## 4. Better Answer Template

### Purpose

Make answers specific, actionable, and still concise.

The model should not decide the structure from scratch. The app should provide a response plan.

### Default Coaching Answer Structure

For most fitness questions:

1. Direct answer
2. Specific recommendation
3. How to progress or personalize
4. Safety/recovery note
5. Follow-up question only when useful

### Example Template

```txt
Answer the user's question using the provided evidence cards and user context.

Rules:
- Be specific and practical.
- Do not invent user data.
- If the user asks for a workout, include exercises, sets, reps, rest, and progression.
- If the user asks for nutrition, include quantities or ranges when safe.
- If evidence is limited, say so briefly.
- Keep the answer under {wordBudget} words.

Response format:
1. Direct answer in one sentence.
2. Practical plan or recommendation.
3. Progression/personalization advice.
4. Safety note if relevant.
```

### Example: Chest Workout Response

For "best chest workout for building muscle", a good answer should look like:

```txt
For chest growth, use a heavy press, an incline press, and a fly movement.

Try this: bench press 3 sets of 6 to 8, incline dumbbell press 3 sets of 8 to 10, cable fly 2 to 3 sets of 12 to 15, then push-ups near failure. Rest 2 to 3 minutes on presses and 60 to 90 seconds on flys. When you hit the top of the rep range with good form, increase the weight slightly next time. Train chest twice per week if recovery is good.
```

This is much better than:

```txt
Focus on compound lifts and progressive overload.
```

---

## 5. User Context Builder

### Purpose

Make advice personal without making prompts huge.

Collect:

- name
- age if available
- sex if available and relevant
- height and weight
- goal
- experience level
- equipment access
- injuries or limitations
- recent workouts
- recent diet logs
- body weight trend

Do not send all logs. Summarize them first.

### Context Summary Example

```txt
User profile:
- Goal: build muscle
- Experience: beginner
- Equipment: gym
- Weight: 70 kg

Recent training:
- Chest trained once this week.
- Most recent pressing exercise: dumbbell bench, 20 kg x 10 reps.

Constraints:
- No known injury reported.
```

This is more useful and cheaper than passing raw workout JSON.

---

## 6. Answer Length Modes

The app should control answer length based on intent.

| Mode | Use Case | Max Tokens |
| --- | --- | --- |
| Instant | greetings, thanks | 0 |
| Short | simple facts | 64 |
| Coaching | workout/nutrition advice | 128 to 192 |
| Plan | full workout or meal plan | 256 to 384 |
| Analysis | progress review | 256 to 384 |

This avoids making every message slow while still allowing useful answers when needed.

---

## 7. Safety Guardrails

### Must Handle Carefully

- chest pain
- dizziness
- fainting
- severe shortness of breath
- eating disorder language
- extreme calorie restriction
- supplement megadosing
- steroids or illegal performance-enhancing drugs
- injury diagnosis
- medical conditions

### Safety Response Pattern

For pain or medical risk:

```txt
I cannot diagnose that, but sharp or persistent pain is a sign to stop that movement for now. Avoid pushing through it, switch to pain-free ranges, and consider seeing a qualified clinician or physical therapist. If you tell me where the pain is and when it happens, I can suggest safer exercise modifications.
```

The model should not provide diagnosis or treatment plans.

---

## 8. Suggested File Structure

```txt
frontend/src/ai/
  router/
    intentRouter.ts
    intentTypes.ts
  rag/
    knowledgeCards.ts
    retrieveEvidence.ts
    scoreEvidence.ts
    buildEvidenceContext.ts
  prompts/
    buildCoachPrompt.ts
    answerTemplates.ts
  safety/
    safetyClassifier.ts
    safetyResponses.ts
  context/
    buildUserContext.ts
    summarizeWorkoutLogs.ts
    summarizeDietLogs.ts
```

Knowledge data:

```txt
frontend/src/ai/rag/data/
  training.cards.json
  nutrition.cards.json
  safety.cards.json
```

Optional later backend:

```txt
backend/src/rag/
  ingestSources.ts
  generateEvidenceCards.ts
  reviewEvidenceCards.ts
  embeddings.ts
```

---

## 9. Recommended Implementation Phases

### Phase 1: Better Local Coaching Without Embeddings

Build:

- intent router
- instant replies
- answer length modes
- better prompt templates
- small JSON knowledge base
- keyword/tag retrieval
- evidence context injection

This phase should improve quality quickly without major infrastructure.

### Phase 2: Curated Evidence Knowledge Base

Build:

- evidence card schema
- source list
- manual or semi-automated evidence card creation
- review checklist
- source metadata
- confidence labels

AI can help summarize research during development, but cards should be reviewed before shipping.

### Phase 3: Hybrid Retrieval

Build:

- embeddings for cards
- hybrid keyword + vector search
- reranking by intent and user goal
- local cached retrieval or Supabase pgvector

### Phase 4: Personalization Engine

Build:

- training volume summaries
- strength progression summaries
- calorie/protein target calculator
- recovery warnings
- goal-aware advice

The model should receive computed facts, not raw logs.

### Phase 5: Evaluation

Create test prompts:

- "what can you do for me?"
- "best chest workout"
- "how much protein do I need?"
- "make me a beginner 3 day gym plan"
- "my shoulder hurts on bench press"
- "what should I eat after workout?"

Score each answer for:

- latency
- specificity
- correctness
- safety
- personalization
- no hallucinated user data

---

## 10. Quality Checklist

A good Gemi answer should:

- answer the actual question
- give specific next steps
- include numbers when helpful
- personalize based on user profile/logs
- avoid unsupported claims
- avoid medical diagnosis
- be concise but not empty
- ask a follow-up only when it improves the next step

A bad Gemi answer:

- says only "focus on consistency"
- gives vague motivational text
- invents completed workouts
- ignores the user's goal
- gives unsafe pain/injury advice
- gives supplement claims without evidence
- takes more than a few seconds for a simple coaching question

---

## 11. Candidate Credible Sources

Start with stable, high-quality references:

- World Health Organization physical activity guidelines
- American College of Sports Medicine resistance training guidance
- International Society of Sports Nutrition position stands
- National Academies Dietary Reference Intakes
- peer-reviewed systematic reviews on hypertrophy, protein intake, creatine, caffeine, and weight loss

Use these to create evidence cards. Do not paste large copyrighted text into the app. Store short summaries, practical recommendations, and source metadata.

---

## 12. Product Recommendation

The best version of Gemi is not a chatbot that answers everything from scratch.

It should feel like a coach with tools:

- it knows the user's goal
- it checks recent training and food
- it retrieves evidence
- it gives a concrete plan
- it keeps answers fast
- it escalates safety concerns

For the current app, the highest-impact next step is Phase 1:

1. Add intent router.
2. Add small curated JSON evidence cards.
3. Add retrieval by tags/keywords.
4. Add structured answer templates.
5. Increase token budget only for real coaching questions.

