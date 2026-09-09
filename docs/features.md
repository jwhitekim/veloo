# Feature details

The full write-up of the 5 modules, moved out of the README. Each module
works on its own, but is designed around the assumption that it sits in one
workspace sharing the same account and history.

## Paper Analyzer

**Why**
You often only find out whether a venue was worth trusting, or whether a
result actually matters, after finishing the paper. Without a way to filter
before reading, that's wasted time.

**What it does**
- Takes a paper via PDF upload or title/URL search.
- Pulls metadata and author info automatically through the Semantic Scholar
  API.
- Has Claude summarize the paper's problem, method, and conclusion.
- Scores the venue's journal quality using a bundled SJR (SCImago Journal Rank)
  dataset.

**How you use it**
1. Upload a PDF or search by title.
2. Metadata, authors, and the venue quality score fill in automatically.
3. Skim the AI summary (problem–method–conclusion) to decide whether it's
   worth reading in full.
4. Jump straight to Concepts or Trans for any term or sentence that trips
   you up while reading.

**Payoff**
You can judge up front whether a paper is worth the time investment, and
spend less time on weak-venue papers.

## Translator

**Why**
General translators (Google, DeepL, etc.) have no domain knowledge, so they
translate formulas, proper nouns, and ML (Machine Learning)/DL (Deep Learning)
terminology literally — which often hurts comprehension rather than helping
it.

**What it does**
- Streaming English > Korean translation (sentence-by-sentence, real-time).
- Tuned for ML/DL/CV (Computer Vision)/NLP (Natural Language Processing)
  writing: leaves formulas and proper nouns alone, and keeps field-specific
  terms in English where a literal translation would just be confusing.

**How you use it**
1. Copy a paragraph you're stuck on from Paper and paste it into Trans.
2. Watch the streamed translation and cross-check it against the original.
3. For any term that comes up mid-translation, check its context in
   Concepts.

**Payoff**
Better accuracy than a general translator for research writing, and faster,
better comprehension of English papers.

## Contextor

**Why**
The same term often means different things depending on the paper or
subfield (a word can point to different concepts in a CV paper vs. an NLP
paper). Regular dictionaries and wikis flatten this into a single
definition.

**What it does**
- Takes an English word or short phrase and returns how it's actually used
  across different ML/DL contexts, structured instead of collapsed into one
  definition.
- Splits meaning out by context rather than merging it into a single
  generic definition.

**How you use it**
1. Type in a term you're only half-sure about while reading or translating.
2. Find the sense that matches the field of the paper you're currently in
   from the list of context-specific meanings.
3. Terms you looked up stay in your history for easy re-checking later.

**Payoff**
Fewer terms you only half-understand, and less concept confusion when
reading across subfields.

## Model Review

**Why**
There's a big gap between skimming an architecture diagram and actually
being able to explain it. Most study tools stop at "I looked at it" and
give you no way to check whether you actually understood it.

**What it does**
- Upload an architecture diagram (image) and get an AI-generated reference
  explanation of how the components connect.
- Write your own explanation in your own words, and have the AI grade it
  against the reference explanation and correct it.

**How you use it**
1. Capture and upload a model architecture figure from a paper.
2. Write your own explanation first, before reading the AI's reference
   explanation (active recall).
3. Submit it and get AI grading and corrections back, so you can see where
   your understanding diverges from the actual structure.
4. Go back to Concepts or Paper for anything you got wrong.

**Payoff**
Turns a diagram from something you "looked at" into something you can
actually explain, and builds long-term retention through a self-quiz loop.

## Plan (Todo + Calendar)

**Why**
Reading a paper or learning a new concept doesn't help much if it never
turns into actual research progress (an experiment, the next paper, meeting
prep). A separate to-do app forces you to recreate that context from
scratch when you make a new task.

**What it does**
- Research task management with sub-steps and priorities.
- AI-suggested task breakdown and progress strategy.
- A drag-and-drop weekly time-blocking calendar with a review flow.

**How you use it**
1. Send anything from Paper or Models that needs follow-up over to Plan.
2. Flesh out the task using the AI's suggested breakdown into sub-steps.
3. Drag and drop it onto the weekly calendar to block out time.
4. Review weekly and carry it into next week's plan.

**Payoff**
What you read turns naturally into work that gets done, instead of getting
lost among a pile of open tabs.
