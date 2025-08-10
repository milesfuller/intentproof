/**
 * Base Verifier Classes
 * These handle the actual verification of AI claims against reality
 */

import { VerificationResult, VerificationCommand, VerificationFunction } from '../types';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export abstract class BaseVerifier {
  abstract verify(input: any, expected?: any): Promise<VerificationResult>;
  
  protected createResult(success: boolean, message: string, actual?: any, expected?: any): VerificationResult {
    return {
      success,
      message,
      actual,
      expected,
      timestamp: new Date(),
      evidence: []
    };
  }
}

export class CommandVerifier extends BaseVerifier {
  async verify(command: string | VerificationCommand, expected?: string): Promise<VerificationResult> {
    const cmd = typeof command === 'string' ? command : command.command;
    const options = typeof command === 'string' ? {} : {
      cwd: command.cwd,
      env: { ...process.env, ...command.env }
    };
    
    try {
      const output = execSync(cmd, {
        encoding: 'utf-8',
        ...options
      }).trim();
      
      // No expectation - just check command succeeded
      if (expected === undefined) {
        return this.createResult(true, `Command executed successfully`, output);
      }
      
      // Check various expectation formats
      const result = this.checkExpectation(output, expected);
      return this.createResult(
        result.matches,
        result.matches ? 'Output matches expectation' : 'Output does not match',
        output,
        expected
      );
    } catch (error: any) {
      // Check if failure was expected
      if (expected === 'fails' || expected === 'error') {
        return this.createResult(true, 'Command failed as expected', error.message, expected);
      }
      
      return this.createResult(false, `Command failed: ${error.message}`, error.message, expected);
    }
  }
  
  private checkExpectation(output: string, expected: string): { matches: boolean } {
    // Regex pattern
    if (expected.startsWith('/') && expected.endsWith('/')) {
      const pattern = new RegExp(expected.slice(1, -1));
      return { matches: pattern.test(output) };
    }
    
    // Numeric comparisons
    if (expected.match(/^[<>=]\d+$/)) {
      const operator = expected[0];
      const expectedNum = parseInt(expected.slice(1));
      const actualNum = parseInt(output);
      
      if (isNaN(actualNum)) return { matches: false };
      
      switch (operator) {
        case '>': return { matches: actualNum > expectedNum };
        case '<': return { matches: actualNum < expectedNum };
        case '=': return { matches: actualNum === expectedNum };
        default: return { matches: false };
      }
    }
    
    // Boolean expectations
    if (expected === 'true' || expected === 'false') {
      const expectBool = expected === 'true';
      const actualBool = output === 'true' || output === '1' || output === 'yes';
      return { matches: expectBool === actualBool };
    }
    
    // Exit code expectation
    if (expected === 'exit 0' || expected === 'success') {
      return { matches: true }; // We got here, so command succeeded
    }
    
    // Contains check
    if (expected.startsWith('contains:')) {
      const searchStr = expected.slice(9);
      return { matches: output.includes(searchStr) };
    }
    
    // Exact match
    return { matches: output.includes(expected) };
  }
}

export class FileVerifier extends BaseVerifier {
  async verify(filePath: string, checks?: {
    exists?: boolean;
    contains?: string | string[];
    matches?: RegExp;
    size?: { min?: number; max?: number };
    modified?: { after?: Date; before?: Date };
  }): Promise<VerificationResult> {
    const exists = fs.existsSync(filePath);
    
    // Check existence
    if (checks?.exists !== undefined) {
      if (exists !== checks.exists) {
        return this.createResult(
          false,
          checks.exists ? `File does not exist: ${filePath}` : `File should not exist: ${filePath}`,
          exists,
          checks.exists
        );
      }
      if (!checks.exists) {
        return this.createResult(true, 'File does not exist as expected');
      }
    }
    
    if (!exists) {
      return this.createResult(false, `File not found: ${filePath}`);
    }
    
    const stats = fs.statSync(filePath);
    const evidence: string[] = [`File size: ${stats.size} bytes`];
    
    // Size checks
    if (checks?.size) {
      if (checks.size.min !== undefined && stats.size < checks.size.min) {
        return this.createResult(false, `File too small: ${stats.size} < ${checks.size.min}`, stats.size, checks.size);
      }
      if (checks.size.max !== undefined && stats.size > checks.size.max) {
        return this.createResult(false, `File too large: ${stats.size} > ${checks.size.max}`, stats.size, checks.size);
      }
    }
    
    // Modified time checks
    if (checks?.modified) {
      if (checks.modified.after && stats.mtime < checks.modified.after) {
        return this.createResult(false, 'File not modified recently', stats.mtime, checks.modified.after);
      }
      if (checks.modified.before && stats.mtime > checks.modified.before) {
        return this.createResult(false, 'File modified too recently', stats.mtime, checks.modified.before);
      }
    }
    
    // Content checks
    if (checks?.contains || checks?.matches) {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      if (checks.contains) {
        const searchTerms = Array.isArray(checks.contains) ? checks.contains : [checks.contains];
        for (const term of searchTerms) {
          if (!content.includes(term)) {
            return this.createResult(
              false,
              `File does not contain: "${term}"`,
              'file content',
              term
            );
          }
          evidence.push(`Contains: "${term}"`);
        }
      }
      
      if (checks.matches && !checks.matches.test(content)) {
        return this.createResult(
          false,
          `File does not match pattern: ${checks.matches}`,
          'file content',
          checks.matches.toString()
        );
      }
    }
    
    return {
      success: true,
      message: `File verification passed: ${filePath}`,
      evidence,
      timestamp: new Date()
    };
  }
}

export class FunctionVerifier extends BaseVerifier {
  async verify(fn: VerificationFunction, expected: any = true): Promise<VerificationResult> {
    try {
      const result = await fn();
      const success = expected === undefined ? Boolean(result) : result === expected;
      
      return this.createResult(
        success,
        success ? 'Function verification passed' : 'Function verification failed',
        result,
        expected
      );
    } catch (error: any) {
      return this.createResult(
        false,
        `Function threw error: ${error.message}`,
        error.message,
        expected
      );
    }
  }
}

export class StateVerifier extends BaseVerifier {
  private snapshots: Map<string, any> = new Map();
  
  snapshot(key: string, value: any): void {
    this.snapshots.set(key, JSON.parse(JSON.stringify(value)));
  }
  
  async verify(key: string, expected?: any): Promise<VerificationResult> {
    if (!this.snapshots.has(key)) {
      return this.createResult(false, `No snapshot found for key: ${key}`);
    }
    
    const actual = this.snapshots.get(key);
    
    if (expected === undefined) {
      return this.createResult(true, 'Snapshot exists', actual);
    }
    
    const matches = JSON.stringify(actual) === JSON.stringify(expected);
    return this.createResult(
      matches,
      matches ? 'State matches expected' : 'State does not match',
      actual,
      expected
    );
  }
  
  diff(key1: string, key2: string): VerificationResult {
    if (!this.snapshots.has(key1) || !this.snapshots.has(key2)) {
      return this.createResult(false, 'Missing snapshots for comparison');
    }
    
    const snap1 = this.snapshots.get(key1);
    const snap2 = this.snapshots.get(key2);
    
    const same = JSON.stringify(snap1) === JSON.stringify(snap2);
    return this.createResult(
      same,
      same ? 'States are identical' : 'States differ',
      snap2,
      snap1
    );
  }
}