/**
 * lfmInit.ts
 *
 * On-device model initialization has been removed. All AI inference is handled
 * by the laptop-hosted Ollama server via the Android emulator's 10.0.2.2 gateway.
 *
 * This module is kept as a no-op so call-sites in DashboardScreen.tsx do not
 * need to change. It resolves immediately with `true`.
 */

/**
 * No-op startup hook. Returns true instantly — the host LLM bridge needs no
 * local model file or native module initialization.
 */
export async function initializeLfmOnStartup(): Promise<boolean> {
  console.log('[Gemi] Host LLM Bridge mode — no local model init required.');
  return true;
}
