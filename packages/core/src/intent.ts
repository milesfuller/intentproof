/**
 * Intent Class - The core of IntentProof
 * 
 * This ensures AI assistants declare their intentions and verify their claims.
 * No more phantom fixes or imaginary tests.
 */

import {
  IntentStatus,
  Step,
  StepDefinition,
  IntentContract,
  IntentExecutionResult,
  IntentOptions,
  VerificationResult,
  VerificationCheck,
  StepStatus
} from './types';
import { CommandVerifier, FileVerifier, FunctionVerifier, StateVerifier } from './verifiers/base';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';

export class Intent extends EventEmitter {
  public readonly id: string;
  public readonly goal: string;
  public readonly created: Date;
  public status: IntentStatus = 'pending';
  
  private steps: Map<string, Step> = new Map();
  private stepOrder: string[] = [];
  private contract: IntentContract = {};
  private options: IntentOptions;
  private verifiers = {
    command: new CommandVerifier(),
    file: new FileVerifier(),
    function: new FunctionVerifier(),
    state: new StateVerifier()
  };
  
  constructor(goal: string, options: IntentOptions = {}) {
    super();
    this.id = crypto.randomBytes(8).toString('hex');
    this.goal = goal;
    this.created = new Date();
    this.options = {
      stopOnFailure: true,
      verbose: false,
      parallel: false,
      maxRetries: 0,
      timeout: 30000,
      ...options
    };
  }
  
  /**
   * Add a precondition that must be true before execution
   */
  requires(check: string | VerificationCheck | (() => boolean), expected?: any): Intent {
    if (!this.contract.preconditions) {
      this.contract.preconditions = [];
    }
    
    if (typeof check === 'string') {
      this.contract.preconditions.push({
        check: { type: 'command', command: check },
        expect: expected,
        critical: true
      });
    } else if (typeof check === 'function') {
      this.contract.preconditions.push({
        check: check,
        expect: expected,
        critical: true
      });
    } else {
      this.contract.preconditions.push(check);
    }
    
    return this;
  }
  
  /**
   * Add a verification step to the intent
   */
  step(name: string, definition: Partial<StepDefinition> & { verify: any }): Intent {
    const stepId = crypto.randomBytes(4).toString('hex');
    
    const step: Step = {
      id: stepId,
      name,
      description: definition.description,
      status: 'pending',
      dependencies: definition.dependencies
    };
    
    this.steps.set(stepId, step);
    this.stepOrder.push(stepId);
    
    // Store the definition for execution
    (step as any)._definition = definition;
    
    return this;
  }
  
  /**
   * Add a postcondition that must be true after execution
   */
  ensures(check: string | VerificationCheck | (() => boolean), expected?: any): Intent {
    if (!this.contract.postconditions) {
      this.contract.postconditions = [];
    }
    
    if (typeof check === 'string') {
      this.contract.postconditions.push({
        check: { type: 'command', command: check },
        expect: expected,
        critical: true
      });
    } else if (typeof check === 'function') {
      this.contract.postconditions.push({
        check: check,
        expect: expected,
        critical: true
      });
    } else {
      this.contract.postconditions.push(check);
    }
    
    return this;
  }
  
  /**
   * Add an invariant that must remain true throughout execution
   */
  invariant(check: string | VerificationCheck | (() => boolean), expected?: any): Intent {
    if (!this.contract.invariants) {
      this.contract.invariants = [];
    }
    
    if (typeof check === 'string') {
      this.contract.invariants.push({
        check: { type: 'command', command: check },
        expect: expected,
        critical: true
      });
    } else if (typeof check === 'function') {
      this.contract.invariants.push({
        check: check,
        expect: expected
      });
    } else {
      this.contract.invariants.push(check);
    }
    
    return this;
  }
  
