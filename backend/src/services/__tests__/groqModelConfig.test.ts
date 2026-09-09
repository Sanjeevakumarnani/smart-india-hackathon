import { describe, it, expect, beforeEach, vi } from 'vitest';

const ORIGINAL = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL };
  vi.resetModules();
});

describe('groqModelFor', () => {
  it('maps configured GROQ_* env values onto model kinds', async () => {
    process.env.GROQ_DEFAULT_MODEL = 'model-default';
    process.env.GROQ_FAST_MODEL = 'model-fast';
    process.env.GROQ_REASONING_MODEL = 'model-reasoning';
    process.env.GROQ_VISION_MODEL = 'model-vision';
    process.env.GROQ_SPEECH_MODEL = 'model-speech';

    const { groqModelFor } = await import('../groqService');

    expect(groqModelFor('default')).toBe('model-default');
    expect(groqModelFor('fast')).toBe('model-fast');
    expect(groqModelFor('reasoning')).toBe('model-reasoning');
    expect(groqModelFor('vision')).toBe('model-vision');
    expect(groqModelFor('speech')).toBe('model-speech');
  });

  it('falls back to documented defaults when env is unset', async () => {
    delete process.env.GROQ_DEFAULT_MODEL;
    delete process.env.GROQ_FAST_MODEL;
    delete process.env.GROQ_REASONING_MODEL;
    delete process.env.GROQ_VISION_MODEL;
    delete process.env.GROQ_SPEECH_MODEL;

    const { groqModelFor } = await import('../groqService');

    expect(groqModelFor('default')).toBe('qwen/qwen3.8-27b');
    expect(groqModelFor('fast')).toBe('openai/gpt-oss-20b');
    expect(groqModelFor('reasoning')).toBe('openai/gpt-oss-120b');
    expect(groqModelFor('vision')).toBe('qwen/qwen3.8-27b');
    expect(groqModelFor('speech')).toBe('whisper-large-v3-turbo');
  });
});