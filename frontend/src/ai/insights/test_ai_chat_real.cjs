const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
const fs = require('node:fs');

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
  const source = fs.readFileSync(filename, 'utf8');
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

// Import prompt builders and helpers
const {
  buildFitnessInsightPrompt,
  buildFitnessInsightChatPrompt,
  repairFitnessInsightAfterParsing,
  parseFitnessInsight,
  assessFitnessInsightQuality,
} = require('./fitnessInsight.ts');

const { retrieveEvidence } = require('../rag/retrieveEvidence.ts');

const OLLAMA_URL = 'http://localhost:11434/api/generate';

async function queryOllama(prompt) {
  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen2.5:3b-instruct',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.4,
          num_predict: 256,
          num_ctx: 2048,
        },
      }),
    });
    const data = await response.json();
    return data.response || '';
  } catch (error) {
    console.error('Ollama connection error:', error.message);
    throw error;
  }
}

function dailyLog(overrides) {
  return {
    id: 'daily-log-' + Math.random(),
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

const baseInput = {
  userName: 'Christian G',
  goal: 'lean_bulk',
  weightKg: 72,
  heightCm: 174,
  targets: { calories: 2700, protein: 150, carbs: 250, fats: 70 },
  foodLogs: [
    { name: 'Oatmeal', calories: 400, protein: 15, carbs: 60, fat: 8 },
    { name: 'Chicken and Rice', calories: 650, protein: 45, carbs: 80, fat: 12 },
  ],
  workouts: [
    {
      id: 'workout-1',
      name: 'Push Day',
      performedAt: '2026-06-08T10:00:00.000Z',
      sets: [
        { exercise: 'Bench Press', reps: 8, weightKg: 60 },
        { exercise: 'Bench Press', reps: 8, weightKg: 60 },
        { exercise: 'Overhead Press', reps: 6, weightKg: 40 },
      ],
    },
  ],
};

async function runTests() {
  const results = [];

  console.log('--- STARTING AI CHAT & RAG OFFLINE TEST SUITE ---');

  // Case 1: Standard Sync Data (Valid Sleep and Water)
  console.log('\nRunning Scenario 1: Standard Sync Data (8h sleep, 2500ml water)');
  const input1 = {
    ...baseInput,
    dailyLogs: [
      dailyLog({ date: '2026-06-08', sleep_hours: 8.0, water_ml: 2500 }),
    ],
  };
  const prompt1 = buildFitnessInsightPrompt(input1);
  const rawResponse1 = await queryOllama(prompt1);
  const parsed1 = parseFitnessInsight(rawResponse1);
  const repaired1 = repairFitnessInsightAfterParsing(parsed1, input1);
  const quality1 = assessFitnessInsightQuality(repaired1, input1);

  results.push({
    name: 'Scenario 1: Standard Sync Data',
    rawResponse: rawResponse1,
    repaired: repaired1,
    quality: quality1,
  });

  // Case 2: Poor Recovery Correlation (Low Sleep, Low Hydration before Workout)
  console.log('\nRunning Scenario 2: Poor Recovery Correlation');
  // We simulate low sleep on 2026-06-07 (5h), and a low-volume workout on 2026-06-08.
  // The workout volume should be significantly lower than the average (which is 1200kg here).
  // So we provide a workout with 1 set of 1 rep at 10kg (10kg volume).
  const input2 = {
    ...baseInput,
    workouts: [
      {
        id: 'workout-avg',
        name: 'Normal Day',
        performedAt: '2026-06-06T10:00:00.000Z',
        sets: [
          { exercise: 'Squat', reps: 10, weightKg: 100 },
          { exercise: 'Squat', reps: 10, weightKg: 100 }, // Volume 2000kg
        ]
      },
      {
        id: 'workout-low',
        name: 'Fatigued Day',
        performedAt: '2026-06-08T10:00:00.000Z',
        sets: [
          { exercise: 'Squat', reps: 2, weightKg: 50 }, // Volume 100kg (far below average of 1050kg)
        ],
      },
    ],
    dailyLogs: [
      dailyLog({ date: '2026-06-07', sleep_hours: 5.0, water_ml: 800 }), // Sleep on 7th, workout on 8th
    ],
  };
  const prompt2 = buildFitnessInsightPrompt(input2);
  const rawResponse2 = await queryOllama(prompt2);
  const parsed2 = parseFitnessInsight(rawResponse2);
  const repaired2 = repairFitnessInsightAfterParsing(parsed2, input2);
  const quality2 = assessFitnessInsightQuality(repaired2, input2);

  results.push({
    name: 'Scenario 2: Poor Recovery Correlation',
    rawResponse: rawResponse2,
    repaired: repaired2,
    quality: quality2,
  });

  // Case 3: Missing Sync Data
  console.log('\nRunning Scenario 3: Missing Sync Data');
  const input3 = {
    ...baseInput,
    dailyLogs: [],
  };
  const prompt3 = buildFitnessInsightPrompt(input3);
  const rawResponse3 = await queryOllama(prompt3);
  const parsed3 = parseFitnessInsight(rawResponse3);
  const repaired3 = repairFitnessInsightAfterParsing(parsed3, input3);
  const quality3 = assessFitnessInsightQuality(repaired3, input3);

  results.push({
    name: 'Scenario 3: Missing Sync Data',
    rawResponse: rawResponse3,
    repaired: repaired3,
    quality: quality3,
  });

  // Case 4: RAG Functionality Test
  console.log('\nRunning Scenario 4: RAG Functionality Test (Nutrition / Protein)');
  const query = 'How much protein should I consume per day for muscle gains?';
  const matchedCards = retrieveEvidence({
    query: query,
    route: { intent: 'nutrition', answerMode: 'chat', shouldUseModel: true },
    userGoal: 'lean_bulk',
    limit: 2,
  });

  // Now build a chat prompt with RAG evidence and see if it uses it.
  const currentInsightMock = {
    title: 'Protein focus',
    summary: 'Protein is important.',
    nutrition: 'Aim for high protein.',
    training: 'Keep lifting.',
    nextStep: 'Eat eggs.',
    confidence: 'high',
  };
  const chatPrompt = buildFitnessInsightChatPrompt(
    baseInput,
    currentInsightMock,
    [],
    query
  );
  const chatResponse = await queryOllama(chatPrompt);

  results.push({
    name: 'Scenario 4: RAG Retrieval & Usage',
    query: query,
    matchedCards: matchedCards,
    chatResponse: chatResponse,
  });

  // Case 5: Hallucination Test
  console.log('\nRunning Scenario 5: Hallucination Test');
  const hallucinationQuery = 'Can you read my real-time heart rate and tell me if my blood pressure is normal?';
  const chatPromptHallucinate = buildFitnessInsightChatPrompt(
    baseInput,
    currentInsightMock,
    [],
    hallucinationQuery
  );
  const chatResponseHallucinate = await queryOllama(chatPromptHallucinate);

  results.push({
    name: 'Scenario 5: Hallucination Prevention',
    query: hallucinationQuery,
    chatResponse: chatResponseHallucinate,
  });

  // Write results to file
  const reportPath = path.resolve(__dirname, 'test_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\nTest completed successfully! Report written to: ${reportPath}`);
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
