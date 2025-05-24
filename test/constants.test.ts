import { DEFAULT_CHARSET } from '../src/constants';

describe('Constants', () => {
    it('DEFAULT_CHARSET should be utf-8', () => {
        expect(DEFAULT_CHARSET).toBe('utf-8');
    });
}); 