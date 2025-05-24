import { getBoundary, getCharsetName, mimeDecode } from "../../src/utils/general";

describe('getBoundary', () => {
    it('should return the boundary from a content type string', () => {
        const contentType = 'multipart/alternative; boundary="boundary_string_123"';
        expect(getBoundary(contentType)).toBe('boundary_string_123');
    });

    it('should return undefined if no boundary is present', () => {
        const contentType = 'text/plain';
        expect(getBoundary(contentType)).toBeUndefined();
    });

    it('should handle boundaries with single quotes', () => {
        const contentType = "multipart/mixed; boundary='simple_boundary'";
        expect(getBoundary(contentType)).toBe('simple_boundary');
    });

    it('should handle boundaries without quotes', () => {
        const contentType = 'multipart/related; boundary=anotherboundary';
        expect(getBoundary(contentType)).toBe('anotherboundary');
    });
});

describe('getCharsetName', () => {
    it('should convert charset to lowercase and remove non-alphanumeric characters', () => {
        expect(getCharsetName('UTF-8')).toBe('utf8');
        expect(getCharsetName('ISO-8859-1')).toBe('iso88591');
        expect(getCharsetName('Windows-1252')).toBe('windows1252');
    });

    it('should handle already formatted charsets', () => {
        expect(getCharsetName('utf8')).toBe('utf8');
    });

    it('should handle empty string', () => {
        expect(getCharsetName('')).toBe('');
    });
});

describe('mimeDecode', () => {
    it('should decode a simple MIME encoded string', () => {
        expect(mimeDecode('=48=65=6C=6C=6F')).toBe('Hello'); // "Hello"
    });

    it('should decode a string with mixed encoded and non-encoded parts', () => {
        expect(mimeDecode('Caf=C3=A9')).toBe('Café'); // "Café"
    });

    it('should handle an empty string', () => {
        expect(mimeDecode('')).toBe('');
    });

    it('should handle a string with no encoded parts', () => {
        expect(mimeDecode('Hello World')).toBe('Hello World');
    });

    it('should decode with a specified charset (though underlying decode handles actual conversion)', () => {
        // This test mainly ensures the fromCharset parameter is accepted.
        // The actual charset conversion is handled by the 'decode' function from './charset'
        // and would require more complex setup to test different charsets properly.
        expect(mimeDecode('=48=65=6C=6C=6F', 'UTF-8')).toBe('Hello');
    });

    it('should decode strings with lowercase hex', () => {
        expect(mimeDecode('=48=65=6c=6c=6f')).toBe('Hello');
    });

    it('should handle invalid hex by ignoring the = and treating subsequent chars as literal', () => {
        expect(mimeDecode('=XXHello=41')).toBe('=XXHelloA');
        expect(mimeDecode('=AXHello')).toBe('=AXHello');
    });
});