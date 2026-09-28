import { describe, it, expect } from 'vitest';
import { describeError } from './errors';

describe('describeError', () => {
  it('includes message, details and hint', () =>
    expect(describeError({ message: 'insert failed', details: 'Key (slug)=(x) exists', hint: 'use another slug' }))
      .toBe('insert failed — Key (slug)=(x) exists — use another slug'));
  it('explains common database codes', () =>
    expect(describeError({ code: '23505', message: 'duplicate key value violates unique constraint' }))
      .toMatch(/^That value already exists/));
  it('handles strings and Error objects', () => {
    expect(describeError('Choose a category')).toBe('Choose a category');
    expect(describeError(new Error('boom'))).toBe('boom');
  });
});
