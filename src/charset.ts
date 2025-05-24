import { TextDecoder, TextEncoder } from '@sinonjs/text-encoding';

/**
 * Gets character set name, e.g. contentType='.....charset='iso-8859-2'....'
 * @param {String} contentType
 * @returns {String|undefined}
 */
export const getCharset = (contentType: string) => {
	const match = /charset\s*=\W*([\w\-]+)/g.exec(contentType);
	return match ? match[1] : undefined;
}

/**
 * Encodes an unicode string into an Uint8Array object as UTF-8
 *
 * @param {String} str String to be encoded
 * @return {Uint8Array} UTF-8 encoded typed array
 */
export const encode = (str: string, fromCharset = 'utf-8'): Uint8Array => new TextEncoder(fromCharset).encode(str);

export const arr2str = (arr: Uint8Array) => {
	const CHUNK_SZ = 0x8000;
	const strs = [] as any[];

	for (let i = 0; i < arr.length; i += CHUNK_SZ) {
		strs.push(String.fromCharCode.apply(null, arr.subarray(i, i + CHUNK_SZ) as any));
	}

	return strs.join('');
};

/**
 * Decodes a string from Uint8Array to an unicode string using specified encoding
 *
 * @param {Uint8Array} buf Binary data to be decoded
 * @param {String} Binary data is decoded into string using this charset
 * @return {String} Decoded string
 */
export function decode(buf: Uint8Array, fromCharset = 'utf-8'): string {
	const normalizedFromCharset = normalizeCharset(fromCharset);
	const attempts: { charset: string, fatal: boolean }[] = [];

	// Attempt 1: The specified charset.
	// For 'iso-8859-15', try with fatal:true first, as it might be more reliable or error correctly.
	// Fallback to fatal:false if fatal:true throws.
	if (normalizedFromCharset === 'iso-8859-15') {
		attempts.push({ charset: normalizedFromCharset, fatal: true });
		attempts.push({ charset: normalizedFromCharset, fatal: false });
	} else {
		// For other charsets, the original behavior was fatal:false first.
		attempts.push({ charset: normalizedFromCharset, fatal: false });
	}

	// Attempt 2: UTF-8 (common, try with fatal:true to ensure validity if it's not the primary)
	if (normalizedFromCharset !== 'utf-8') {
		attempts.push({ charset: 'utf-8', fatal: true });
	}

	// Attempt 3: ISO-8859-15 as a general fallback, if it wasn't the primary charset.
	if (normalizedFromCharset !== 'iso-8859-15') {
		attempts.push({ charset: 'iso-8859-15', fatal: false });
	}

	for (const { charset, fatal } of attempts) {
		try {
			return new TextDecoder(charset, { fatal }).decode(buf);
		} catch (e) {
			// Optional: console.warn(`Decoding with ${charset} (fatal: ${fatal}) failed`);
		}
	}

	return arr2str(buf); // all else fails, treat it as binary
}

/**
 * Convert a string from specific encoding to UTF-8 Uint8Array
 *
 * @param {String|Uint8Array} data Data to be encoded
 * @param {String} Source encoding for the string (optional for data of type String)
 * @return {Uint8Array} UTF-8 encoded typed array
 */
export const convert = (data: string | Uint8Array, fromCharset?: string | undefined): Uint8Array =>
	typeof data === 'string' ? encode(data) : encode(decode(data, fromCharset));

export function normalizeCharset(charset = 'utf-8') {
	let match;

	if ((match = charset.match(/^utf[-_]?(\d+)$/i))) {
		return 'UTF-' + match[1];
	}

	if ((match = charset.match(/^win[-_]?(\d+)$/i))) {
		return 'WINDOWS-' + match[1];
	}

	if ((match = charset.match(/^latin[-_]?(\d+)$/i))) {
		return 'ISO-8859-' + match[1];
	}

	return charset;
}
