const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

const frontendRoot = path.resolve(__dirname, '../../..');
const srcRoot = path.join(frontendRoot, 'src');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    return originalResolveFilename.call(
      this,
      path.join(srcRoot, request.slice(2)),
      parent,
      isMain,
      options,
    );
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions['.ts'] = function compileTypeScript(module, filename) {
  const source = require('node:fs').readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const {
  assessFitnessInsightQuality,
  parseFitnessInsight,
  repairFitnessInsightAfterParsing,
} = require('./fitnessInsight.ts');

function dailyLog(overrides) {
  return {
    id: 'daily-log',
    user_id: 'user-1',
    created_at: '2026-06-09T00:00:00.000Z',
    updated_at: '2026-06-09T00:00:00.000Z',
    deleted_at: null,
    sync_status: 'synced',
    last_synced_at: null,
    remote_id: null,
    date: '2026-06-09',
    bedtime: null,
    waketime: null,
    sleep_hours: null,
    water_ml: null,
    water_goal_ml: null,
    ...overrides,
  };
}

function inputWithDailyLogs(dailyLogs) {
  return {
    userName: 'Christian G',
    goal: 'lean_bulk',
    weightKg: 72,
    heightCm: 174,
    targets: { calories: 2700, protein: 150, carbs: 250, fats: 70 },
    foodLogs: [],
    workouts: [
      {
        id: 'workout-1',
        name: 'Push Day',
        performedAt: '2026-06-03T10:00:00.000Z',
        sets: [
          { exercise: 'Bench Press', reps: 8, weightKg: 60 },
          { exercise: 'Bench Press', reps: 8, weightKg: 60 },
          { exercise: 'Overhead Press', reps: 6, weightKg: 40 },
        ],
      },
    ],
    dailyLogs,
  };
}

function parseRepairAssess(output, input) {
  const repaired = repairFitnessInsightAfterParsing(parseFitnessInsight(output), input);
  return {
    repaired,
    quality: assessFitnessInsightQuality(repaired, input),
  };
}

function assertUsable(result, label) {
  assert.equal(
    result.quality.isUsable,
    true,
    `${label} should be usable, reasons: ${result.quality.reasons.join('; ')}`,
  );
}

function hasRecoveryInSummaryOrTraining(insight) {
  return /\b(sleep|water|hydration|hrs?|ml)\b/i.test(`${insight.summary} ${insight.training}`);
}

const solidOutput = [
  'TITLE=Logged Data Check',
  'SUMMARY=You logged 0 meals today and reached 0 of 2700 kcal (0%).',
  'NUTRITION=Your protein is 0g of 150g (0%), which is the largest macro gap.',
  'TRAINING=Your recent training shows 1 workout, 3 sets, and 1200kg volume.',
  'NEXT=Log 1 protein-focused meal before your next workout.',
  'CONFIDENCE=medium',
].join('\n');

[
  {
    label: 'no recovery data',
    input: inputWithDailyLogs([]),
    output: solidOutput,
    check(result) {
      assertUsable(result, this.label);
      assert.equal(hasRecoveryInSummaryOrTraining(result.repaired), false);
    },
  },
  {
    label: 'sleep only',
    input: inputWithDailyLogs([dailyLog({ sleep_hours: 6.5 })]),
    output: solidOutput,
    check(result) {
      assertUsable(result, this.label);
      assert.match(`${result.repaired.summary} ${result.repaired.training}`, /\b(sleep|hrs?)\b/i);
    },
  },
  {
    label: 'water only',
    input: inputWithDailyLogs([dailyLog({ water_ml: 2250 })]),
    output: solidOutput,
    check(result) {
      assertUsable(result, this.label);
      assert.match(`${result.repaired.summary} ${result.repaired.training}`, /\b(hydration|water|ml)\b/i);
    },
  },
  {
    label: 'sleep and water together',
    input: inputWithDailyLogs([dailyLog({ sleep_hours: 7.2, water_ml: 2100 })]),
    output: solidOutput,
    check(result) {
      assertUsable(result, this.label);
      assert.match(`${result.repaired.summary} ${result.repaired.training}`, /\bsleep\b/i);
      assert.match(`${result.repaired.summary} ${result.repaired.training}`, /\b(hydration|water|ml)\b/i);
    },
  },
  {
    label: 'recovery mentioned only in NEXT',
    input: inputWithDailyLogs([dailyLog({ water_ml: 1800 })]),
    output: [
      'TITLE=Logged Data Check',
      'SUMMARY=You logged 0 meals today and reached 0 of 2700 kcal (0%).',
      'NUTRITION=Your protein is 0g of 150g (0%), which is the largest macro gap.',
      'TRAINING=Your recent training shows 1 workout, 3 sets, and 1200kg volume.',
      'NEXT=Keep hydration steady with 1800 ml before your next workout.',
      'CONFIDENCE=medium',
    ].join('\n'),
    check(result) {
      assertUsable(result, this.label);
      assert.match(`${result.repaired.summary} ${result.repaired.training}`, /\b(hydration|water|ml)\b/i);
    },
  },
  {
    label: 'recovery correctly mentioned in SUMMARY or TRAINING',
    input: inputWithDailyLogs([dailyLog({ sleep_hours: 7.5 })]),
    output: [
      'TITLE=Recovery Check',
      'SUMMARY=You logged 0 meals today and reached 0 of 2700 kcal (0%).',
      'NUTRITION=Your protein is 0g of 150g (0%), which is the largest macro gap.',
      'TRAINING=Your recent training shows 1 workout, 3 sets, 1200kg volume, and 7.5 hrs sleep supports your next session.',
      'NEXT=Log 1 protein-focused meal before your next workout.',
      'CONFIDENCE=medium',
    ].join('\n'),
    check(result) {
      assertUsable(result, this.label);
      assert.match(result.repaired.training, /\b7\.5 hrs sleep\b/i);
    },
  },
  {
    label: 'third-person phrasing repaired',
    input: inputWithDailyLogs([dailyLog({ sleep_hours: 6.25, water_ml: 2000 })]),
    output: [
      'TITLE=Christian G Personal Insight',
      'SUMMARY=Christian G logged 0 meals today and he reached 0 of 2700 kcal (0%).',
      'NUTRITION=His protein is 0g of 150g (0%), which is his largest macro gap.',
      'TRAINING=They completed 1 workout, 3 sets, and 1200kg volume.',
      'NEXT=Christian G should log 1 protein-focused meal before their next workout.',
      'CONFIDENCE=medium',
    ].join('\n'),
    check(result) {
      assertUsable(result, this.label);
      const allText = Object.values(result.repaired).join(' ');
      assert.doesNotMatch(allText, /\bChristian\b/i);
      assert.doesNotMatch(allText, /\b(he|she|they|him|his|her|hers|them|their|theirs)\b/i);
      assert.match(allText, /\byou|your\b/i);
      assert.match(`${result.repaired.summary} ${result.repaired.training}`, /\b(sleep|hydration|hrs?|ml)\b/i);
    },
  },
].forEach((scenario) => {
  scenario.check(parseRepairAssess(scenario.output, scenario.input));
});

console.log('fitnessInsight self-test passed');
