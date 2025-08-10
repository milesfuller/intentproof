/**
 * IntentProof Core
 * 
 * The verification framework that ensures AI assistants tell the truth.
 * No more phantom fixes. No more imaginary tests. Just verified reality.
 */

export { Intent } from './intent';
export * from './types';
export * from './verifiers/base';

// Convenience exports for common patterns
import { Intent } from './intent';
import { IntentExecutionResult } from './types';

/**
 * Quick verification helper for simple checks
 */
export async function verify(
  goal: string,
  steps: Array<{
    name: string;
    verify: string | (() => boolean | Promise<boolean>);
    expect?: any;
  }>
): Promise<IntentExecutionResult> {
  const intent = new Intent(goal);
  
  for (const step of steps) {
    intent.step(step.name, {
      verify: step.verify,
      expect: step.expect
    });
  }
  
  return intent.execute();
}

/**
 * Create an intent that ensures tests pass
 */
export function ensureTestsPass(testCommand: string = 'npm test'): Intent {
  return new Intent('Ensure tests pass')
    .requires(testCommand, 'exit 0')
    .ensures(testCommand, 'exit 0');
}

/**
 * Create an intent that ensures a bug is fixed
 */
export function ensureBugFixed(
  bugDescription: string,
  verificationCommand: string,
  expectedOutput?: string
): Intent {
  return new Intent(`Fix bug: ${bugDescription}`)
    .requires(verificationCommand, 'fails')  // Bug must exist first
    .step('Apply fix', {
      verify: () => true  // Placeholder for actual fix
    })
    .ensures(verificationCommand, expectedOutput || 'success');
}

/**
 * Create an intent that ensures files are created
 */
export function ensureFilesCreated(files: string[]): Intent {
  const intent = new Intent('Create required files');
  
  for (const file of files) {
    intent.step(`Create ${file}`, {
      verify: `test -f ${file}`,
      expect: file
    });
  }
  
  return intent;
}

/**
 * Example usage for AI assistants:
 * 
 * ```typescript
 * // Before claiming "I fixed the authentication bug"
 * const intent = new Intent('Fix authentication bug')
 *   .requires('npm test auth', 'fails')  // Verify bug exists
 *   .step('Remove singleton pattern', {
 *     verify: '! grep -r "if (clientInstance)" lib/client.ts',
 *     expect: ''
 *   })
 *   .ensures('npm test auth', 'passes');  // Verify bug is fixed
 * 
 * const result = await intent.execute();
 * if (!result.success) {
 *   console.error(`Failed at: ${result.failedStep}`);
 *   // DO NOT claim the bug is fixed!
 * }
 * ```
 */