#!/usr/bin/env node

/**
 * IntentProof CLI
 * Command-line interface for verifying AI assistant claims
 */

import { Command } from 'commander';
import { Intent } from '../../core/src/intent';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

program
  .name('intentproof')
  .description('AI Intent Verification Framework - Prove what AI actually did')
  .version('0.1.0');

// Verify command
program
  .command('verify <intent-file>')
  .description('Execute and verify an intent from a JSON file')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (intentFile: string, options: { verbose?: boolean }) => {
    try {
      const filePath = path.resolve(intentFile);
      if (!fs.existsSync(filePath)) {
        console.error(chalk.red(`Intent file not found: ${filePath}`));
        process.exit(1);
      }
      
      const intentData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const intent = new Intent(intentData.goal, intentData.options);
      
      // Add preconditions
      if (intentData.preconditions) {
        for (const pre of intentData.preconditions) {
          intent.requires(pre.check, pre.expect);
        }
      }
      
      // Add steps
      if (intentData.steps) {
        for (const step of intentData.steps) {
          intent.step(step.name, step);
        }
      }
      
      // Add postconditions
      if (intentData.postconditions) {
        for (const post of intentData.postconditions) {
          intent.ensures(post.check, post.expect);
        }
      }
      
      // Set up event listeners
      const spinner = ora();
      
      intent.on('start', (data) => {
        console.log(chalk.blue(`\n🎯 Executing Intent: ${intentData.goal}`));
        console.log(chalk.gray(`   Steps: ${data.steps}`));
      });
      
      intent.on('phase', (phase) => {
        spinner.stop();
        console.log(chalk.yellow(`\n📋 ${phase.charAt(0).toUpperCase() + phase.slice(1)}:`));
      });
      
      intent.on('step:start', (data) => {
        spinner.start(chalk.cyan(`Running: ${data.step}`));
      });
      
      intent.on('step:complete', (data) => {
        spinner.succeed(chalk.green(`✅ ${data.step} (${data.duration}ms)`));
      });
      
      intent.on('step:failed', (data) => {
        spinner.fail(chalk.red(`❌ ${data.step}: ${data.reason}`));
      });
      
      intent.on('step:skipped', (data) => {
        spinner.info(chalk.yellow(`⏭️  ${data.step}: ${data.reason}`));
      });
      
      // Execute
      const result = await intent.execute();
      
      spinner.stop();
      
      // Show results
      console.log('\n' + '═'.repeat(50));
      if (result.success) {
        console.log(chalk.green.bold('✨ Intent Completed Successfully!'));
        console.log(chalk.gray(`   Duration: ${result.duration}ms`));
        console.log(chalk.gray(`   Steps completed: ${result.steps.filter(s => s.status === 'completed').length}/${result.steps.length}`));
      } else {
        console.log(chalk.red.bold('❌ Intent Failed'));
        console.log(chalk.red(`   Failed at: ${result.failedStep}`));
        console.log(chalk.red(`   Reason: ${result.failureReason}`));
      }
      
      if (options.verbose) {
        console.log('\n' + intent.visualize());
      }
      
      process.exit(result.success ? 0 : 1);
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Check command - quick inline verification
program
  .command('check <command>')
  .description('Quick verification of a single command')
  .option('-e, --expect <value>', 'Expected output')
  .action(async (command: string, options: { expect?: string }) => {
    const intent = new Intent('Quick check')
      .step('Verify command', {
        verify: command,
        expect: options.expect
      });
    
    const spinner = ora(`Running: ${command}`).start();
    const result = await intent.execute();
    
    if (result.success) {
      spinner.succeed(chalk.green('Command verified successfully'));
    } else {
      spinner.fail(chalk.red(`Verification failed: ${result.failureReason}`));
    }
    
    process.exit(result.success ? 0 : 1);
  });

// Init command - create example intent file
program
  .command('init')
  .description('Create an example intent.json file')
  .action(() => {
    const exampleIntent = {
      goal: "Create and test a new feature",
      options: {
        verbose: true,
        stopOnFailure: true
      },
      preconditions: [
        {
          check: "test -d src",
          expect: "src",
          name: "Source directory exists"
        }
      ],
      steps: [
        {
          name: "Create feature file",
          verify: "test -f src/feature.ts",
          expect: "src/feature.ts"
        },
        {
          name: "Create test file",
          verify: "test -f tests/feature.test.ts",
          expect: "tests/feature.test.ts"
        },
        {
          name: "Tests pass",
          verify: "npm test feature",
          expect: "pass"
        }
      ],
      postconditions: [
        {
          check: "npm run build",
          expect: "exit 0",
          name: "Build succeeds"
        }
      ]
    };
    
    fs.writeFileSync('intent.json', JSON.stringify(exampleIntent, null, 2));
    console.log(chalk.green('✅ Created intent.json'));
    console.log(chalk.gray('Edit this file to define your verification intent'));
    console.log(chalk.gray('Run with: intentproof verify intent.json'));
  });

// Watch command - monitor AI actions in real-time
program
  .command('watch')
  .description('Watch for AI actions and verify them in real-time')
  .option('-c, --config <file>', 'Configuration file', 'intentproof.config.json')
  .action((options) => {
    console.log(chalk.yellow('🔍 Watching for AI actions...'));
    console.log(chalk.gray('This feature will monitor file changes and command executions'));
    console.log(chalk.gray('Configuration: ' + options.config));
    console.log(chalk.red('\n⚠️  This feature is coming soon!'));
  });

// Examples command
program
  .command('examples')
  .description('Show example usage patterns')
  .action(() => {
    console.log(chalk.blue('\n📚 IntentProof Examples\n'));
    
    console.log(chalk.yellow('1. Verify a bug fix:'));
    console.log(chalk.gray(`
{
  "goal": "Fix authentication bug",
  "preconditions": [
    { "check": "npm test auth", "expect": "fails" }
  ],
  "steps": [
    { "name": "Apply fix", "verify": "grep -v singleton client.ts", "expect": "" }
  ],
  "postconditions": [
    { "check": "npm test auth", "expect": "passes" }
  ]
}`));
    
    console.log(chalk.yellow('\n2. Verify file creation:'));
    console.log(chalk.gray(`
{
  "goal": "Create test files",
  "steps": [
    { "name": "Create unit test", "verify": "test -f unit.test.ts" },
    { "name": "Create integration test", "verify": "test -f integration.test.ts" }
  ]
}`));
    
    console.log(chalk.yellow('\n3. Verify refactoring (with invariants):'));
    console.log(chalk.gray(`
{
  "goal": "Refactor to TypeScript",
  "invariants": [
    { "check": "npm test", "expect": "passes" }
  ],
  "steps": [
    { "name": "Convert files", "verify": "find src -name '*.ts' | wc -l", "expect": ">0" },
    { "name": "No JS files remain", "verify": "find src -name '*.js' | wc -l", "expect": "0" }
  ]
}`));
  });

program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}