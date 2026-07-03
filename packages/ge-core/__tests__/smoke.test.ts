import { describe, it, expect } from 'vitest';
import { VERSION } from '../src/index';

describe('smoke', () => {
  it('exports version', () => {
    expect(VERSION).toBe('2.0.0-alpha.0');
  });
});