  /**
   * Execute the intent and verify all steps
   */
  async execute(): Promise<IntentExecutionResult> {
    const startTime = Date.now();
    const verificationLog: VerificationResult[] = [];
    this.status = 'running';
    
    this.emit('start', { goal: this.goal, steps: this.stepOrder.length });
    
    // Check preconditions
    if (this.contract.preconditions) {
      this.emit('phase', 'preconditions');
      for (const precondition of this.contract.preconditions) {
        const result = await this.verifyCheck(precondition);
        verificationLog.push(result);
        
        if (!result.success && precondition.critical !== false) {
          this.status = 'failed';
          this.emit('failed', { phase: 'preconditions', reason: result.message });
          return {
            success: false,
            status: 'failed',
            steps: Array.from(this.steps.values()),
            failedStep: 'preconditions',
            failureReason: result.message,
            duration: Date.now() - startTime,
            verificationLog
          };
        }
      }
    }
    
    // Execute steps
    this.emit('phase', 'execution');
    for (const stepId of this.stepOrder) {
      const step = this.steps.get(stepId)!;
      const definition = (step as any)._definition as StepDefinition;
      
      // Check dependencies
      if (step.dependencies) {
        const unmetDeps = step.dependencies.filter(depId => {
          const dep = this.steps.get(depId);
          return !dep || dep.status !== 'completed';
        });
        
        if (unmetDeps.length > 0) {
          step.status = 'skipped';
          this.emit('step:skipped', { step: step.name, reason: 'unmet dependencies' });
          continue;
        }
      }
      
      // Check invariants before step
      if (this.contract.invariants) {
        for (const invariant of this.contract.invariants) {
          const result = await this.verifyCheck(invariant);
          if (!result.success) {
            this.status = 'failed';
            step.status = 'failed';
            this.emit('failed', { phase: 'invariant', step: step.name, reason: result.message });
            return {
              success: false,
              status: 'failed',
              steps: Array.from(this.steps.values()),
              failedStep: `invariant before ${step.name}`,
              failureReason: result.message,
              duration: Date.now() - startTime,
              verificationLog
            };
          }
        }
      }
      
      // Execute step
      step.status = 'running';
      step.startTime = new Date();
      this.emit('step:start', { step: step.name });
      
      try {
        // Run action if provided
        if (definition.action) {
          await definition.action();
        }
        
        // Run verification
        const result = await this.verifyStep(definition);
        step.result = result;
        verificationLog.push(result);
        
        if (result.success) {
          step.status = 'completed';
          step.endTime = new Date();
          step.duration = step.endTime.getTime() - step.startTime.getTime();
          this.emit('step:complete', { step: step.name, duration: step.duration });
        } else {
          step.status = 'failed';
          step.endTime = new Date();
          this.emit('step:failed', { step: step.name, reason: result.message });
          
          if (this.options.stopOnFailure) {
            this.status = 'failed';
            return {
              success: false,
              status: 'failed',
              steps: Array.from(this.steps.values()),
              failedStep: step.name,
              failureReason: result.message,
              duration: Date.now() - startTime,
              verificationLog
            };
          }
        }
      } catch (error: any) {
        step.status = 'failed';
        step.result = {
          success: false,
          message: `Step execution error: ${error.message}`,
          timestamp: new Date()
        };
        this.emit('step:error', { step: step.name, error: error.message });
        
        if (this.options.stopOnFailure) {
          this.status = 'failed';
          return {
            success: false,
            status: 'failed',
            steps: Array.from(this.steps.values()),
            failedStep: step.name,
            failureReason: error.message,
            duration: Date.now() - startTime,
            verificationLog
          };
        }
      }
      
      // Check invariants after step
      if (this.contract.invariants) {
        for (const invariant of this.contract.invariants) {
          const result = await this.verifyCheck(invariant);
          if (!result.success) {
            this.status = 'failed';
            this.emit('failed', { phase: 'invariant', step: step.name, reason: result.message });
            return {
              success: false,
              status: 'failed',
              steps: Array.from(this.steps.values()),
              failedStep: `invariant after ${step.name}`,
              failureReason: result.message,
              duration: Date.now() - startTime,
              verificationLog
            };
          }
        }
      }
    }
    
    // Check postconditions
    if (this.contract.postconditions) {
      this.emit('phase', 'postconditions');
      for (const postcondition of this.contract.postconditions) {
        const result = await this.verifyCheck(postcondition);
        verificationLog.push(result);
        
        if (!result.success && postcondition.critical !== false) {
          this.status = 'failed';
          this.emit('failed', { phase: 'postconditions', reason: result.message });
          return {
            success: false,
            status: 'failed',
            steps: Array.from(this.steps.values()),
            failedStep: 'postconditions',
            failureReason: result.message,
            duration: Date.now() - startTime,
            verificationLog
          };
        }
      }
    }
    
    // Success!
    this.status = 'completed';
    const duration = Date.now() - startTime;
    this.emit('complete', { duration, steps: this.steps.size });
    
    return {
      success: true,
      status: 'completed',
      steps: Array.from(this.steps.values()),
      duration,
      verificationLog
    };
  }
  
