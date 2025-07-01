# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CircleAce Game Overview

CircleAce is a Next.js-based game where players draw circles to match target circles. The game uses AI (Google Gemini via Genkit) to assess drawing accuracy and provide scoring feedback.

## Common Development Commands

### Development Server
- `npm run dev` - Start development server on port 9002 with Turbopack
- `npm run build` - Build the production application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking (use this to verify code changes)

### AI Development
- `npm run genkit:dev` - Start Genkit development server
- `npm run genkit:watch` - Start Genkit with file watching for AI flows

## Architecture Overview

### Core Game Components
- **Game Component** (`src/components/game.tsx`): Main game logic managing game states, scoring, leaderboard, and player progression
- **DrawingCanvas** (`src/components/drawing-canvas.tsx`): HTML5 Canvas component handling circle drawing with mouse/touch input
- **AI Flows** (`src/ai/flows/`): Server-side AI functions for circle assessment and name generation

### Game Flow
1. Player enters name → 2. Game generates target circle → 3. Player draws circle → 4. AI assesses accuracy → 5. Feedback shown → 6. Repeat for 3 lives → 7. Game over with leaderboard

### AI Integration
- Uses Google Gemini 2.0 Flash via Genkit framework
- `assessCircleAccuracy`: Analyzes drawn circles vs targets, returns accuracy/perfection scores and feedback
- `generatePlayerName`: Creates random player names
- AI flows are server-side actions using 'use server' directive

### State Management
- React state for game logic and UI
- localStorage for leaderboard persistence and player name storage
- Game states: "enterName" | "playing" | "assessing" | "feedback" | "gameOver"

### UI Framework
- Next.js 15 with App Router
- Tailwind CSS for styling
- Radix UI components via shadcn/ui
- Responsive design with mobile-specific canvas sizing

### Key Files Structure
- `src/app/page.tsx` - Main page rendering Game component
- `src/components/game.tsx` - Core game logic and state management
- `src/components/drawing-canvas.tsx` - Canvas drawing functionality
- `src/ai/genkit.ts` - AI configuration
- `src/ai/flows/` - AI assessment and generation functions

## Development Notes

### TypeScript Configuration
- Path aliases: `@/*` maps to `src/*`
- Strict mode enabled
- Build errors ignored in next.config.ts (TypeScript and ESLint)

### Database Integration
- **MongoDB**: Persistent storage for leaderboard data using Mongoose
- **Score Model**: Stores username, score, time, and creation date
- **API Routes**: `/api/scores` (GET for leaderboard, POST for saving scores)
- **Environment**: Requires `MONGODB_URI` in `.env.local`

### Firebase Integration
- Configured for Firebase App Hosting
- Uses Google AI via Genkit for ML functionality

### Testing and Validation
- Always run `npm run typecheck` after making changes
- Use `npm run lint` to check code style
- Test game flow: name entry → drawing → AI assessment → scoring → MongoDB save