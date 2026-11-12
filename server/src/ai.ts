import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { DRAW_COLORS, type Hint } from "@sketch/shared";

// AI players, powered by Claude. Two jobs:
//   guessDrawing: look at a PNG of the canvas and make one guess
//   drawWord:     turn a word into simple line strokes
// Without ANTHROPIC_API_KEY these are never called and bots fall back to a simulation (see rooms.ts).

/** Defaults to Claude Opus 5.5. Set AI_MODEL=claude-haiku-5-5 for a much cheaper (and faster) option. */
export const AI_MODEL = process.env.AI_MODEL || "claude-opus-5-5";
export const aiEnabled = !!process.env.ANTHROPIC_API_KEY;

// Server-side refusal fallback: if the model declines a request, the API retries it on a suitable model.
// Only these model lines support it; Haiku does not.
const SUPPORTS_FALLBACK = /^claude-(opus-5|fable-5|sonnet-5-5)/.test(AI_MODEL);

let client: Anthropic | null = null;
const api = () => (client ??= new Anthropic({ timeout: 45_000, maxRetries: 1 }));

const fallbackParams = () =>
  SUPPORTS_FALLBACK ? { betas: ["server-side-fallback-2026-07-01"] as string[], fallbacks: "default" as const } : {};

const GuessSchema = z.object({ guess: z.string() });

export async function guessDrawing(input: { png: Buffer; wordCount: number; hints: Hint[]; wrongGuesses: string[] }): Promise<string | null> {
  const hintText = input.hints
    .filter((h) => h.kind !== "sound")
    .map((h) => `${h.kind}: ${h.text}`)
    .join("\n");
  const response = await api().beta.messages.parse(
    {
      model: AI_MODEL,
      max_tokens: 4000,
      output_config: { effort: "low", format: betaZodOutputFormat(GuessSchema) },
      ...fallbackParams(),
      system:
        "You are a friendly player in a draw-and-guess party game with office colleagues. " +
        "Look at the drawing in progress and give your single best guess for what it shows. " +
        "Answer with a short, everyday word or phrase in English, lowercase, no punctuation.",
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/png", data: input.png.toString("base64") } },
            {
              type: "text",
              text:
                `The answer is ${input.wordCount} word${input.wordCount === 1 ? "" : "s"}.\n` +
                (hintText ? `Hints from the drawer:\n${hintText}\n` : "") +
                (input.wrongGuesses.length ? `Already guessed and wrong: ${input.wrongGuesses.join(", ")}\n` : "") +
                "Your guess:",
            },
          ],
        },
      ],
    },
    { timeout: 25_000 },
  );
  if (response.stop_reason === "refusal") return null;
  const guess = response.parsed_output?.guess?.trim().toLowerCase().slice(0, 40);
  return guess || null;
}

const DrawSchema = z.object({
  strokes: z.array(
    z.object({
      color: z.enum(DRAW_COLORS),
      thick: z.boolean(),
      points: z.array(z.array(z.number())),
    }),
  ),
});
export type AiDrawing = z.infer<typeof DrawSchema>;

export async function drawWord(word: string): Promise<AiDrawing | null> {
  const response = await api().beta.messages.parse(
    {
      model: AI_MODEL,
      max_tokens: 12000,
      output_config: { effort: "low", format: betaZodOutputFormat(DrawSchema) },
      ...fallbackParams(),
      system:
        "You draw for a draw-and-guess party game. Make a quick, clear doodle that other players can recognise, " +
        "using a few simple line strokes on a 4:3 canvas. Coordinates go from 0 to 1: x left to right, y top to bottom. " +
        "Never draw letters, numbers or words.",
      messages: [
        {
          role: "user",
          content:
            `Draw: "${word}".\n` +
            "Use 4 to 14 strokes. Each stroke is a list of [x, y] points (2 to 40 points) traced in order. " +
            "Outline the main shape first, then add the details that make it recognisable. Mark big outlines as thick.",
        },
      ],
    },
    { timeout: 45_000 },
  );
  if (response.stop_reason === "refusal") return null;
  return response.parsed_output ?? null;
}
