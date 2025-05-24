import { createBoundary } from '../src/build';
import { completeBoundary } from '../src/build';
import { getBoundary as actualGetBoundary } from '../src/utils/general'; // Import actual for fallback if needed

// Import getBoundary - this will be the mocked version due to jest.mock hoisting
import { getBoundary } from '../src/utils/general';

jest.mock('../src/utils/general', () => ({
    __esModule: true, // Important for ES6 modules when manually mocking
    ...jest.requireActual('../src/utils/general'),
    getBoundary: jest.fn(), // This specific function is mocked
}));

describe('createBoundary', () => {
    it('should return a string that starts with "----="', () => {
        const boundary = createBoundary();
        expect(typeof boundary).toBe('string');
        expect(boundary.startsWith('----=')).toBe(true);
    });
});

describe('completeBoundary', () => {
    it('should return null if no boundary or boundary.boundary is provided', () => {
        expect(completeBoundary(null as any)).toBeNull();
        expect(completeBoundary({} as any)).toBeNull();
        expect(completeBoundary({ lines: [] } as any)).toBeNull();
    });

    it('should parse a simple part with headers and body', () => {
        const rawData = {
            boundary: 'boundary123',
            lines: [
                'Content-Type: text/plain',
                'Content-Disposition: inline',
                '',
                'This is the body of the part.'
            ]
        };
        const result = completeBoundary(rawData);
        expect(result).not.toBeNull();
        expect(result?.boundary).toBe('boundary123');
        expect(result?.part.headers['Content-Type']).toBe('text/plain');
        expect(result?.part.headers['Content-Disposition']).toBe('inline');
        expect(result?.part.body).toBe('This is the body of the part.');
    });

    it('should handle headers with new lines', () => {
        const rawData = {
            boundary: 'boundary123',
            lines: [
                'Subject: This is a subject',
                ' with a newline',
                '',
                'Body'
            ]
        };
        const result = completeBoundary(rawData);
        expect(result).not.toBeNull();
        expect(result?.part.headers['Subject']).toBe('This is a subject\r\nwith a newline');
        expect(result?.part.body).toBe('Body');
    });

    it('should return body as a string if no child boundaries are present', () => {
        const rawData = {
            boundary: 'outerBoundary',
            lines: [
                'Content-Type: multipart/mixed; boundary="childBoundary"',
                '',
                'Some text before child boundary parts actually start.',
                '--childBoundary',
                'Content-Type: text/plain',
                '',
                'Child part 1 body',
                '--childBoundary--',
                'Some text after child boundary parts actually end.'
            ]
        };

        (getBoundary as jest.Mock).mockImplementation((contentType: string) => {
            if (contentType && contentType.includes('boundary="childBoundary"')) {
                return 'childBoundary';
            }
            return actualGetBoundary(contentType); // Fallback to actual or define other behavior
        });

        const result = completeBoundary(rawData);
        expect(result).not.toBeNull();
        expect(result?.part.body).toBe('Some text before child boundary parts actually start.\r\n--childBoundary\r\nContent-Type: text/plain\r\n\r\nChild part 1 body\r\n--childBoundary--\r\nSome text after child boundary parts actually end.');
    });

    // Add a beforeEach to clear mocks for other tests in this describe block
    beforeEach(() => {
        // getBoundary is the imported mock function
        (getBoundary as jest.Mock).mockClear();
        // Optionally, reset to a default implementation if most tests need it
        // (getBoundary as jest.Mock).mockImplementation(actualGetBoundary);
    });
}); 