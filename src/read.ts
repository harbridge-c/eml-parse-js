import { decode } from "./charset";
import { encode } from "./charset";
import { Attachment, Options } from "./interface";

import { EmlHeaders } from "./interface";

import { EmlContent } from "./interface";

import { ParsedEml } from "./interface";
import { GB2312UTF8 } from "./utils/gbkutf";
import { getBoundary, getCharsetName } from "./utils/general";
import { getCharset } from "./charset";
import { DEFAULT_CHARSET } from "./constants";
import { Base64 } from "js-base64";
import { unquotePrintable, unquoteString } from "./header";
import { getEmailAddress } from "./header";
import { parse } from "./parse";

// Utility: basic validation for Base64 strings to avoid DOMExceptions when
// decoding malformed data.
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

function isValidBase64(value: string): boolean {
    if (!value) return false;
    const sanitized = value.replace(/\s+/g, "");
    return sanitized.length % 4 === 0 && BASE64_RE.test(sanitized);
}

function safeBase64Decode(value: string): string {
    if (!isValidBase64(value)) {
        return value;
    }
    try {
        return Base64.decode(value);
    } catch (err) {
        console.warn("Base64 decode failed", err);
        return value;
    }
}


export const read = (
    eml: ParsedEml,
    options?: Options,
): EmlContent => {

    //Appends the boundary to the result
    function _append(headers: EmlHeaders, content: string | Uint8Array | Attachment, result: EmlContent) {
        const contentType = headers['Content-Type'] || headers['Content-type'];
        const contentDisposition = headers['Content-Disposition'];

        const charset = getCharsetName(getCharset(contentType as string) || DEFAULT_CHARSET);
        let encoding = headers['Content-Transfer-Encoding'] || headers['Content-transfer-encoding'];
        if (typeof encoding === 'string') {
            encoding = encoding.toLowerCase();
        }
        if (encoding === 'base64') {
            if (contentType && contentType.indexOf('gbk') >= 0) {
                // is work?  I'm not sure
                content = encode(GB2312UTF8((content as string).replace(/\r?\n/g, '')));
            } else {
                // string to Uint8Array by TextEncoder
                content = encode((content as string).replace(/\r?\n/g, ''));
            }
        } else if (encoding === 'quoted-printable') {
            content = unquotePrintable(content as string, charset);
        } else if (encoding && charset !== 'utf8' && encoding.search(/binary|8bit/) === 0) {
            //'8bit', 'binary', '8bitmime', 'binarymime'
            content = decode(content as Uint8Array, charset);
        }

        if (!contentDisposition && contentType && contentType.indexOf('text/html') >= 0) {
            if (typeof content !== 'string') {
                content = decode(content as Uint8Array, charset);
            }

            let htmlContent = content.replace(/\r\n|(&quot;)/g, '');

            try {
                if (encoding === 'base64') {
                    htmlContent = safeBase64Decode(htmlContent);
                } else {
                    const decoded = safeBase64Decode(htmlContent);
                    if (decoded !== htmlContent && Base64.btoa(decoded) === htmlContent.replace(/\s+/g, '')) {
                        htmlContent = decoded;
                    }
                }
            } catch (error) {
                console.error(error);
            }


            if (result.html) {
                result.html += htmlContent;
            } else {
                result.html = htmlContent;
            }

            result.htmlheaders = {
                'Content-Type': contentType,
                'Content-Transfer-Encoding': encoding || '',
            };
            // self boundary Not used at conversion
        } else if (!contentDisposition && contentType && contentType.indexOf('text/plain') >= 0) {
            if (typeof content !== 'string') {
                content = decode(content as Uint8Array, charset);
            }
            //Plain text message
            content = safeBase64Decode(content);

            if (result.text) {
                result.text += content;
            } else {
                result.text = content;
            }

            result.textheaders = {
                'Content-Type': contentType,
                'Content-Transfer-Encoding': encoding || '',
            };
            // self boundary Not used at conversion
        } else {
            //Get the attachment
            if (!result.attachments) {
                result.attachments = [];
            }

            const attachment = {} as Attachment;

            const id = headers['Content-ID'] || headers['Content-Id'];
            if (id) {
                attachment.id = id;
            }

            const NameContainer = ['Content-Disposition', 'Content-Type', 'Content-type'];

            let result_name;
            for (const key of NameContainer) {
                const name: string = headers[key];
                if (name) {
                    result_name = name
                        .replace(/(\s|'|utf-8|\*[0-9]\*)/g, '')
                        .split(';')
                        .map((v) => /name[\*]?="?(.+?)"?$/gi.exec(v))
                        .reduce((a, b) => {
                            if (b && b[1]) {
                                a += b[1];
                            }
                            return a;
                        }, '');
                    if (result_name) {
                        break;
                    }
                }
            }
            if (result_name) {
                attachment.name = decodeURI(result_name);
            }

            const ct = headers['Content-Type'] || headers['Content-type'];
            if (ct) {
                attachment.contentType = ct;
            }

            const cd = headers['Content-Disposition'];
            if (cd) {
                attachment.inline = /^\s*inline/g.test(cd);
            }

            attachment.data = content as Uint8Array;
            attachment.data64 = decode(content as Uint8Array, charset);
            result.attachments.push(attachment);
        }
    }

    function _read(data: ParsedEml): EmlContent {
        if (!data) {
            throw new Error("No data provided");
        }
        try {
            const result = {} as EmlContent;
            if (!data.headers) {
                throw new Error("data does't has headers");
            }

            if (data.headers['Date']) {
                result.date = new Date(data.headers['Date']);
            } else {
                throw new Error('Required Date header is missing');
            }

            if (data.headers['Subject']) {
                result.subject = unquoteString(data.headers['Subject']);
            }
            if (data.headers['From']) {
                result.from = getEmailAddress(data.headers['From']);
            }
            if (data.headers['To']) {
                result.to = getEmailAddress(data.headers['To']);
            }
            if (data.headers['CC']) {
                result.cc = getEmailAddress(data.headers['CC']);
            }
            if (data.headers['Cc']) {
                result.cc = getEmailAddress(data.headers['Cc']);
            }
            result.headers = data.headers;

            //Content mime type
            let boundary: any = null;
            const ct = data.headers['Content-Type'] || data.headers['Content-type'];
            if (ct && /^multipart\//g.test(ct)) {
                const b = getBoundary(ct);
                if (b && b.length) {
                    boundary = b;
                }
            }

            if (boundary && Array.isArray(data.body)) {
                for (let i = 0; i < data.body.length; i++) {
                    const boundaryBlock = data.body[i];
                    if (!boundaryBlock) {
                        continue;
                    }
                    //Get the message content
                    if (typeof boundaryBlock.part === 'undefined') {
                        console.warn('Warning: undefined b.part');
                    } else if (typeof boundaryBlock.part === 'string') {
                        result.data = boundaryBlock.part;
                    } else {
                        if (typeof boundaryBlock.part.body === 'undefined') {
                            console.warn('Warning: undefined b.part.body');
                        } else if (typeof boundaryBlock.part.body === 'string') {
                            _append(boundaryBlock.part.headers, boundaryBlock.part.body, result);
                        } else {
                            // keep multipart/alternative
                            const currentHeaders = boundaryBlock.part.headers;
                            const currentHeadersContentType = currentHeaders['Content-Type'] || currentHeaders['Content-type'];
                            // Hasmore ?
                            if (currentHeadersContentType && currentHeadersContentType.indexOf('multipart') >= 0 && !result.multipartAlternative) {
                                result.multipartAlternative = {
                                    'Content-Type': currentHeadersContentType,
                                };
                            }
                            for (let j = 0; j < boundaryBlock.part.body.length; j++) {
                                const selfBoundary = boundaryBlock.part.body[j];
                                if (typeof selfBoundary === 'string') {
                                    result.data = selfBoundary;
                                    continue;
                                }

                                const headers = selfBoundary.part.headers;
                                const content = selfBoundary.part.body;
                                if (Array.isArray(content)) {
                                    (content as any).forEach((bound: any) => {
                                        _append(bound.part.headers, bound.part.body, result);
                                    });
                                } else {
                                    _append(headers, content, result);
                                }
                            }
                        }
                    }
                }
            } else if (typeof data.body === 'string') {
                _append(data.headers, data.body, result);
            }
            return result;
        } catch (e) {
            return e as any;
        }
    }

    const readResult = _read(eml);
    const result = readResult;
    return result;
}