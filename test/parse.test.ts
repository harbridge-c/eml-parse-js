import { ParsedEml } from '../src/interface';
import { parse as parseEml } from '../src/parse';

describe('parseEml', () => {
    it('should parse a simple EML string with headers and body', () => {
        const eml = `Date: Mon, 23 Sep 2024 10:00:00 +0000\r\nFrom: "Sender" <sender@example.com>\r\nTo: "Receiver" <receiver@example.com>\r\nSubject: Test Email\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nThis is the body of the email.\r\n`;
        const result = parseEml(eml) as ParsedEml;
        expect(result.headers?.From).toContain('"Sender" <sender@example.com>');
        expect(result.headers?.Subject).toContain('Test Email');
        expect(result.body).toContain('This is the body of the email.');
    });

    it('should handle the headersOnly option', () => {
        const eml = `From: sender@example.com\r\nTo: receiver@example.com\r\nSubject: Test\r\n\r\nBody content`;
        const result = parseEml(eml, { headersOnly: true }) as ParsedEml;
        expect(result.headers?.Subject).toContain('Test');
        expect(result.body).toBeUndefined();
    });

    it('should parse an EML with multi-line headers', () => {
        const eml = `Subject: This is a very long subject\r\n that continues on the next line\r\nFrom: test@example.com\r\n\r\nBody`;
        const result = parseEml(eml) as ParsedEml;
        expect(result.headers?.Subject).toContain('This is a very long subject');
        expect(result.body).toContain('Body');
    });

    it('should handle multiple headers with the same name', () => {
        const eml = `Received: from mailserver1 (server1.example.com [10.0.0.1])\r\nReceived: from mailserver2 (server2.example.com [10.0.0.2])\r\nFrom: test@example.com\r\n\r\nBody`;
        const result = parseEml(eml) as ParsedEml;
        expect(Array.isArray(result.headers?.Received)).toBe(true);
        expect(result.headers?.Received).toEqual([
            'from mailserver1 (server1.example.com [10.0.0.1])',
            'from mailserver2 (server2.example.com [10.0.0.2])',
        ]);
    });

    it('should return an error for invalid EML input type', () => {
        try {
            // @ts-expect-error testing invalid input
            parseEml(12345);
            // Fail test if no error is thrown
            expect(true).toBe(false);
        } catch (e: any) {
            expect(e).toBeInstanceOf(Error);
            expect(e.message).toBe('Error parsing EML data');
            expect(e.cause).toBeInstanceOf(Error);
            expect(e.cause.message).toBe('Argument "eml" expected to be string!');
        }
    });

    it('should parse a multipart/alternative message', () => {
        const boundary = 'boundary_string';
        const eml = `From: sender@example.com\r\n\
To: receiver@example.com\r\n\
Subject: Multipart Email\r\n\
Content-Type: multipart/alternative; boundary="${boundary}"\r\n\
\r\n\
--${boundary}\r\n\
Content-Type: text/plain; charset=utf-8\r\n\
\r\n\
This is the plain text part.\r\n\
--${boundary}\r\n\
Content-Type: text/html; charset=utf-8\r\n\
\r\n\
<p>This is the HTML part.</p>\r\n\
--${boundary}--\r\n`;
        const result = parseEml(eml) as ParsedEml;
        expect(result.headers?.['Content-Type']).toBe(`multipart/alternative; boundary="${boundary}"`);
        expect(Array.isArray(result.body)).toBe(true);
        const bodyParts = result.body as any[];
        expect(bodyParts.length).toBe(2);

        expect(bodyParts[0].boundary).toBe(boundary);
        expect(bodyParts[0].part.headers?.['Content-Type']).toBe('text/plain; charset=utf-8');
        expect(bodyParts[0].part.body).toContain('This is the plain text part.');

        expect(bodyParts[1].boundary).toBe(boundary);
        expect(bodyParts[1].part.headers?.['Content-Type']).toBe('text/html; charset=utf-8');
        expect(bodyParts[1].part.body).toContain('<p>This is the HTML part.</p>');
    });

    it('should parse a multipart/mixed message with an attachment', () => {
        const boundary = 'mixed_boundary';
        const eml = `From: sender@example.com\r\n\
To: receiver@example.com\r\n\
Subject: Email with Attachment\r\n\
Content-Type: multipart/mixed; boundary="${boundary}"\r\n\
\r\n\
--${boundary}\r\n\
Content-Type: text/plain; charset=utf-8\r\n\
\r\n\
This is the main text content.\r\n\
--${boundary}\r\n\
Content-Type: application/octet-stream\r\n\
Content-Disposition: attachment; filename="test.txt"\r\n\
Content-Transfer-Encoding: base64\r\n\
\r\n\
SGVsbG8gV29ybGQ=\r\n\
--${boundary}--\r\n`;
        const result = parseEml(eml) as ParsedEml;
        expect(Array.isArray(result.body)).toBe(true);
        const bodyParts = result.body as any[];
        expect(bodyParts.length).toBe(2);

        expect(bodyParts[1].part.headers?.['Content-Disposition']).toBe('attachment; filename="test.txt"');
        expect(bodyParts[1].part.headers?.['Content-Transfer-Encoding']).toBe('base64');
        expect(bodyParts[1].part.body).toContain('SGVsbG8gV29ybGQ='); // Base64 for "Hello World"
    });

    it('should parse a nested multipart message', () => {
        const outerBoundary = 'outer_boundary';
        const innerBoundary = 'inner_boundary';
        const eml = `From: sender@example.com\r\n\
To: receiver@example.com\r\n\
Subject: Nested Multipart Email\r\n\
Content-Type: multipart/mixed; boundary="${outerBoundary}"\r\n\
\r\n\
--${outerBoundary}\r\n\
Content-Type: multipart/alternative; boundary="${innerBoundary}"\r\n\
\r\n\
--${innerBoundary}\r\n\
Content-Type: text/plain; charset=utf-8\r\n\
\r\n\
Plain text part.\r\n\
--${innerBoundary}\r\n\
Content-Type: text/html; charset=utf-8\r\n\
\r\n\
<p>HTML part.</p>\r\n\
--${innerBoundary}--\r\n\
--${outerBoundary}\r\n\
Content-Type: application/octet-stream\r\n\
Content-Disposition: attachment; filename="dummy.pdf"\r\n\
\r\n\
[Fake PDF Content]\r\n\
--${outerBoundary}--\r\n`;
        const result = parseEml(eml) as ParsedEml;
        expect(Array.isArray(result.body)).toBe(true);
        const outerParts = result.body as any[];
        expect(outerParts.length).toBe(2);

        // Check the nested multipart/alternative part
        expect(outerParts[0].part.headers?.['Content-Type']).toBe(`multipart/alternative; boundary="${innerBoundary}"`);
        expect(Array.isArray(outerParts[0].part.body)).toBe(true);
        const innerParts = outerParts[0].part.body as any[];
        expect(innerParts.length).toBe(2);
        expect(innerParts[0].part.headers?.['Content-Type']).toBe('text/plain; charset=utf-8');
        expect(innerParts[0].part.body).toBe('Plain text part.');
        expect(innerParts[1].part.headers?.['Content-Type']).toBe('text/html; charset=utf-8');
        expect(innerParts[1].part.body).toBe('<p>HTML part.</p>');

        // Check the attachment part
        expect(outerParts[1].part.headers?.['Content-Type']).toBe('application/octet-stream');
        expect(outerParts[1].part.body).toContain('[Fake PDF Content]');
    });

    it('should handle content-type definition in body', () => {
        const eml = `From: sender@example.com\r\n\
To: receiver@example.com\r\n\
Subject: Content-Type in Body Test\r\n\
\r\n\
Content-Type: text/plain; charset=utf-8\r\n\
\r\n\
This is the actual body content.\r\n`;
        const result = parseEml(eml) as ParsedEml;
        expect(result.headers?.['Content-Type']).toBe('text/plain; charset=utf-8'); // Header was not in the header section
        // The parser should pick up Content-Type if it appears before the actual body, even if after the first empty line
        // Based on parseRecursive logic, if ct is not in headers, it checks the lines after the empty line for 'Content-Type'
        expect(result.body).toContain('This is the actual body content.');
    });
}); 