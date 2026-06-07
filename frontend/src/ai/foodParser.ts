export type ParsedFoodUnit = 'g' | 'kg' | 'ml' | 'piece' | 'serving' | 'tbsp' | 'tsp' | 'cup' | 'oz';

export type ParsedFoodItem = {
  foodName: string;
  quantity: number;
  unit: ParsedFoodUnit;
};

export type ParsedFoodInput = {
  items: ParsedFoodItem[];
};

const MAX_PARSED_ITEMS = 10;
const UNIT_ALIASES: Record<string, ParsedFoodUnit> = {
  g: 'g',
  gram: 'g',
  grams: 'g',
  kg: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  ml: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  piece: 'piece',
  pieces: 'piece',
  pc: 'piece',
  pcs: 'piece',
  serving: 'serving',
  servings: 'serving',
  tbsp: 'tbsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  tsp: 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  cup: 'cup',
  cups: 'cup',
  oz: 'oz',
  ounce: 'oz',
  ounces: 'oz',
};

const UNSUPPORTED_UNITS = new Set([
  'bowl',
  'bowls',
  'plate',
  'plates',
  'scoop',
  'scoops',
  'handful',
  'handfuls',
]);

const SINGULAR_FOOD_NAMES: Record<string, string> = {
  eggs: 'egg',
  bananas: 'banana',
};

function splitFoodFragments(input: string) {
  return input
    .split(/\s*(?:,|\band\b)\s*/i)
    .map((fragment) => fragment.trim())
    .filter(Boolean);
}

function normalizeFoodName(value: string) {
  const cleaned = value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s-]/g, '')
    .toLowerCase();

  return SINGULAR_FOOD_NAMES[cleaned] ?? cleaned;
}

function normalizeUnit(value: string): ParsedFoodUnit | null {
  return UNIT_ALIASES[value.trim().toLowerCase()] ?? null;
}

function parseFoodFragment(fragment: string): ParsedFoodItem {
  const quantityMatch = fragment.match(/^(\d+(?:\.\d+)?)(?:\s*)(.*)$/);
  if (!quantityMatch) {
    throw new Error(`Include an amount for "${fragment}".`);
  }

  const quantity = Number(quantityMatch[1]);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error(`Use an amount greater than 0 for "${fragment}".`);
  }

  const rest = quantityMatch[2].trim();
  if (!rest) {
    throw new Error(`Add a food name after ${quantity}.`);
  }

  const compactUnitMatch = rest.match(/^([a-zA-Z]+)(?:\s+(.+))?$/);
  if (!compactUnitMatch) {
    throw new Error(`Could not read "${fragment}".`);
  }

  const firstWord = compactUnitMatch[1].toLowerCase();
  const remainder = compactUnitMatch[2]?.trim() ?? '';
  const unit = normalizeUnit(firstWord);

  if (unit) {
    if (!remainder) {
      throw new Error(`Add a food name after ${quantity} ${unit}.`);
    }

    return {
      foodName: normalizeFoodName(remainder),
      quantity,
      unit,
    };
  }

  if (UNSUPPORTED_UNITS.has(firstWord) && remainder) {
    throw new Error('Use a supported unit such as g, piece, serving, cup, tbsp, tsp, ml, kg, or oz.');
  }

  return {
    foodName: normalizeFoodName(rest),
    quantity,
    unit: 'piece',
  };
}

export async function parseFoodDescription(input: string): Promise<ParsedFoodInput> {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Enter a food description first.');
  }

  const fragments = splitFoodFragments(trimmed);
  if (fragments.length === 0) {
    throw new Error('Enter a food description first.');
  }

  if (fragments.length > MAX_PARSED_ITEMS) {
    throw new Error(`Quick Log supports up to ${MAX_PARSED_ITEMS} foods at a time.`);
  }

  const items = fragments.map(parseFoodFragment);
  if (items.length === 0) {
    throw new Error('No foods were found in that description.');
  }

  return { items };
}
