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
  accuracyScore: z.number().describe('A score representing the accuracy of the drawn circle compared to the target circle (0-100).'),
  feedback: z.string().describe('Feedback on how to improve the drawn circle.'),
});
export type AssessCircleAccuracyOutput = z.infer<typeof AssessCircleAccuracyOutputSchema>;

export async function assessCircleAccuracy(input: AssessCircleAccuracyInput): Promise<AssessCircleAccuracyOutput> {
  return assessCircleAccuracyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'assessCircleAccuracyPrompt',
  input: {schema: AssessCircleAccuracyInputSchema},
  output: {schema: AssessCircleAccuracyOutputSchema},
  prompt: `You are an AI circle accuracy assessor. You will be given a drawn circle image and the parameters of a target circle. Compare the drawn circle to the target circle and give an accuracy score between 0 and 100.  Also, provide feedback on how to improve the drawn circle.

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
    return output!;
  }
);
