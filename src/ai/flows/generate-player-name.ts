'use server';
/**
 * @fileOverview AI flow to generate a player name.
 *
 * - generatePlayerName - A function that generates a player name.
 * - GeneratePlayerNameOutput - The return type for the generatePlayerName function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GeneratePlayerNameOutputSchema = z.object({
  name: z.string().describe('A cool and unique player name for the game.'),
});
export type GeneratePlayerNameOutput = z.infer<typeof GeneratePlayerNameOutputSchema>;

export async function generatePlayerName(): Promise<GeneratePlayerNameOutput> {
  return generatePlayerNameFlow();
}

const prompt = ai.definePrompt({
  name: 'generatePlayerNamePrompt',
  output: {schema: GeneratePlayerNameOutputSchema},
  prompt: `You are a creative assistant. Generate a cool and unique player name for a circle drawing game called CircleAce. The name should be short, memorable, and a single word or a two-word phrase without spaces (e.g., CircleSavant, RoundRobin, ArcAngel).`,
});

const generatePlayerNameFlow = ai.defineFlow(
  {
    name: 'generatePlayerNameFlow',
    outputSchema: GeneratePlayerNameOutputSchema,
  },
  async () => {
    const {output} = await prompt();
    return output!;
  }
);
