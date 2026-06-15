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

const { buildFitnessInsightChatPrompt } = require('./fitnessInsight.ts');
const { retrieveEvidence } = require('../rag/retrieveEvidence.ts');

const OLLAMA_URL = 'http://localhost:11434/api/generate';

async function queryOllama(prompt) {
  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5:3b-instruct',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.4,
          num_predict: 256,
          num_ctx: 4096,
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

const baseInput = {
  userName: 'Jed',
  goal: 'lean_bulk',
  weightKg: 72,
  heightCm: 174,
  targets: { calories: 2700, protein: 150, carbs: 250, fats: 70 },
  foodLogs: [],
  workouts: [],
};

async function testRAG() {
  const queries = [
    { text: "Should I lift light weights to failure to build muscle?", intent: 'workout_recommendation' },
    { text: "Does being sore mean I had a good workout?", intent: 'progress_analysis' },
    { text: "How does 5 hours of sleep affect my gains?", intent: 'progress_analysis' },
    { text: "Should I take creatine?", intent: 'nutrition' },
    { text: "I'm in a calorie deficit to lose fat, how much protein do I need?", intent: 'nutrition' }
  ];

  for (const query of queries) {
    console.log(`\n--- QUERY: "${query.text}" ---`);
    const matchedCards = retrieveEvidence({
      query: query.text,
      route: { intent: query.intent, answerMode: 'chat', shouldUseModel: true },
      userGoal: 'lean_bulk',
      limit: 2,
    });
    
    console.log('Matched Evidence Cards:', matchedCards.map(c => c.id));

    const chatPrompt = buildFitnessInsightChatPrompt(
      baseInput,
      { title: 'Test', summary: '', nutrition: '', training: '', nextStep: '', confidence: 'high' },
      [],
      query.text
    );
    const chatResponse = await queryOllama(chatPrompt);
    console.log('AI Response:\n', chatResponse);
  }
}

testRAG().catch(console.error);
