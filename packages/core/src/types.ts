/**
 * IntentProof Core Types
 * These types define the verification contracts that ensure AI claims are real
 */

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type IntentStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface VerificationResult {
  success: boolean;
  message: string;
  actual?: any;
  expected?: any;
  evidence?: string[];
  timestamp: Date;
}

export interface StepDefinition {
  name: string;
  description?: string;
  dependencies?: string[];
  action?: () => Promise<void>;
  verify: VerificationCommand | VerificationFunction;
  expect?: string | boolean | number;
  timeout?: number;
  retries?: number;
  rollback?: () => Promise<void>;
}

export interface VerificationCommand {
  type: 'command';
  command: string;
  cwd?: string;
  env?: Record<string, string>;
}

export type VerificationFunction = () => boolean | Promise<boolean>;

export interface Step {
  id: string;
  name: string;
  description?: string;
  status: StepStatus;
  result?: VerificationResult;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  dependencies?: string[];
  retryCount?: number;
}

export interface IntentContract {
  preconditions?: VerificationCheck[];
  postconditions?: VerificationCheck[];
  invariants?: VerificationCheck[];
}

export interface VerificationCheck {
  name?: string;
  check: VerificationCommand | VerificationFunction;
  expect?: any;
  critical?: boolean;
}

export interface IntentExecutionResult {
  success: boolean;
  status: IntentStatus;
  steps: Step[];
  failedStep?: string;
  failureReason?: string;
  duration: number;
  verificationLog: VerificationResult[];
}

export interface IntentOptions {
  parallel?: boolean;
  stopOnFailure?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
  maxRetries?: number;
  timeout?: number;
}