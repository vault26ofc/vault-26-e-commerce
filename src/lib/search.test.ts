import { describe, it, expect } from 'vitest';
import { cleanSearchTerm, searchOrClause } from './search';

describe('cleanSearchTerm', () => {
  it('removes characters that break the database filter', () => expect(cleanSearchTerm(' shirt, (black)% ')).toBe('shirt black'));
  it('collapses spaces', () => expect(cleanSearchTerm('linen   shirt')).toBe('linen shirt'));
});

describe('searchOrClause', () => {
  it('matches name and description', () =>
    expect(searchOrClause('shirt', [], [])).toBe('name.ilike.%shirt%,description.ilike.%shirt%'));
  it('also matches products in matching categories and brands', () =>
    expect(searchOrClause('nike', ['c1'], ['b1', 'b2'])).toBe('name.ilike.%nike%,description.ilike.%nike%,category_id.in.(c1),brand_id.in.(b1,b2)'));
  it('matches every word of a multi-word search in the name', () =>
    expect(searchOrClause('linen shirt', [], [])).toBe('name.ilike.%linen shirt%,description.ilike.%linen shirt%,and(name.ilike.%linen%,name.ilike.%shirt%)'));
});
