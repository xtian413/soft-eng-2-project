#!/usr/bin/env node

/**
 * Post-prebuild script: Injects native LFM module files after Expo prebuild regenerates android/
 * Works on Windows, macOS, and Linux
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = __dirname;
const LFM_SOURCE_DIR = path.join(PROJECT_ROOT, 'native-modules', 'llm');
const ANDROID_TARGET_DIR = path.join(
  PROJECT_ROOT,
  'android',
  'app',
  'src',
  'main',
  'java',
  'com',
  'anonymous',
  'frontend',
  'llm'
);
const MAIN_APP_PATH = path.join(
  PROJECT_ROOT,
  'android',
  'app',
  'src',
  'main',
  'java',
  'com',
  'anonymous',
  'frontend',
  'MainApplication.kt'
);
const BUILD_GRADLE_PATH = path.join(
  PROJECT_ROOT,
  'android',
  'app',
  'build.gradle'
);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✓ Created directory: ${dir}`);
  }
}

function copyFile(src, dest) {
  try {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied: ${path.basename(src)}`);
  } catch (e) {
    console.error(`✗ Failed to copy ${src}: ${e.message}`);
    process.exit(1);
  }
}

function injectPackageRegistration() {
  if (!fs.existsSync(MAIN_APP_PATH)) {
    console.warn(`\n⚠ MainApplication.kt not found.`);
    console.warn('You must manually register LfmPackage in MainApplication.kt:');
    console.warn('  1. Add import: import com.anonymous.frontend.llm.LfmPackage');
    console.warn('  2. Add to PackageList(...).packages.apply { add(LfmPackage()) }');
    return;
  }

  let content = fs.readFileSync(MAIN_APP_PATH, 'utf-8');
  let updated = false;

  // Try to inject import
  if (!content.includes('import com.anonymous.frontend.llm.LfmPackage')) {
    const lastImport = content.lastIndexOf('import');
    if (lastImport !== -1) {
      const endOfLine = content.indexOf('\n', lastImport);
      content = content.slice(0, endOfLine + 1) + 'import com.anonymous.frontend.llm.LfmPackage\n' + content.slice(endOfLine + 1);
      console.log('✓ Added import');
      updated = true;
    }
  }

  // Try to inject package registration
  if (!content.includes('LfmPackage()')) {
    const applyBlock = 'PackageList(this).packages.apply {';
    if (content.includes(applyBlock)) {
      content = content.replace(
        applyBlock,
        `${applyBlock}\n          add(LfmPackage())`
      );
      console.log('✓ Registered LfmPackage in MainApplication.kt');
      updated = true;
    } else {
      console.warn('\n⚠ Could not find PackageList(...).packages.apply block. Register manually:');
      console.warn('  Add LfmPackage() to the packages list in MainApplication.kt');
    }
  } else {
    console.log('ℹ LfmPackage already registered');
  }

  if (updated) {
    fs.writeFileSync(MAIN_APP_PATH, content);
  }
}

function ensureBuildGradleAaptOptions() {
  if (!fs.existsSync(BUILD_GRADLE_PATH)) {
    console.warn(`\n⚠ build.gradle not found at ${BUILD_GRADLE_PATH}`);
    return;
  }

  let content = fs.readFileSync(BUILD_GRADLE_PATH, 'utf-8');

  // If aaptOptions with noCompress "gguf" is already present, nothing to do
  if (content.includes('noCompress "gguf"') || content.includes("noCompress 'gguf'")) {
    console.log('ℹ aaptOptions.noCompress "gguf" already present');
    return;
  }

  // Look for android { block
  if (content.includes('android {')) {
    const patch = `android {\n    aaptOptions {\n        // Do not compress the GGUF model file\n        noCompress "gguf"\n    }`;
    content = content.replace('android {', patch);
    fs.writeFileSync(BUILD_GRADLE_PATH, content);
    console.log('✓ Added aaptOptions.noCompress "gguf" configuration');
    return;
  }

  console.warn('\n⚠ Could not find android { block in build.gradle. Add manually:');
  console.warn('  android { aaptOptions { noCompress "gguf" } }');
}


function main() {
  console.log('\n🔧 Patching Android project for LFM module...\n');

  // Check if source exists
  if (!fs.existsSync(LFM_SOURCE_DIR)) {
    console.error(`✗ Source directory not found: ${LFM_SOURCE_DIR}`);
    process.exit(1);
  }

  // Copy LFM module files
  copyFile(
    path.join(LFM_SOURCE_DIR, 'LfmModule.kt'),
    path.join(ANDROID_TARGET_DIR, 'LfmModule.kt')
  );
  copyFile(
    path.join(LFM_SOURCE_DIR, 'LfmPackage.kt'),
    path.join(ANDROID_TARGET_DIR, 'LfmPackage.kt')
  );
  copyFile(
    path.join(LFM_SOURCE_DIR, 'LlamaBridge.kt'),
    path.join(ANDROID_TARGET_DIR, 'LlamaBridge.kt')
  );

  // Inject package registration
  injectPackageRegistration();
  // Ensure noCompress configuration
  ensureBuildGradleAaptOptions();

  console.log('\n✅ Patching complete!\n');
  console.log('Next steps:');
  console.log('  1. Verify MainApplication.kt was updated');
  console.log('  2. Put the model on-device (e.g., /data/user/0/com.anonymous.frontend/files/qwen2.5-3b-instruct-q4_k_m.gguf)');
  console.log('  3. Call initModel() with that path');
  console.log('  4. Run: npm run android\n');
}

main();
