'use server';

/**
 * @fileOverview AI flow to assess the accuracy of a drawn circle compared to a target circle.
 *
 * - assessCircleAccuracy - A function that handles the circle accuracy assessment process.
 * - AssessCircleAccuracyInput - The input type for the assessCircleAccuracy function.
 * - AssessCircleAccuracyOutput - The return type for the assessCircleAccuracy function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AssessCircleAccuracyInputSchema = z.object({
  drawnCircleDataUri: z
    .string()
    .describe(
      "A drawing of a circle, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  targetCircle: z.object({
    x: z.number().describe('The x-coordinate of the target circle center.'),
    y: z.number().describe('The y-coordinate of the target circle center.'),
    radius: z.number().describe('The radius of the target circle.'),
  }).describe('The target circle parameters.'),
});
export type AssessCircleAccuracyInput = z.infer<typeof AssessCircleAccuracyInputSchema>;

const AssessCircleAccuracyOutputSchema = z.object({
  accuracyScore: z.number().describe('A score from 0-100 representing how accurately the drawn circle matches the target circle\'s position and radius.'),
  perfectionScore: z.number().describe('A score from 0-100 representing how close to a perfect circle the drawing is, regardless of the target.'),
  finalScore: z.number().describe('A weighted final score from 0-100, combining both accuracy (70% weight) and perfection (30% weight).'),
  feedback: z.string().describe('Feedback on how to improve the drawn circle, covering both accuracy against the target and the perfection of the shape.'),
});
export type AssessCircleAccuracyOutput = z.infer<typeof AssessCircleAccuracyOutputSchema>;

export async function assessCircleAccuracy(input: AssessCircleAccuracyInput): Promise<AssessCircleAccuracyOutput> {
  return assessCircleAccuracyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'assessCircleAccuracyPrompt',
  input: {schema: AssessCircleAccuracyInputSchema},
  output: {schema: AssessCircleAccuracyOutputSchema},
  prompt: `You are an AI circle drawing judge. Your task is to assess a user's attempt to draw a circle based on a target.

You will provide three scores:
1.  **Accuracy Score (0-100):** How well does the drawn circle match the target circle in terms of position (center x, y) and size (radius)? A perfect match is 100.
2.  **Perfection Score (0-100):** How perfectly circular is the shape the user drew? Ignore the target for this score. A geometrically perfect circle is 100.
3.  **Final Score (0-100):** This should be a weighted average of the Accuracy Score (70% weight) and the Perfection Score (30% weight).

Also, provide concise, helpful feedback on how to improve.

Drawn Circle: {{media url=drawnCircleDataUri}}
Target Circle: x={{targetCircle.x}}, y={{targetCircle.y}}, radius={{targetCircle.radius}}`,
});

const assessCircleAccuracyFlow = ai.defineFlow(
  {
    name: 'assessCircleAccuracyFlow',
    inputSchema: AssessCircleAccuracyInputSchema,
    outputSchema: AssessCircleAccuracyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // Ensure finalScore is an integer
    if (output) {
      output.finalScore = Math.round(output.finalScore);
      output.accuracyScore = Math.round(output.accuracyScore);
      output.perfectionScore = Math.round(output.perfectionScore);
    }
    return output!;
  }
);
