import { Base64 } from "js-base64";
import { addressparser } from "./addressparser";
import { decode, encode } from "./charset";
import { getCharsetName, mimeDecode } from "./utils/general";
import { DEFAULT_CHARSET } from "./constants";
import { EmailAddress } from "./interface";

/**
 * Builds e-mail address string, e.g. { name: 'PayPal', email: 'noreply@paypal.com' } => 'PayPal' <noreply@paypal.com>
 * @param {String|EmailAddress|EmailAddress[]|null} data
 */
export const toEmailAddress = (data?: string | EmailAddress | EmailAddress[] | null): string => {
    let email = '';
    if (typeof data === 'undefined') {
        //No e-mail address
    } else if (typeof data === 'string') {
        email = data;
    } else if (typeof data === 'object') {
        if (Array.isArray(data)) {
            email += data
                .map((item) => {
                    let str = '';
                    if (item.name) {
                        str += '"' + item.name.replace(/^"|"\s*$/g, '') + '" ';
                    }
                    if (item.email) {
                        str += '<' + item.email + '>';
                    }
                    return str;
                })
                .filter((a) => a)
                .join(', ');
        } else {
            if (data) {
                if (data.name) {
                    email += '"' + data.name.replace(/^"|"\s*$/g, '') + '" ';
                }
                if (data.email) {
                    email += '<' + data.email + '>';
                }
            }
        }
    }
    return email;
}

/**
 * decode one joint
 * @param {String} str
 * @returns {String}
 */
export const decodeJoint = (str: string) => {
    const match = /=\?([^?]+)\?(B|Q)\?([^?]+)\?=/gi.exec(str);
    if (match) {
        const charset = getCharsetName(match[1] || DEFAULT_CHARSET); //eq. match[1] = 'iso-8859-2'; charset = 'iso88592'
        const type = match[2].toUpperCase();
        const value = match[3];
        if (type === 'B') {
            //Base64
            if (charset === 'utf8') {
                return decode(encode(Base64.fromBase64(value.replace(/\r?\n/g, ''))), 'utf8');
            } else {
                return decode(Base64.toUint8Array(value.replace(/\r?\n/g, '')), charset);
            }
        } else if (type === 'Q') {
            //Quoted printable
            return unquotePrintable(value, charset, true);
        }
    }
    return str;
}

/**
 * Decodes 'quoted-printable'
 * @param {String} value
 * @param {String} charset
 * @param {String} qEncoding whether the encoding is RFC-2047's Q-encoding, meaning special handling of underscores.
 * @returns {String}
 */
export const unquotePrintable = (value: string, charset?: string, qEncoding = false): string => {
    let rawString = value
        .replace(/[ \t]+$/gm, '') // remove whitespace from the end of lines
        .replace(/=(?:\r?\n|$)/g, ''); // remove soft line breaks

    if (qEncoding) {
        rawString = rawString.replace(/_/g, decode(new Uint8Array([0x20]), charset));
    }

    return mimeDecode(rawString, charset);
}


/**
 * decode section
 * @param {String} str
 * @returns {String}
 */
export const unquoteString = (str: string): string => {
    const regex = /=\?([^?]+)\?(B|Q)\?([^?]+)\?=/gi;
    let decodedString = str || '';
    const spinOffMatch = decodedString.match(regex);
    if (spinOffMatch) {
        spinOffMatch.forEach((spin) => {
            decodedString = decodedString.replace(spin, decodeJoint(spin));
        });
    }

    return decodedString.replace(/\r?\n/g, '');
}


/**
 * Gets name and e-mail address from a string, e.g. 'PayPal' <noreply@paypal.com> => { name: 'PayPal', email: 'noreply@paypal.com' }
 * @param {String} raw
 * @returns {EmailAddress[]}
 */
export const getEmailAddress = (rawStr: string): EmailAddress[] => {
    const addresses: EmailAddress[] = [];
    const raw = unquoteString(rawStr);
    const parseList = addressparser(raw);
    for (const v of parseList) {
        addresses.push({ name: v.name, email: v.address } as EmailAddress);
    }
    return addresses; //Multiple e-mail addresses as array
}
