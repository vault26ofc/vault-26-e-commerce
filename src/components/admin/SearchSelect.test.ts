import { describe, it, expect } from 'vitest';
import { filterOptions } from './SearchSelect';

const opts = [
  { value: 'a', label: 'Shirts', group: 'Categories' },
  { value: 'b', label: 'Trousers', group: 'Categories' },
  { value: '/lookbook', label: 'Lookbook', group: 'Pages' },
];

describe('filterOptions', () => {
  it('returns everything for an empty query', () => expect(filterOptions(opts, '  ')).toHaveLength(3));
  it('matches labels case-insensitively', () => expect(filterOptions(opts, 'SHI').map((o) => o.value)).toEqual(['a']));
  it('matches the group name too', () => expect(filterOptions(opts, 'pages').map((o) => o.value)).toEqual(['/lookbook']));
});
