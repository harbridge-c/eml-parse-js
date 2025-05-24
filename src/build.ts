import { toEmailAddress } from "./header";
import { BoundaryConvertedData, BoundaryRawData, EmlContent } from "./interface";

import { BuildOptions } from "./interface";
import { guid } from "./utils/guid";

import { read } from "./read";
import { getBoundary } from "./utils/general";
import { Base64 } from "js-base64";
import { wrap } from "./utils/string";
import { decode } from "./charset";

/**
 * create a boundary
 */
export const createBoundary = (): string => {
	return '----=' + guid();
}

/**
 * Convert BoundaryRawData to BoundaryConvertedData
 * @param {BoundaryRawData} boundary
 * @returns {BoundaryConvertedData} Obj
 */
export const completeBoundary = (boundary: BoundaryRawData): BoundaryConvertedData | null => {
	if (!boundary || !boundary.boundary) {
		return null;
	}
	const lines = boundary.lines || [];
	const result = {
		boundary: boundary.boundary,
		part: {
			headers: {},
		},
	} as BoundaryConvertedData;
	let lastHeaderName = '';
	let insideBody = false;
	let childBoundary: BoundaryRawData | undefined;
	for (let index = 0; index < lines.length; index++) {
		const line = lines[index];
		if (!insideBody) {
			if (line === '') {
				insideBody = true;
				continue;
			}
			const match = /^([\w\d\-]+):\s*([^\r\n]*)/gi.exec(line);
			if (match) {
				lastHeaderName = match[1];
				result.part.headers[lastHeaderName] = match[2];
				continue;
			}
			//Header value with new line
			const lineMatch = /^\s+([^\r\n]+)/g.exec(line);
			if (lineMatch) {
				result.part.headers[lastHeaderName] += '\r\n' + lineMatch[1];
				continue;
			}
		} else {
			// part.body
			const match = /^\-\-([^\r\n]+)(\r?\n)?$/g.exec(line);
			const childBoundaryStr = getBoundary(result.part.headers['Content-Type'] || result.part.headers['Content-type']);
			if (match) {
				console.log(`line 568: line is ${line}, ${'--' + childBoundaryStr}`, `${line.indexOf('--' + childBoundaryStr)}`);
			}
			if (match && line.indexOf('--' + childBoundaryStr) === 0 && !childBoundary) {
				childBoundary = { boundary: match ? match[1] : '', lines: [] };
				continue;
			} else if (!!childBoundary && childBoundary.boundary) {
				if (lines[index - 1] === '' && line.indexOf('--' + childBoundary.boundary) === 0) {
					const child = completeBoundary(childBoundary);
					if (child) {
						if (Array.isArray(result.part.body)) {
							result.part.body.push(child);
						} else {
							result.part.body = [child];
						}
					} else {
						result.part.body = childBoundary.lines.join('\r\n');
					}
					// next line child
					if (!!lines[index + 1]) {
						childBoundary.lines = [];
						continue;
					}
					// end line child And this boundary's end
					if (line.indexOf('--' + childBoundary.boundary + '--') === 0 && lines[index + 1] === '') {
						childBoundary = undefined;
						break;
					}
				}
				childBoundary.lines.push(line);
			} else {
				result.part.body = lines.splice(index).join('\r\n');
				break;
			}
		}
	}
	return result;
}

