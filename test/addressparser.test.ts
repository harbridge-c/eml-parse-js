import { addressparser, Tokenizer } from '../src/addressparser';

describe('addressparser', () => {
    it('should parse a simple address with name', () => {
        const result = addressparser('"User" <user@example.com>');
        expect(result).toEqual([
            { name: 'User', address: 'user@example.com' },
        ]);
    });

    it('should parse multiple addresses', () => {
        const str = 'one@example.com, "Two" <two@example.com>';
        const result = addressparser(str);
        expect(result).toEqual([
            { name: '', address: 'one@example.com' },
            { name: 'Two', address: 'two@example.com' },
        ]);
    });

    it('should parse address groups', () => {
        const str = 'Group: Alice <a@example.com>, Bob <b@example.com>;';
        const result = addressparser(str);
        expect(result).toEqual([
            {
                name: 'Group',
                group: [
                    { name: 'Alice', address: 'a@example.com' },
                    { name: 'Bob', address: 'b@example.com' },
                ],
            },
        ]);
    });

    it('should flatten groups when option flatten is true', () => {
        const str = 'Team: a@example.com, Bob <b@example.com>;';
        const result = addressparser(str, { flatten: true });
        expect(result).toEqual([
            { name: '', address: 'a@example.com' },
            { name: 'Bob', address: 'b@example.com' },
        ]);
    });
});


describe('Tokenizer', () => {
    it('should tokenize basic address string', () => {
        const tokenizer = new Tokenizer('Name <test@example.com>');
        const tokens = tokenizer.tokenize();
        const values = tokens.map(t => t.value);
        expect(values).toEqual(['Name', '<', 'test@example.com', '>']);
    });
});
