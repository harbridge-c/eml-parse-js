//Word-wrap the string 's' to 'i' chars per row
export function wrap(s: string, i: number) {
    const a = [] as any[];
    do {
        a.push(s.substring(0, i));
    } while ((s = s.substring(i, s.length)) != '');
    return a.join('\r\n');
}

/**
 * adjust string Or Error
 * @param param
 */
export function isStringOrError(param: any) {
    return typeof param === 'string' || param instanceof Error;
}