export const build = (
	data: EmlContent,
	options?: BuildOptions,
): string => {
	let error: Error | string | undefined;
	let eml = '';
	const EOL = '\r\n'; //End-of-line

	try {
		if (!data) {
			throw new Error('Argument "data" expected to be non-null');
		}

		if (!data.headers) {
			throw new Error('Argument "data" expected to be has headers');
		}

		if (typeof data.subject === 'string') {
			data.headers['Subject'] = data.subject;
		}

		if (typeof data.from !== 'undefined') {
			data.headers['From'] = toEmailAddress(data.from);
		}

		if (typeof data.to !== 'undefined') {
			data.headers['To'] = toEmailAddress(data.to);
		}

		if (typeof data.cc !== 'undefined') {
			data.headers['Cc'] = toEmailAddress(data.cc);
		}

		// if (!data.headers['To']) {
		//   throw new Error('Missing "To" e-mail address!');
		// }

		const emlBoundary = getBoundary(data.headers['Content-Type'] || data.headers['Content-type'] || '');
		let hasBoundary = false;
		let boundary = createBoundary();
		let multipartBoundary = '';
		if (data.multipartAlternative) {
			multipartBoundary = '' + (getBoundary(data.multipartAlternative['Content-Type']) || '');
			hasBoundary = true;
		}
		if (emlBoundary) {
			boundary = emlBoundary;
			hasBoundary = true;
		} else {
			data.headers['Content-Type'] = data.headers['Content-type'] || 'multipart/mixed;' + EOL + 'boundary="' + boundary + '"';
			// Restrained
			// hasBoundary = true;
		}

		//Build headers
		const keys = Object.keys(data.headers);
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			const value: string | string[] = data.headers[key];
			if (typeof value === 'undefined') {
				continue; //Skip missing headers
			} else if (typeof value === 'string') {
				eml += key + ': ' + value.replace(/\r?\n/g, EOL + '  ') + EOL;
			} else {
				//Array
				for (let j = 0; j < value.length; j++) {
					eml += key + ': ' + value[j].replace(/\r?\n/g, EOL + '  ') + EOL;
				}
			}
		}

		if (data.multipartAlternative) {
			eml += EOL;
			eml += '--' + emlBoundary + EOL;
			eml += 'Content-Type: ' + data.multipartAlternative['Content-Type'].replace(/\r?\n/g, EOL + '  ') + EOL;
		}

		//Start the body
		eml += EOL;

		//Plain text content
		if (data.text) {
			// Encode opened and self headers keeped
			if (typeof options === 'object' && !!options && options.encode && data.textheaders) {
				eml += '--' + boundary + EOL;
				for (const key in data.textheaders) {
					if (data.textheaders.hasOwnProperty(key)) {
						eml += `${key}: ${data.textheaders[key].replace(/\r?\n/g, EOL + '  ')}`;
					}
				}
			} else if (hasBoundary) {
				// else Assembly
				eml += '--' + (multipartBoundary ? multipartBoundary : boundary) + EOL;
				eml += 'Content-Type: text/plain; charset="utf-8"' + EOL;
			}
			eml += EOL + data.text;
			eml += EOL;
		}

		//HTML content
		if (data.html) {
			// Encode opened and self headers keeped
			if (typeof options === 'object' && !!options && options.encode && data.textheaders) {
				eml += '--' + boundary + EOL;
				for (const key in data.textheaders) {
					if (data.textheaders.hasOwnProperty(key)) {
						eml += `${key}: ${data.textheaders[key].replace(/\r?\n/g, EOL + '  ')}`;
					}
				}
			} else if (hasBoundary) {
				eml += '--' + (multipartBoundary ? multipartBoundary : boundary) + EOL;
				eml += 'Content-Type: text/html; charset="utf-8"' + EOL;
			}
			eml += EOL + data.html;
			eml += EOL;
		}

		//Append attachments
		if (data.attachments) {
			for (let i = 0; i < data.attachments.length; i++) {
				const attachment = data.attachments[i];
				eml += '--' + boundary + EOL;
				eml += 'Content-Type: ' + (attachment.contentType.replace(/\r?\n/g, EOL + '  ') || 'application/octet-stream') + EOL;
				eml += 'Content-Transfer-Encoding: base64' + EOL;
				eml +=
					'Content-Disposition: ' +
					(attachment.inline ? 'inline' : 'attachment') +
					'; filename="' +
					(attachment.filename || attachment.name || 'attachment_' + (i + 1)) +
					'"' +
					EOL;
				if (attachment.cid) {
					eml += 'Content-ID: <' + attachment.cid + '>' + EOL;
				}
				eml += EOL;
				if (typeof attachment.data === 'string') {
					const content = Base64.toBase64(attachment.data);
					eml += wrap(content, 72) + EOL;
				} else {
					//Buffer
					// Uint8Array to string by new TextEncoder
					const content = decode(attachment.data);
					eml += wrap(content, 72) + EOL;
				}
				eml += EOL;
			}
		}

		//Finish the boundary
		if (hasBoundary) {
			eml += '--' + boundary + '--' + EOL;
		}
	} catch (e) {
		const error = new Error("Error building EML");
		(error as any).cause = e;
		throw error;
	}
	return eml;
}
