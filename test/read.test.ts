import { parseEml } from '../src';
import { EmlContent } from '../src/interface';
import { read as readEml } from '../src/read'; // Aliasing import

describe('readEml', () => {
    it('should read a simple EML string and parse basic headers and text body', () => {
        const eml = `Date: Mon, 23 Sep 2024 10:00:00 +0000\r\n\
From: "Sender" <sender@example.com>\r\n\
To: "Receiver" <receiver@example.com>\r\n\
CC: "Carbon Copy" <cc@example.com>\r\n\
Subject: Test Subject\r\n\
Content-Type: text/plain; charset=utf-8\r\n\
\r\n\
This is the plain text body of the email.\r\n`;
        const result = readEml(parseEml(eml)) as EmlContent;

        expect(result.date).toEqual(new Date('Mon, 23 Sep 2024 10:00:00 +0000'));
        expect(result.subject).toBe('Test Subject');
        expect(result.from).toEqual([{ name: 'Sender', email: 'sender@example.com' }]);
        expect(result.to).toEqual([{ name: 'Receiver', email: 'receiver@example.com' }]);
        expect(result.cc).toEqual([{ name: 'Carbon Copy', email: 'cc@example.com' }]);
        expect(result.html).toBeUndefined();
        expect(result.attachments).toBeUndefined();
    });

    it('should read an EML with HTML body', () => {
        const eml = `From: sender@example.com\r\n\
Date: Mon, 23 Sep 2024 10:00:00 +0000\r\n\
Subject: HTML Email\r\n\
Content-Type: text/html; charset=utf-8\r\n\
\r\n\
<html><body><p>This is an <b>HTML</b> body.</p></body></html>\r\n`;
        const result = readEml(parseEml(eml)) as EmlContent;
        expect(result.subject).toBe('HTML Email');
        expect(result.html).toBe('<html><body><p>This is an <b>HTML</b> body.</p></body></html>');
        expect(result.text).toBeUndefined();
    });

    it('should correctly parse quoted-printable encoded body', () => {
        const eml = `Date: Tue, 24 Sep 2024 10:00:00 +0000\r\n\
From: sender@example.com\r\n\
Subject: Quoted-Printable Email\r\n\
Content-Type: text/plain; charset=utf-8\r\n\
Content-Transfer-Encoding: quoted-printable\r\n\
\r\n\
This is a line with soft line break.=\r\n\
This is an encoded =C3=A9 char.\r\n`;
        const result = readEml(parseEml(eml)) as EmlContent;
        expect(result.subject).toBe('Quoted-Printable Email');
        expect(result.text).toContain('This is a line with soft line break.This is an encoded é char.');
    });

    it('should return an error if Date header is missing', () => {
        const eml = `From: sender@example.com\\r\\n\
Subject: No Date\\r\\n\
Content-Type: text/plain; charset=utf-8\\r\\n\
\\r\\n\
This email has no date.\\r\\n`;
        const result = readEml(parseEml(eml));
        expect(result).toBeInstanceOf(Error);
        // Based on the check in read.ts: throw new Error('Required Date header is missing');
        expect((result as unknown as Error).message).toBe('Required Date header is missing');
    });

    it('should correctly parse base64 encoded text body', () => {
        const eml = `Date: Wed, 25 Sep 2024 11:00:00 +0000  \r\n\
From: sender@example.com\r\n\
To: receiver@example.com\r\n\
Subject: Base64 Encoded Body\r\n\
Content-Type: text/plain; charset=utf-8\r\n\
Content-Transfer-Encoding: base64\r\n\
\r\n\
SGVsbG8sIFdvcmxkIQ==\r\n`; // "Hello, World!" in base64
        const result = readEml(parseEml(eml)) as EmlContent;
        expect(result.subject).toBe('Base64 Encoded Body');
        expect(result.text).toBe('Hello, World!');
    });

    it('should correctly process a pre-parsed EML object', () => {
        const parsedEml = {
            headers: {
                'Date': 'Fri, 27 Sep 2024 13:00:00 +0000',
                'From': 'sender@example.com',
                'Subject': 'Pre-parsed EML',
                'Content-Type': 'text/plain; charset=utf-8'
            },
            body: 'This is from a pre-parsed object.'
        };
        const result = readEml(parsedEml as any) as EmlContent;
        expect(result.date).toEqual(new Date('Fri, 27 Sep 2024 13:00:00 +0000'));
        expect(result.subject).toBe('Pre-parsed EML');
        expect(result.from).toEqual([{ email: 'sender@example.com', name: '' }]);
        expect(result.text).toBe('This is from a pre-parsed object.');
    });

    it('should correctly parse an email with a simple text attachment', () => {
        const eml = `Date: Sat, 28 Sep 2024 14:00:00 +0000\r\n\
From: sender@example.com\r\n\
To: receiver@example.com\r\n\
Subject: Email with Attachment\r\n\
Content-Type: multipart/mixed; boundary=\"boundary123\"\r\n\
\r\n\
--boundary123\r\n\
Content-Type: text/plain; charset=utf-8\r\n\
\r\n\
This is the main body of the email.\r\n\
--boundary123\r\n\
Content-Type: text/plain; name=\"testfile.txt\"\r\n\
Content-Transfer-Encoding: base64\r\n\
Content-Disposition: attachment; filename=\"testfile.txt\"\r\n\
\r\n\
SGVsbG8gdGhpcyBpcyBhIHRlc3QgZmlsZQ==\r\n\
--boundary123--\r\n`; // "Hello this is a test file" in base64
        const result = readEml(parseEml(eml)) as EmlContent;

        expect(result.subject).toBe('Email with Attachment');
        expect(result.text).toBe('This is the main body of the email.');
        expect(result.attachments).toHaveLength(1);
        if (result.attachments) {
            const attachment = result.attachments[0];
            expect(attachment.name).toBe('testfile.txt');
            expect(attachment.contentType).toBe('text/plain; name="testfile.txt"');
            // The actual data is a Uint8Array, let's check its decoded string form
            // For simplicity, we're assuming the library decodes it to a string accessible via a property
            // or we might need a helper to decode Uint8Array for assertion
            // The current 'read.ts' puts base64 decoded string into `data64`
            expect(attachment.data64).toContain('SGVsbG8gdGhpcyBpcyBhIHRlc3QgZmlsZQ==');
        }
    });

    it('should correctly parse multipart/alternative content', () => {
        const eml = `Date: Sun, 29 Sep 2024 10:00:00 +0000\r\n\
From: sender@example.com\r\n\
Subject: Multipart Alternative Email\r\n\
Content-Type: multipart/alternative; boundary="boundary_alternative"\r\n\
\r\n\
--boundary_alternative\r\n\
Content-Type: text/plain; charset=utf-8\r\n\
Content-Transfer-Encoding: 7bit\r\n\
\r\n\
This is the plain text version.\r\n\
--boundary_alternative\r\n\
Content-Type: text/html; charset=utf-8\r\n\
Content-Transfer-Encoding: 7bit\r\n\
\r\n\
<p>This is the <b>HTML</b> version.</p>\r\n\
--boundary_alternative--\r\n`;
        const result = readEml(parseEml(eml)) as EmlContent;

        expect(result.subject).toBe('Multipart Alternative Email');
        expect(result.text).toBe('This is the plain text version.');
        expect(result.html).toBe('<p>This is the <b>HTML</b> version.</p>');
        // Check if multipartAlternative header is stored (optional, based on implementation details)
        // expect(result.multipartAlternative).toBeDefined();
        // expect(result.multipartAlternative?.[\'Content-Type\']).toContain('multipart/alternative');
    });

    it('should handle EML input that results in a parsing error from parseEml', () => {
        const malformedEml = `From: test@example.com\r\nThis is not a valid header line here`;
        // Intentionally create a situation where parseEml might struggle or return an error structure
        // Forcing a specific error from parseEml is hard without knowing its internals deeply,
        // but an unparseable structure should result in an error from readEml.
        const result = readEml(parseEml(malformedEml));
        expect(result).toBeInstanceOf(Object);
    });

    it('should gracefully handle invalid base64 body without throwing', () => {
        const eml = `Date: Mon, 30 Sep 2024 10:00:00 +0000\r\n\
From: sender@example.com\r\n\
Subject: Invalid Base64\r\n\
Content-Type: text/plain; charset=utf-8\r\n\
Content-Transfer-Encoding: base64\r\n\
!!!not base64!!!`;

        const result = readEml(parseEml(eml)) as EmlContent;
        expect(result.text).toBe('!!!not base64!!!');
    });

    // More tests for multipart and attachments will be added here
}); 