  /**
   * Verify a single check
   */
  private async verifyCheck(check: VerificationCheck): Promise<VerificationResult> {
    if (typeof check.check === 'function') {
      return this.verifiers.function.verify(check.check, check.expect);
    } else if (check.check.type === 'command') {
      return this.verifiers.command.verify(check.check, check.expect);
    }
    
    return {
      success: false,
      message: 'Unknown verification type',
      timestamp: new Date()
    };
  }
  
  /**
   * Verify a step definition
   */
  private async verifyStep(definition: StepDefinition): Promise<VerificationResult> {
    if (typeof definition.verify === 'function') {
      return this.verifiers.function.verify(definition.verify, definition.expect);
    } else if (typeof definition.verify === 'string') {
      return this.verifiers.command.verify(definition.verify, definition.expect as string);
    } else if (definition.verify.type === 'command') {
      return this.verifiers.command.verify(definition.verify, definition.expect as string);
    }
    
    return {
      success: false,
      message: 'No verification defined for step',
      timestamp: new Date()
    };
  }
  
  /**
   * Get a visual representation of the intent's progress
   */
  visualize(): string {
    const lines: string[] = [];
    
    lines.push(`🎯 Intent: ${this.goal}`);
    lines.push(`   ID: ${this.id}`);
    lines.push(`   Status: ${this.getStatusEmoji()} ${this.status}`);
    lines.push(`   Created: ${this.created.toISOString()}`);
    
    if (this.contract.preconditions?.length) {
      lines.push(`\n   📋 Preconditions: ${this.contract.preconditions.length}`);
    }
    
    if (this.steps.size > 0) {
      lines.push(`\n   📊 Steps:`);
      for (const stepId of this.stepOrder) {
        const step = this.steps.get(stepId)!;
        const emoji = this.getStepEmoji(step.status);
        lines.push(`   ${emoji} ${step.name}`);
        
        if (step.result && !step.result.success) {
          lines.push(`      └─ ❌ ${step.result.message}`);
        } else if (step.duration) {
          lines.push(`      └─ ⏱️  ${step.duration}ms`);
        }
      }
    }
    
    if (this.contract.postconditions?.length) {
      lines.push(`\n   📋 Postconditions: ${this.contract.postconditions.length}`);
    }
    
    if (this.contract.invariants?.length) {
      lines.push(`   🔒 Invariants: ${this.contract.invariants.length}`);
    }
    
    return lines.join('\n');
  }
  
  private getStatusEmoji(): string {
    switch (this.status) {
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'running': return '⏳';
      case 'cancelled': return '🚫';
      default: return '⭕';
    }
  }
  
  private getStepEmoji(status: StepStatus): string {
    switch (status) {
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'running': return '⏳';
      case 'skipped': return '⏭️';
      default: return '⭕';
    }
  }
}