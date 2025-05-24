import { guid } from "../../src/utils/guid";

describe('guid', () => {
    it('should generate a string of the correct format', () => {
        const id = guid();
        // Matches the pattern xxxxxxxxxxxx-4xxx-yxxx-xxxxxxxxxxxx (before replace)
        // Then, it replaces '-' resulting in a 32 char string
        expect(id).toMatch(/^[a-f0-9]{16}-[a-f0-9]{4}-[a-f0-9]{12}$/);
    });

    it('should generate unique ids', () => {
        const id1 = guid();
        const id2 = guid();
        expect(id1).not.toBe(id2);
    });
});
