# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server at http://localhost:3000
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality checks

## Project Architecture

This is a Next.js TypeScript application demonstrating advanced voice agent patterns using the OpenAI Realtime API and OpenAI Agents SDK. The application supports two main agentic patterns:

### Core Structure

- **Agent Configurations** (`src/app/agentConfigs/`): Contains different agent scenarios
  - `chatSupervisor/` - Chat agent with supervisor model for complex tasks
  - `customerServiceRetail/` - Multi-agent customer service flow with handoffs
  - `simpleHandoff/` - Basic agent-to-agent handoff example
  - `index.ts` - Registry of all agent configurations

- **Components** (`src/app/components/`): React UI components
  - `BottomToolbar.tsx` - Connection controls and settings
  - `Transcript.tsx` - Conversation display
  - `Events.tsx` - Event log display

- **Hooks** (`src/app/hooks/`): Custom React hooks
  - `useRealtimeSession.ts` - Main WebRTC session management
  - `useHandleSessionHistory.ts` - Transcript and history handling

- **API Routes** (`src/app/api/`):
  - `/session` - Creates ephemeral OpenAI session tokens
  - `/responses` - Handles guardrail moderation

### Agent Pattern 1: Chat-Supervisor
Uses a realtime model for basic conversation and a supervisor model (GPT-4.1) for complex tasks and tool calls. The chat agent immediately responds to users while deferring complex operations to the supervisor.

### Agent Pattern 2: Sequential Handoffs
Multiple specialized agents handle different user intents through structured handoffs. Each agent has specific tools and capabilities, and users are transferred between agents based on their needs.

## Key Technologies

- **OpenAI Agents SDK** (`@openai/agents`): Agent orchestration and management
- **Next.js**: React framework with API routes
- **WebRTC**: Real-time audio communication via OpenAI Realtime API
- **TypeScript**: Type safety throughout the codebase
- **Tailwind CSS**: Styling framework

## Environment Setup

- Requires `OPENAI_API_KEY` environment variable
- Copy `.env.sample` to `.env` and add your API key
- Uses `gpt-4o-realtime-preview-2025-06-03` model by default

## Agent Configuration

To create new agent scenarios:
1. Create new agent config in `src/app/agentConfigs/`
2. Export from `src/app/agentConfigs/index.ts`
3. Add to `allAgentSets` object with descriptive key
4. Agent will appear in UI scenario dropdown

Each agent config defines:
- `instructions`: System prompt for the agent
- `tools`: Available function calls
- `toolLogic`: Implementation of tool functions
- `handoffs`: Which agents this agent can transfer to

## Audio and Codec Support

The application supports multiple audio codecs including opus, pcm16, and g711 for testing different audio quality scenarios. Codec selection is available via URL parameter `?codec=opus`.

## Guardrails

Output moderation runs on assistant messages before display, with categories: OFFENSIVE, OFF_BRAND, VIOLENCE, NONE. Moderation logic is in `src/app/App.tsx` handling `guardrail_tripped` events.