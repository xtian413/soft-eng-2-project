import rawKnowledgeCards from './data/knowledgeCards.json';
import type { EvidenceCard, EvidenceCardPack } from './evidenceTypes';

const knowledgeCardPack = rawKnowledgeCards as EvidenceCardPack;

export function getKnowledgeCardPack() {
  return knowledgeCardPack;
}

export function getEvidenceCards(): EvidenceCard[] {
  return knowledgeCardPack.cards;
}
