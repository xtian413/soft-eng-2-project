import type { RoutedCoachIntent } from '../router/intentTypes';
import type { EvidenceCard } from './evidenceTypes';
import { getEvidenceCards } from './knowledgeCards';
import { scoreEvidenceCard } from './scoreEvidence';

const DEFAULT_EVIDENCE_LIMIT = 2;

export function retrieveEvidence(options: {
  query: string;
  route: RoutedCoachIntent;
  userGoal?: string;
  recentContext?: string;
  limit?: number;
}): EvidenceCard[] {
  if (!options.route.shouldUseModel) {
    return [];
  }

  return getEvidenceCards()
    .map((card) => ({
      card,
      score: scoreEvidenceCard(card, {
        query: options.query,
        intent: options.route.intent,
        userGoal: options.userGoal,
        recentContext: options.recentContext,
      }),
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.card.id.localeCompare(b.card.id);
    })
    .slice(0, options.limit ?? DEFAULT_EVIDENCE_LIMIT)
    .map((result) => result.card);
}
