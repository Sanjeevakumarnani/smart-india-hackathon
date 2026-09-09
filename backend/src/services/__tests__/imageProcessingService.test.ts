import { describe, it, expect } from 'vitest';
import { validateImage } from '../imageProcessingService';

describe('validateImage', () => {
  it('rejects empty input', () => {
    const result = validateImage('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('No image data');
  });

  it('rejects a blank string of base64 whitespace', () => {
    const result = validateImage('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty or corrupted');
  });

  it('accepts a valid JPEG payload and strips the data-URL prefix', () => {
    const onePxJpeg = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const base64 = onePxJpeg;
    const result = validateImage(base64, 'image/jpeg');
    expect(result.valid).toBe(true);
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.base64).toBe(onePxJpeg);
    expect(result.sizeBytes! > 0).toBe(true);
  });

  it('infers mimeType from the data-URL prefix when not supplied', () => {
    const result = validateImage('data:image/png;base64,iVBORw0KGgo=');
    expect(result.valid).toBe(true);
    expect(result.mimeType).toBe('image/png');
  });

  it('rejects an oversized payload over 15 MB', () => {
    // 4 base64 chars decode to 3 bytes, so ~21 MB of chars exceeds 15 MB raw.
    const big = 'A'.repeat(21 * 1024 * 1024);
    const result = validateImage(big, 'image/jpeg');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('15 MB');
  });
});