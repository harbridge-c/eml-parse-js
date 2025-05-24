import { encode, arr2str, decode, convert, normalizeCharset } from '../src/charset';

describe('Charset Utilities', () => {
    describe('encode', () => {
        it('should encode a string to UTF-8 Uint8Array', () => {
            const str = 'Hello, World! © €';
            const expected = new Uint8Array([
                72, 101, 108, 108, 111, 44, 32, 87, 111, 114, 108, 100, 33, 32, 194, 169, 32, 226, 130, 172,
            ]);
            expect(encode(str)).toEqual(expected);
        });

        it('should encode an empty string to an empty Uint8Array', () => {
            const str = '';
            const expected = new Uint8Array([]);
            expect(encode(str)).toEqual(expected);
        });
    });

    describe('arr2str', () => {
        it('should convert a Uint8Array to a string', () => {
            const arr = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
            expect(arr2str(arr)).toBe('Hello');
        });

        it('should convert an empty Uint8Array to an empty string', () => {
            const arr = new Uint8Array([]);
            expect(arr2str(arr)).toBe('');
        });

        it('should handle Uint8Array larger than CHUNK_SZ', () => {
            const CHUNK_SZ = 0x8000;
            const part1 = Array(CHUNK_SZ).fill(65); // 'A'
            const part2 = Array(100).fill(66);    // 'B'
            const arr = new Uint8Array([...part1, ...part2]);
            const expectedStr = 'A'.repeat(CHUNK_SZ) + 'B'.repeat(100);
            expect(arr2str(arr)).toBe(expectedStr);
        });
    });

    describe('decode', () => {
        it('should decode a UTF-8 Uint8Array to a string', () => {
            const arr = new Uint8Array([
                72, 101, 108, 108, 111, 44, 32, 87, 111, 114, 108, 100, 33, 32, 194, 169, 32, 226, 130, 172,
            ]);
            const expectedStr = 'Hello, World! © €';
            expect(decode(arr, 'utf-8')).toBe(expectedStr);
        });

        it('should decode an ISO-8859-15 Uint8Array to a string', () => {
            const arr = new Uint8Array([72, 228, 108, 108, 246, 44, 32, 87, 246, 114, 108, 100, 33, 32, 164]); // "Hällö, Wörld! €" in ISO-8859-15 (Euro sign)
            const expectedStr = 'Hällö, Wörld! €';
            expect(decode(arr, 'iso-8859-15')).toBe(expectedStr);
        });

        it('should decode an empty Uint8Array to an empty string', () => {
            const arr = new Uint8Array([]);
            expect(decode(arr, 'utf-8')).toBe('');
        });

        it('should attempt decoding with normalized charset, then utf-8, then iso-8859-15', () => {
            const strInIso = 'naïve €'; // String with chars in ISO-8859-15
            const arrInIso = encode(strInIso, 'iso-8859-15');

            const originalTextDecoder = globalThis.TextDecoder;

            // Mock TextDecoder
            globalThis.TextDecoder = jest.fn().mockImplementation((charset, options) => {
                // console.log(`Mock TextDecoder called with: ${charset}`); // For debugging
                const actualDecoder = new originalTextDecoder(charset, options);
                if (charset === normalizeCharset('my-custom-charset') || charset === 'utf-8') {
                    // Simulate failure for the custom charset and utf-8
                    return {
                        decode: jest.fn().mockImplementation(() => {
                            // console.log(`Mock decode failing for: ${charset}`); // For debugging
                            throw new Error('Simulated decoding error');
                        })
                    };
                }
                // For other charsets (like iso-8859-15), use the real decoder
                return actualDecoder;
            }) as any;

            expect(decode(arrInIso, 'my-custom-charset')).toBe(strInIso);

            globalThis.TextDecoder = originalTextDecoder; // Restore original TextDecoder
        });
    });

    describe('normalizeCharset', () => {
        it('should normalize utf-X charsets', () => {
            expect(normalizeCharset('utf-8')).toBe('UTF-8');
            expect(normalizeCharset('UTF_16')).toBe('UTF-16');
        });

        it('should normalize win-X charsets', () => {
            expect(normalizeCharset('win-1252')).toBe('WINDOWS-1252');
            expect(normalizeCharset('WIN_1251')).toBe('WINDOWS-1251');
        });

        it('should normalize latin-X charsets', () => {
            expect(normalizeCharset('latin-1')).toBe('ISO-8859-1');
            expect(normalizeCharset('LATIN_2')).toBe('ISO-8859-2');
        });

        it('should return the original charset if no normalization rule applies', () => {
            expect(normalizeCharset('ascii')).toBe('ascii');
            expect(normalizeCharset('koi8-r')).toBe('koi8-r');
        });
    });

    describe('convert', () => {
        it('should convert a string to a UTF-8 Uint8Array', () => {
            const str = 'Hello, © €';
            const expected = encode(str); // encode defaults to utf-8
            expect(convert(str)).toEqual(expected);
        });

        it('should convert a Uint8Array (assuming utf-8 if no charset) to a UTF-8 Uint8Array', () => {
            const originalStr = 'Test with some UTF-8: 你好';
            const arrInUtf8 = encode(originalStr, 'utf-8');
            // Since it's already UTF-8, converting it (decode as utf-8 then encode as utf-8) should yield the same array
            expect(convert(arrInUtf8)).toEqual(arrInUtf8);
        });

        it('should handle Uint8Array that decodes to empty string correctly', () => {
            // Test with an array that might represent an empty string in some encoding or becomes empty after normalization/fallback.
            // For simplicity, let's use an empty array which decodes to an empty string.
            const arr = new Uint8Array([]);
            const expected = encode(''); // empty string encoded to utf-8
            expect(convert(arr, 'utf-8')).toEqual(expected);
        });
    });
});
