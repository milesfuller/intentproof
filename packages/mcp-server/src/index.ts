#!/usr/bin/env node

/**
 * IntentProof MCP Server
 * 
 * This integrates directly with Claude to verify AI claims in real-time.
 * Every claim gets verified. No more lies.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { Intent } from '@intentproof/core';
import chalk from 'chalk';

// Store active intents
const activeIntents = new Map<string, Intent>();
let currentIntent: Intent | null = null;

// Define our MCP tools
const tools: Tool[] = [
  {
    name: 'intent_declare',
    description: 'Declare an intent before taking action. This ensures claims can be verified.',
    inputSchema: {
      type: 'object',
      properties: {
        goal: {
          type: 'string',
          description: 'What you intend to accomplish'
        },
        preconditions: {
          type: 'array',
          description: 'Conditions that must be true before starting',
          items: {
            type: 'object',
            properties: {
              check: { type: 'string' },
              expect: { type: 'string' }
            }
          }
        },
        steps: {
          type: 'array',
          description: 'Verifiable steps to accomplish the goal',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              verify: { type: 'string' },
              expect: { type: 'string' }
            },
            required: ['name', 'verify']
          }
        },
        postconditions: {
          type: 'array',
          description: 'Conditions that must be true after completion',
          items: {
            type: 'object',
            properties: {
              check: { type: 'string' },
              expect: { type: 'string' }
            }
          }
        }
      },
      required: ['goal', 'steps']
    }
  },
  {
    name: 'intent_verify',
    description: 'Execute and verify the current intent. Returns success only if all verifications pass.',
    inputSchema: {
      type: 'object',
      properties: {
        intentId: {
          type: 'string',
          description: 'Optional intent ID. Uses current intent if not provided.'
        }
      }
    }
  },
  {
    name: 'intent_step',
    description: 'Add a verification step to the current intent',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Step name'
        },
        verify: {
          type: 'string',
          description: 'Verification command'
        },
        expect: {
          type: 'string',
          description: 'Expected output'
        }
      },
      required: ['name', 'verify']
    }
  },
  {
    name: 'intent_quick_check',
    description: 'Quick verification of a single command without creating a full intent',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'Command to verify'
        },
        expect: {
          type: 'string',
          description: 'Expected output'
        }
      },
      required: ['command']
    }
  },
  {
    name: 'intent_status',
    description: 'Get the current status of an intent',
    inputSchema: {
      type: 'object',
      properties: {
        intentId: {
          type: 'string',
          description: 'Optional intent ID. Uses current intent if not provided.'
        }
      }
    }
  }
];

// Create MCP server
const server = new Server(
  {
    name: 'intentproof',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case 'intent_declare': {
        const intent = new Intent(args.goal as string);
        
        // Add preconditions
        if (args.preconditions) {
          for (const pre of args.preconditions as any[]) {
            intent.requires(pre.check, pre.expect);
          }
        }
        
        // Add steps
        if (args.steps) {
          for (const step of args.steps as any[]) {
            intent.step(step.name, {
              verify: step.verify,
              expect: step.expect
            });
          }
        }
        
        // Add postconditions
        if (args.postconditions) {
          for (const post of args.postconditions as any[]) {
            intent.ensures(post.check, post.expect);
          }
        }
        
        activeIntents.set(intent.id, intent);
        currentIntent = intent;
        
        return {
          content: [
            {
              type: 'text',
              text: `Intent declared: ${args.goal}\nID: ${intent.id}\nSteps: ${(args.steps as any[]).length}\n\nUse intent_verify to execute and verify all steps.`
            }
          ]
        };
      }
      
      case 'intent_verify': {
        const intentId = args.intentId as string || currentIntent?.id;
        if (!intentId) {
          return {
            content: [
              {
                type: 'text',
                text: '❌ No intent declared. Use intent_declare first.'
              }
            ]
          };
        }
        
        const intent = activeIntents.get(intentId);
        if (!intent) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Intent not found: ${intentId}`
              }
            ]
          };
        }
        
        // Execute the intent
        const result = await intent.execute();
        
        // Build response
        let response = `🎯 Intent: ${intent.goal}\n`;
        response += '═'.repeat(40) + '\n\n';
        
        if (result.success) {
          response += chalk.green('✅ VERIFIED - All checks passed!\n\n');
          response += `Duration: ${result.duration}ms\n`;
          response += `Steps completed: ${result.steps.filter(s => s.status === 'completed').length}/${result.steps.length}\n`;
        } else {
          response += chalk.red(`❌ FAILED - Verification failed\n\n`);
          response += `Failed at: ${result.failedStep}\n`;
          response += `Reason: ${result.failureReason}\n\n`;
          response += '⚠️  DO NOT claim this task is complete!\n';
        }
        
        response += '\n' + intent.visualize();
        
        return {
          content: [
            {
              type: 'text',
              text: response
            }
          ]
        };
      }
      
      case 'intent_step': {
        if (!currentIntent) {
          return {
            content: [
              {
                type: 'text',
                text: '❌ No current intent. Use intent_declare first.'
              }
            ]
          };
        }
        
        currentIntent.step(args.name as string, {
          verify: args.verify as string,
          expect: args.expect as string
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ Step added: ${args.name}`
            }
          ]
        };
      }
      
      case 'intent_quick_check': {
        const intent = new Intent('Quick check')
          .step('Verify', {
            verify: args.command as string,
            expect: args.expect as string
          });
        
        const result = await intent.execute();
        
        if (result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `✅ Verification passed: ${args.command}`
              }
            ]
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Verification failed: ${result.failureReason}`
              }
            ]
          };
        }
      }
      
      case 'intent_status': {
        const intentId = args.intentId as string || currentIntent?.id;
        if (!intentId) {
          return {
            content: [
              {
                type: 'text',
                text: 'No intent active'
              }
            ]
          };
        }
        
        const intent = activeIntents.get(intentId);
        if (!intent) {
          return {
            content: [
              {
                type: 'text',
                text: `Intent not found: ${intentId}`
              }
            ]
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: intent.visualize()
            }
          ]
        };
      }
      
      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`
            }
          ]
        };
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('IntentProof MCP Server running...');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});