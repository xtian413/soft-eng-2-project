#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'assets', 'exercises.csv');
const outputPath = path.join(__dirname, 'src', 'api', 'exercises.json');

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  const source = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }

    if (char === '\r') continue;
    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
};

const getArrayFromColumns = (record, prefix) => {
  return Object.keys(record)
    .filter((key) => key.startsWith(prefix))
    .sort()
    .map((key) => record[key])
    .filter((value) => value && value.trim().length > 0);
};

function main() {
  console.log(`Reading CSV from ${csvPath}...`);
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found at ${csvPath}`);
    process.exit(1);
  }

  const csvText = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(csvText);
  const [header, ...dataRows] = rows;
  if (!header) {
    console.error('Empty CSV or missing header');
    process.exit(1);
  }

  const normalizedHeader = header.map((item) => item.trim());

  const exercises = dataRows
    .map((row) => {
      const record = {};
      normalizedHeader.forEach((key, index) => {
        record[key] = row[index] ?? '';
      });

      const secondaryMuscles = getArrayFromColumns(record, 'secondaryMuscles/');
      const instructions = getArrayFromColumns(record, 'instructions/');

      return {
        id: record.id?.trim() || record.name?.trim() || String(Math.random()),
        name: record.name?.trim() || 'Unnamed exercise',
        bodyPart: record.bodyPart?.trim() || '',
        target: record.target?.trim() || '',
        equipment: record.equipment?.trim() || '',
        gifUrl: record.gifUrl?.trim() || '',
        secondaryMuscles,
        instructions,
      };
    })
    .filter((exercise) => exercise.name.length > 0);

  console.log(`Successfully parsed ${exercises.length} exercises.`);

  // Create directory if it doesn't exist
  const destDir = path.dirname(outputPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(exercises, null, 2), 'utf8');
  console.log(`Wrote JSON output to ${outputPath}`);
}

main();
