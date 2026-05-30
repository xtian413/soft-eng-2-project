#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const os = require('os');

// Resolve the default Downloads path dynamically for the current user (cross-platform)
const defaultSource = path.join(os.homedir(), 'Downloads', 'lfm2.5-1.2b-instruct-q4_k_m.gguf');
const SOURCE = process.env.LFM_MODEL_PATH || defaultSource;
const DEST_DIR = path.join(__dirname, 'android', 'app', 'src', 'main', 'assets', 'models');
const DEST_FILE = path.join(DEST_DIR, 'lfm2.5-1.2b-instruct-q4_k_m.gguf');

console.log('📦 Bundling LFM model into APK assets...\n');

// Check source
if (!fs.existsSync(SOURCE)) {
    console.error(`✗ Model file not found at: ${SOURCE}`);
    console.error(`\nTo fix this, please do one of the following:`);
    console.error(`1. Download the LFM model 'lfm2.5-1.2b-instruct-q4_k_m.gguf' and place it in your Downloads folder.`);
    console.error(`2. Set the LFM_MODEL_PATH environment variable to the path of your model file before building.`);
    console.error(`   Example (Windows PowerShell):  $env:LFM_MODEL_PATH="C:\\path\\to\\model.gguf"; npm run android`);
    console.error(`   Example (Bash/macOS):         LFM_MODEL_PATH=/path/to/model.gguf npm run android\n`);
    process.exit(1);
}

const sourceSize = fs.statSync(SOURCE).size;
console.log(`Source: ${SOURCE}`);
console.log(`Size: ${(sourceSize / 1024 / 1024 / 1024).toFixed(2)} GB\n`);

// Create destination directory
if (!fs.existsSync(DEST_DIR)) {
    fs.mkdirSync(DEST_DIR, { recursive: true });
    console.log(`✓ Created directory: ${DEST_DIR}`);
}

// Copy file
console.log(`Copying...`);
try {
    fs.copyFileSync(SOURCE, DEST_FILE);
    const destSize = fs.statSync(DEST_FILE).size;
    console.log(`✓ Successfully copied to: ${DEST_FILE}`);
    console.log(`✓ Destination size: ${(destSize / 1024 / 1024 / 1024).toFixed(2)} GB`);
    
    if (sourceSize === destSize) {
        console.log(`✓ Verification: File sizes match\n`);
    } else {
        console.warn(`⚠ Warning: File size mismatch! Source: ${sourceSize}, Dest: ${destSize}\n`);
    }
} catch (e) {
    console.error(`✗ Copy failed: ${e.message}`);
    process.exit(1);
}

console.log('✅ Model bundled successfully!');
console.log('The model will be included in the APK at build time.');
