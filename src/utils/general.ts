import { decode } from '../charset';

/**
 * Gets the boundary name
 * @param contentType - string
 */
export function getBoundary(contentType: string) {
    const match = /(?:B|b)oundary=(?:\s*(?:'|")(.*?)(?:'|")|([^;\s\r\n"']{1,70}))(?:\s*;.*)?$/.exec(contentType);
    return match ? (match[1] || match[2]) : undefined;
}
//Gets the character encoding name for iconv, e.g. 'iso-8859-2' -> 'iso88592'
export function getCharsetName(charset: string) {
    return charset.toLowerCase().replace(/[^0-9a-z]/g, '');
}


/**
 * Decodes mime encoded string to an unicode string
 *
 * @param {String} str Mime encoded string
 * @param {String} [fromCharset='UTF-8'] Source encoding
 * @return {String} Decoded unicode string
 */
export function mimeDecode(str = '', fromCharset = 'UTF-8') {
    const encodedBytesCount = (str.match(/=[\da-fA-F]{2}/g) || []).length;
    let buffer = new Uint8Array(str.length - encodedBytesCount * 2);

    for (let i = 0, len = str.length, bufferPos = 0; i < len; i++) {
        let hex = str.substr(i + 1, 2);
        const chr = str.charAt(i);
        if (chr === '=' && hex && /[\da-fA-F]{2}/.test(hex)) {
            buffer[bufferPos++] = parseInt(hex, 16);
            i += 2;
        } else {
            buffer[bufferPos++] = chr.charCodeAt(0);
        }
    }

    return decode(buffer, fromCharset);
}
