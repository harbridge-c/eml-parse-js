import { isStringOrError, wrap } from "../../src/utils/string";

describe('wrap', () => {
    it('should wrap a string to a specified number of characters per row', () => {
        const str = 'abcdefghijklmnopqrstuvwxyz';
        const wrapped = wrap(str, 5);
        expect(wrapped).toBe('abcde\r\nfghij\r\nklmno\r\npqrst\r\nuvwxy\r\nz');
    });

    it('should handle strings shorter than the wrap length', () => {
        const str = 'abc';
        const wrapped = wrap(str, 5);
        expect(wrapped).toBe('abc');
    });

    it('should handle empty strings', () => {
        const str = '';
        const wrapped = wrap(str, 5);
        expect(wrapped).toBe('');
    });

    it('should handle strings where length is a multiple of wrap length', () => {
        const str = 'abcdef';
        const wrapped = wrap(str, 3);
        expect(wrapped).toBe('abc\r\ndef');
    });
});

describe('isStringOrError', () => {
    it('should return true for strings', () => {
        expect(isStringOrError('hello')).toBe(true);
        expect(isStringOrError('')).toBe(true);
    });

    it('should return true for Error objects', () => {
        expect(isStringOrError(new Error('test error'))).toBe(true);
        expect(isStringOrError(new TypeError('type error'))).toBe(true);
    });

    it('should return false for other types', () => {
        expect(isStringOrError(123)).toBe(false);
        expect(isStringOrError(null)).toBe(false);
        expect(isStringOrError(undefined)).toBe(false);
        expect(isStringOrError({})).toBe(false);
        expect(isStringOrError([])).toBe(false);
        expect(isStringOrError(() => { })).toBe(false);
    });
});
