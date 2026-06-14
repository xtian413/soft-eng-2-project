import type { EvidenceCard } from './evidenceTypes';

function formatDosage(card: EvidenceCard) {
  if (!card.dosage) return null;
  const values = Object.values(card.dosage).filter(Boolean);
  return values.length > 0 ? values.join(' ') : null;
}

export function buildEvidenceContext(cards: EvidenceCard[]) {
  if (cards.length === 0) {
    return 'No evidence cards retrieved for this message.';
  }

  return cards
    .map((card, index) => {
      const dosage = formatDosage(card);
      const advice = card.practicalAdvice.slice(0, 2).join(' ');
      const cautions = [
        ...(card.contraindications ?? []),
        ...(card.escalationRules ?? []),
      ].slice(0, 1);
      const sourceParts = [
        card.source.organization,
        card.source.year ? String(card.source.year) : null,
      ].filter(Boolean);

      return [
        `${index + 1}. ${card.topic} (${card.evidenceLevel})`,
        `Claim: ${card.claim}`,
        `Advice: ${advice}`,
        dosage ? `Dose/range: ${dosage}` : null,
        cautions.length > 0 ? `Cautions: ${cautions.join(' ')}` : null,
        `Source: ${sourceParts.join(', ') || card.source.title}`,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}
