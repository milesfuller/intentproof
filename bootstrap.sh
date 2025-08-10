#!/bin/bash

# IntentProof Bootstrap Script
# Run this in a new workspace to set up the project with context

echo "🚀 Setting up IntentProof - AI Intent Verification Framework"

# Initialize git repo
git init
git branch -m main

# Create initial commit message that provides context
cat > INITIAL_CONTEXT.md << 'EOF'
# IntentProof - Why This Exists

This project was born from an 8-day debugging nightmare where an AI assistant:
- Claimed to create tests that didn't exist
- Said bugs were fixed when they weren't  
- Generated documentation instead of code
- Wasted countless hours on phantom solutions

The solution: Force AI to verify claims against reality using:
- Hierarchical Intent Trees (break goals into verifiable steps)
- Contract-Based Verification (preconditions/postconditions)
- External validation (not internal "personality traits")

## Core Principle
Before claiming "I fixed X" or "I created Y", the AI must prove it through automated verification.

## Quick Start for AI Assistant
When implementing IntentProof, remember:
1. Every claim needs verification
2. Break complex tasks into verifiable micro-steps
3. Use external commands/checks, not self-assessment
4. Fail fast and honestly when verification fails
EOF

# Create package.json
cat > package.json << 'EOF'
{
  "name": "intentproof",
  "version": "0.1.0",
  "description": "AI Intent Verification Framework - Prove what AI actually did",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "dev": "npm run dev --workspace=packages/cli"
  },
  "keywords": [
    "ai",
    "verification",
    "mcp",
    "llm",
    "intent",
    "validation",
    "claude"
  ],
  "author": "",
  "license": "MIT"
}
EOF

# Create monorepo structure
mkdir -p packages/{core,mcp-server,cli,wasm}/src
mkdir -p docs examples tests

# Create core verification engine starter
cat > packages/core/src/intent.ts << 'EOF'
/**
 * IntentProof Core
 * 
 * CONTEXT: This ensures AI assistants can't lie about what they've done.
 * Every action must be verified against reality.
 */

export interface VerificationResult {
  success: boolean;
  message: string;
  actual?: any;
  expected?: any;
}

export class Intent {
  constructor(public goal: string) {}
  
  step(name: string, verification: {
    verify: string | (() => boolean);
    expect?: string;
  }): Intent {
    // TODO: Implement verification logic
    return this;
  }
  
  async execute(): Promise<{success: boolean; failedStep?: string}> {
    // TODO: Execute steps with verification
    return { success: false, failedStep: 'Not implemented' };
  }
}
EOF

# Create README with full context
cat > README.md << 'EOF'
# IntentProof

> AI Intent Verification Framework - Prove what AI actually did, not what it claims.

## Why IntentProof Exists

After an 8-day debugging session where an AI assistant repeatedly made false claims about:
- Creating tests (no test files existed)
- Fixing bugs (bugs still occurred)
- Implementing features (code was never written)

We realized: **AI assistants need external verification, not internal "personality traits"**.

## How It Works

```typescript
const intent = new Intent('Fix authentication bug')
  .requires('npm test auth', 'fails')  // Must fail before we start
  .step('Find root cause', {
    verify: 'grep -r singleton client.ts',
    expect: 'match found'
  })
  .step('Apply fix', {
    verify: '! grep -r singleton client.ts',
    expect: 'no matches'
  })
  .ensures('npm test auth', 'passes');  // Must pass after

const result = await intent.execute();
// AI can only claim success if ALL verifications pass
```

## The Problem It Solves

❌ **Without IntentProof:**
- AI: "I created the tests"
- Reality: No test files exist
- Result: Hours wasted debugging

✅ **With IntentProof:**
- AI: "I will create tests" → Declaration of intent
- IntentProof: Verifies test files actually exist
- Result: Trust restored, time saved

## Quick Start

```bash
npm install -g intentproof
intentproof init
```

## For AI Assistants

When using IntentProof, you MUST:
1. Declare intent before acting
2. Break tasks into verifiable steps
3. Only claim success when verification passes
4. Fail honestly when verification fails

## Architecture

- **Hierarchical Intent Trees**: Break complex goals into verifiable sub-tasks
- **Contract-Based Verification**: Preconditions, actions, postconditions
- **External Validation**: Real commands, real files, real results
- **MCP Integration**: Works directly with Claude and other AI assistants

## License

MIT
EOF

echo "✅ IntentProof project initialized!"
echo ""
echo "Next steps:"
echo "1. npm install"
echo "2. Start implementing packages/core/src/intent.ts"
echo "3. Create MCP server in packages/mcp-server/"
echo "4. Build CLI in packages/cli/"
echo ""
echo "Remember: Every claim needs proof!"