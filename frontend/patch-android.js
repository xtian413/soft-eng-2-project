#!/usr/bin/env node

/**
 * Post-prebuild script: Injects native Gemma module files after Expo prebuild regenerates android/
 * Works on Windows, macOS, and Linux
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = __dirname;
const GEMMA_SOURCE_DIR = path.join(PROJECT_ROOT, 'native-modules', 'gemma');
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
  'gemma'
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
    console.warn('You must manually register GemmaPackage in MainApplication.kt:');
    console.warn('  1. Add import: import com.anonymous.frontend.gemma.GemmaPackage');
    console.warn('  2. Add to PackageList(...).packages.apply { add(GemmaPackage()) }');
    return;
  }

  let content = fs.readFileSync(MAIN_APP_PATH, 'utf-8');
  let updated = false;

  // Try to inject import
  if (!content.includes('import com.anonymous.frontend.gemma.GemmaPackage')) {
    const lastImport = content.lastIndexOf('import');
    if (lastImport !== -1) {
      const endOfLine = content.indexOf('\n', lastImport);
      content = content.slice(0, endOfLine + 1) + 'import com.anonymous.frontend.gemma.GemmaPackage\n' + content.slice(endOfLine + 1);
      console.log('✓ Added import');
      updated = true;
    }
  }

  // Try to inject package registration
  if (!content.includes('GemmaPackage()')) {
    const applyBlock = 'PackageList(this).packages.apply {';
    if (content.includes(applyBlock)) {
      content = content.replace(
        applyBlock,
        `${applyBlock}\n          add(GemmaPackage())`
      );
      console.log('✓ Registered GemmaPackage in MainApplication.kt');
      updated = true;
    } else {
      console.warn('\n⚠ Could not find PackageList(...).packages.apply block. Register manually:');
      console.warn('  Add GemmaPackage() to the packages list in MainApplication.kt');
    }
  } else {
    console.log('ℹ GemmaPackage already registered');
  }

  if (updated) {
    fs.writeFileSync(MAIN_APP_PATH, content);
  }
}

function ensureBuildGradleDependency() {
  if (!fs.existsSync(BUILD_GRADLE_PATH)) {
    console.warn(`\n⚠ build.gradle not found at ${BUILD_GRADLE_PATH}`);
    console.warn('Please add dependency manually: implementation "com.google.mediapipe:tasks-genai:0.10.14"');
    return;
  }

  const depLine = 'implementation("com.google.mediapipe:tasks-genai:0.10.14")';
  let content = fs.readFileSync(BUILD_GRADLE_PATH, 'utf-8');

  if (content.includes(depLine)) {
    console.log('ℹ MediaPipe GenAI dependency already present');
    return;
  }

  if (content.includes('implementation("com.facebook.react:react-android")')) {
    content = content.replace(
      'implementation("com.facebook.react:react-android")',
      `implementation("com.facebook.react:react-android")\n    ${depLine}`
    );
    fs.writeFileSync(BUILD_GRADLE_PATH, content);
    console.log('✓ Added MediaPipe GenAI dependency');
    return;
  }

  if (content.includes('dependencies {')) {
    content = content.replace(
      'dependencies {',
      `dependencies {\n    ${depLine}`
    );
    fs.writeFileSync(BUILD_GRADLE_PATH, content);
    console.log('✓ Added MediaPipe GenAI dependency');
    return;
  }

  console.warn('\n⚠ Could not find dependencies block in build.gradle. Add manually:');
  console.warn('  implementation "com.google.mediapipe:tasks-genai:0.10.14"');
}

function main() {
  console.log('\n🔧 Patching Android project for Gemma module...\n');

  // Check if source exists
  if (!fs.existsSync(GEMMA_SOURCE_DIR)) {
    console.error(`✗ Source directory not found: ${GEMMA_SOURCE_DIR}`);
    process.exit(1);
  }

  // Copy Gemma module files
  copyFile(
    path.join(GEMMA_SOURCE_DIR, 'GemmaModule.kt'),
    path.join(ANDROID_TARGET_DIR, 'GemmaModule.kt')
  );
  copyFile(
    path.join(GEMMA_SOURCE_DIR, 'GemmaPackage.kt'),
    path.join(ANDROID_TARGET_DIR, 'GemmaPackage.kt')
  );

  // Inject package registration
  injectPackageRegistration();
  // Ensure MediaPipe dependency
  ensureBuildGradleDependency();

  console.log('\n✅ Patching complete!\n');
  console.log('Next steps:');
  console.log('  1. Verify MainApplication.kt was updated');
  console.log('  2. Put the model on-device (e.g., /data/user/0/com.anonymous.frontend/files/gemma4-e2b.bin)');
  console.log('  3. Call initModel() with that path');
  console.log('  4. Run: npm run android\n');
}

main();
