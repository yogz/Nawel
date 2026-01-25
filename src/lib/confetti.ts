/**
 * Lazy-loaded confetti utilities
 * Dynamically imports canvas-confetti only when needed to reduce initial bundle size
 */

import type confetti from "canvas-confetti";
import type { Options, Shape } from "canvas-confetti";

// Cache the confetti function once loaded
let confettiFn: typeof confetti | null = null;

/**
 * Gets the confetti function, loading the module if needed
 */
async function getConfetti(): Promise<typeof confetti> {
  if (!confettiFn) {
    const module = await import("canvas-confetti");
    confettiFn = module.default;
  }
  return confettiFn;
}

/**
 * Lazily loads and fires confetti
 */
export async function fireConfetti(options?: Options): Promise<void> {
  const fn = await getConfetti();
  fn(options);
}

/**
 * Creates a shape from text (emoji) - lazy loaded
 */
export async function shapeFromText(options: { text: string }): Promise<Shape> {
  const fn = await getConfetti();
  return fn.shapeFromText(options);
}

/**
 * Fires celebration confetti for new events
 */
export async function fireCelebrationConfetti(): Promise<void> {
  await fireConfetti({
    particleCount: 150,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#ea580c", "#ef4444", "#fbbf24", "#ffffff"],
    zIndex: 200,
  });
}

/**
 * Fires emoji confetti animation (Easter egg)
 */
export async function fireEmojiConfetti(): Promise<void> {
  const fn = await getConfetti();

  const duration = 4 * 1000;
  const end = Date.now() + duration;
  const emojis = ["❤️", "💖", "💕", "🥂", "🌸", "🌺", "🌷", "✨"];
  const emojiShapes = emojis.map((e) => fn.shapeFromText({ text: e }));

  const frame = () => {
    fn({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.8 },
      shapes: emojiShapes as Shape[],
      scalar: 2.5,
    });
    fn({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.8 },
      shapes: emojiShapes as Shape[],
      scalar: 2.5,
    });
    if (Math.random() > 0.7) {
      fn({
        particleCount: 4,
        spread: 120,
        origin: { y: 0.6 },
        shapes: emojiShapes as Shape[],
        scalar: 3.5,
      });
    }
    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };
  frame();
}
