/**
 * Seed question bank for the personality interview ("Refine your twin").
 * Groups: voice (tone), opinions, faqs, boundaries, bio. Adaptive gap
 * questions are generated at runtime from the wiki (see /api/interview/gaps).
 */
export type QuestionGroup = "voice" | "opinions" | "faqs" | "boundaries" | "bio";

export interface InterviewQuestion {
  id: string;
  group: QuestionGroup;
  text: string;
  hint?: string;
}

export const SEED_QUESTIONS: InterviewQuestion[] = [
  // voice & tone
  {
    id: "voice-greeting",
    group: "voice",
    text: "How do you usually greet someone you're meeting for the first time?",
    hint: "Write it the way you'd actually say it.",
  },
  {
    id: "voice-formality",
    group: "voice",
    text: "Are you more formal or casual when you talk about your work? Give an example sentence in your voice.",
  },
  {
    id: "voice-humor",
    group: "voice",
    text: "How does humor show up in how you communicate — dry, playful, rarely, never?",
  },
  {
    id: "voice-phrases",
    group: "voice",
    text: "What words or phrases do you catch yourself using all the time?",
    hint: "e.g. \"here's the thing\", \"long story short\"…",
  },
  // opinions
  {
    id: "op-contrarian",
    group: "opinions",
    text: "What's one opinion you hold that most people in your field disagree with?",
  },
  {
    id: "op-overrated",
    group: "opinions",
    text: "What's something in your field you think is overrated — and what deserves more attention instead?",
  },
  {
    id: "op-hill",
    group: "opinions",
    text: "What's a principle or approach you'd defend even under pressure?",
  },
  // faqs
  {
    id: "faq-1",
    group: "faqs",
    text: "What question do people ask you most often — and what's your honest answer?",
  },
  {
    id: "faq-2",
    group: "faqs",
    text: "What's the second most common question you get? Answer it the way you would in person.",
  },
  {
    id: "faq-advice",
    group: "faqs",
    text: "What advice do you find yourself repeating to almost everyone who asks?",
  },
  {
    id: "faq-misconception",
    group: "faqs",
    text: "What do people most often get wrong about you or your work?",
  },
  // boundaries
  {
    id: "bound-topics",
    group: "boundaries",
    text: "What topics should your twin refuse to discuss on your behalf?",
    hint: "e.g. family, politics, client names, health…",
  },
  {
    id: "bound-tone",
    group: "boundaries",
    text: "Is there anything your twin should never do in tone — swear, give hot takes, make promises?",
  },
  // bio
  {
    id: "bio-journey",
    group: "bio",
    text: "In a few sentences: how did you get to where you are today?",
  },
  {
    id: "bio-now",
    group: "bio",
    text: "What are you focused on right now, and why does it matter to you?",
  },
  {
    id: "bio-outside",
    group: "bio",
    text: "What do you care about outside work that you're happy for people to know?",
  },
  {
    id: "bio-proud",
    group: "bio",
    text: "What piece of work or achievement are you most proud of?",
  },
  {
    id: "bio-person",
    group: "bio",
    text: "How would a close friend describe you in one sentence?",
  },
];
