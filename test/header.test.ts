import { EmailAddress } from '../src/interface';
import { toEmailAddress, getEmailAddress, unquoteString, unquotePrintable } from '../src/header';
import { getCharset } from '../src/charset';

// Note: getCharset is currently not exported from ../src/index,
// you might need to adjust its import from ../src/charset or export it from ../src/index.

describe('toEmailAddress', () => {
    it('should convert a simple email object to string', () => {
        expect(toEmailAddress({ name: 'Test User', email: 'test@example.com' } as EmailAddress)).toBe('"Test User" <test@example.com>');
    });

    it('should convert an email string to string', () => {
        expect(toEmailAddress('test@example.com')).toBe('test@example.com');
    });

    it('should handle an array of email objects', () => {
        const emails: EmailAddress[] = [
            { name: 'User One', email: 'one@example.com' },
            { name: 'User Two', email: 'two@example.com' },
        ];
        expect(toEmailAddress(emails)).toBe('"User One" <one@example.com>, "User Two" <two@example.com>');
    });

    it('should return empty string for undefined input', () => {
        expect(toEmailAddress(undefined)).toBe('');
    });

    it('should handle object with only email', () => {
        expect(toEmailAddress({ email: 'test@example.com' } as EmailAddress)).toBe('<test@example.com>');
    });

    it('should handle object with only name', () => {
        expect(toEmailAddress({ name: 'Test User' } as EmailAddress)).toBe('"Test User" ');
    });

    it('should handle an empty email object', () => {
        expect(toEmailAddress({} as EmailAddress)).toBe('');
    });

    it('should handle an array with one empty email object', () => {
        expect(toEmailAddress([{}] as EmailAddress[])).toBe('');
    });

    it('should handle an array of mixed valid and empty/partial email objects', () => {
        const emails: EmailAddress[] = [
            { name: 'User One', email: 'one@example.com' },
            { name: 'User Two' } as EmailAddress, // only name
            { email: 'three@example.com' } as EmailAddress, // only email
            {} as EmailAddress, // empty
            { name: 'User Four', email: 'four@example.com' },
        ];
        expect(toEmailAddress(emails)).toBe('"User One" <one@example.com>, "User Two" , <three@example.com>, "User Four" <four@example.com>');
    });
});

describe('getCharset', () => {
    it('should extract charset from contentType string', () => {
        expect(getCharset('text/plain; charset=utf-8')).toBe('utf-8');
    });

    it('should return undefined if charset is not present', () => {
        expect(getCharset('application/json')).toBeUndefined();
    });
});

describe('getEmailAddress', () => {
    it('should parse a simple email string', () => {
        expect(getEmailAddress('"Test User" <test@example.com>')).toEqual([{ name: 'Test User', email: 'test@example.com' }]);
    });

    it('should parse an email string with no name', () => {
        expect(getEmailAddress('<test@example.com>')).toEqual([{ name: '', email: 'test@example.com' }]);
    });
    it('should parse an email string that is just an email', () => {
        expect(getEmailAddress('test@example.com')).toEqual([{ name: '', email: 'test@example.com' }]);
    });

    it('should parse multiple email addresses', () => {
        expect(getEmailAddress('one@example.com, "User Two" <two@example.com>')).toEqual([
            { name: '', email: 'one@example.com' },
            { name: 'User Two', email: 'two@example.com' },
        ]);
    });

    it('should return null for an empty string', () => {
        expect(getEmailAddress('')).toEqual([]);
    });
});

describe('unquoteString', () => {
    it('should decode a Q-encoded string with UTF-8 charset', () => {
        expect(unquoteString('=?UTF-8?Q?Hello_World?=')).toBe('Hello World');
    });

    it('should decode a B-encoded string with UTF-8 charset', () => {
        expect(unquoteString('=?UTF-8?B?SGVsbG8gV29ybGQ=?=')).toBe('Hello World'); // "Hello World" in Base64
    });

    it('should decode a Q-encoded string with iso-8859-1 charset', () => {
        // M=FCnchen -> München (ü)
        expect(unquoteString('=?iso-8859-1?Q?M=FCnchen?=')).toBe('München');
    });

    it('should handle multiple adjacent Q-encoded parts', () => {
        expect(unquoteString('=?UTF-8?Q?First_Part?= =?UTF-8?Q?_Second_Part?=')).toBe('First Part  Second Part');
    });

    it('should handle multiple B-encoded parts separated by space', () => {
        // "Hello" -> SGVsbG8=  "World" -> V29ybGQ=
        expect(unquoteString('=?UTF-8?B?SGVsbG8=?= =?UTF-8?B?V29ybGQ=?=')).toBe('Hello World');
    });

    it('should return the original string if no encoding is present', () => {
        expect(unquoteString('Hello World')).toBe('Hello World');
    });

    it('should handle strings with mixed encoded and unencoded parts', () => {
        expect(unquoteString('Prefix =?UTF-8?Q?Encoded_Text?= Suffix')).toBe('Prefix Encoded Text Suffix');
    });

    it('should handle malformed encoded parts (e.g., missing ?=) gracefully', () => {
        // If malformed, it might return the original string or parts of it decoded
        expect(unquoteString('=?UTF-8?Q?Missing_End_Mark')).toBe('=?UTF-8?Q?Missing_End_Mark'); // Current behavior seems to be returning original if it cannot parse
        expect(unquoteString('Valid =?UTF-8?Q?Part?= Malformed =?UTF-8?B?SGVsbG8')).toBe('Valid Part Malformed =?UTF-8?B?SGVsbG8');
    });

    it('should decode Q-encoded strings with special characters (e.g. equals sign)', () => {
        // =?UTF-8?Q?=3DHello_World=3D?=  should decode to =Hello World=
        expect(unquoteString('=?UTF-8?Q?=3DHello_World=3D?=')).toBe('=Hello World=');
    });

    it('should handle RFC2047 example: ordinary text', () => {
        expect(unquoteString('From: =?US-ASCII?Q?Keith_Moore?= <moore@cs.utk.edu>')).toBe('From: Keith Moore <moore@cs.utk.edu>')
    });

    it('should handle RFC2047 example: two encoded words', () => {
        expect(unquoteString('To: =?ISO-8859-1?Q?Keld_J=F8rn_Simonsen?= <keld@dkuug.dk>')).toBe('To: Keld Jørn Simonsen <keld@dkuug.dk>')
    });
});

describe('unquotePrintable', () => {
    it('should decode a simple quoted-printable string', () => {
        expect(unquotePrintable('Hello=20World')).toBe('Hello World');
    });

    it('should handle qEncoding where underscores are spaces', () => {
        expect(unquotePrintable('Hello_World', 'utf-8', true)).toBe('Hello World');
    });

    it('should not replace underscores if qEncoding is false', () => {
        expect(unquotePrintable('Hello_World', 'utf-8', false)).toBe('Hello_World');
    });

    it('should remove soft line breaks (ending with =)', () => {
        expect(unquotePrintable('This_is_a_long_line_that_=\ncontinues_on_the_next_line', 'utf-8', true)).toBe('This is a long line that continues on the next line');
    });

    it('should remove trailing whitespace from lines', () => {
        expect(unquotePrintable('Line with trailing space   ')).toBe('Line with trailing space');
    });

    it('should decode a string with hex escape sequences', () => {
        expect(unquotePrintable('Test=20=C3=A9=C3=A8=C3=AC=C3=B2=C3=B9')).toBe('Test éèìòù');
    });

    it('should handle strings with = followed by newline', () => {
        expect(unquotePrintable('long line with soft break=\nend')).toBe('long line with soft breakend');
    });
}); 