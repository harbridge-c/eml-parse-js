import { Options, ParsedEml } from "./interface";
import { getBoundary } from "./utils/general";

export const parse = (
    eml: string,
    options?: Options,
): ParsedEml => {
    try {
        if (typeof eml !== 'string') {
            throw new Error('Argument "eml" expected to be string!');
        }

        const lines = eml.split(/\r?\n/);
        const result = parseRecursive(lines, 0, {} as ParsedEml, options as Options) as ParsedEml;
        return result;
    } catch (e) {
        const error = new Error("Error parsing EML data");
        (error as any).cause = e;
        throw error;
    }
}

/**
 * Parses EML file content.
 * @param {String[]} lines
 * @param {Number}   start
 * @param {Options}  options
 * @returns {ParsedEmlJson}
 */
const parseRecursive = (lines: string[], start: number, parent: any, options: Options) => {
    let boundary: any = null;
    let lastHeaderName = '';
    let findBoundary = '';
    let insideBody = false;
    let insideBoundary = false;
    let isMultiHeader = false;
    let isMultipart = false;
    let checkedForCt = false;
    let ctInBody = false;

    parent.headers = {};
    //parent.body = null;

    function complete(boundary: any) {
        //boundary.part = boundary.lines.join("\r\n");
        boundary.part = {};
        parseRecursive(boundary.lines, 0, boundary.part, options);
        delete boundary.lines;
    }

    //Read line by line
    for (let i = start; i < lines.length; i++) {
        let line = lines[i];

        //Header
        if (!insideBody) {
            //Search for empty line
            if (line == '') {
                insideBody = true;

                if (options && options.headersOnly) {
                    break;
                }

                //Expected boundary
                let ct = parent.headers['Content-Type'] || parent.headers['Content-type'];
                if (!ct) {
                    if (checkedForCt) {
                        insideBody = !ctInBody;
                    } else {
                        checkedForCt = true;
                        const lineClone = Array.from(lines);
                        const string = lineClone.splice(i).join('\r\n');
                        const trimmedStrin = string.trim();
                        if (trimmedStrin.indexOf('Content-Type') === 0 || trimmedStrin.indexOf('Content-type') === 0) {
                            insideBody = false;
                            ctInBody = true;
                        } else {
                            console.warn('Warning: undefined Content-Type');
                        }
                    }
                } else if (/^multipart\//g.test(ct)) {
                    let b = getBoundary(ct);
                    if (b && b.length) {
                        findBoundary = b;
                        isMultipart = true;
                        parent.body = [];
                    } else {
                        console.warn('Multipart without boundary! ' + ct.replace(/\r?\n/g, ' '));
                    }
                }

                continue;
            }

            //Header value with new line
            let match = /^\s+([^\r\n]+)/g.exec(line);
            if (match) {
                if (isMultiHeader) {
                    parent.headers[lastHeaderName][parent.headers[lastHeaderName].length - 1] += '\r\n' + match[1];
                } else {
                    parent.headers[lastHeaderName] += '\r\n' + match[1];
                }
                continue;
            }

            //Header name and value
            match = /^([\w\d\-]+):\s*([^\r\n]*)/gi.exec(line);
            if (match) {
                lastHeaderName = match[1];
                if (parent.headers[lastHeaderName]) {
                    //Multiple headers with the same name
                    isMultiHeader = true;
                    if (typeof parent.headers[lastHeaderName] == 'string') {
                        parent.headers[lastHeaderName] = [parent.headers[lastHeaderName]];
                    }
                    parent.headers[lastHeaderName].push(match[2]);
                } else {
                    //Header first appeared here
                    isMultiHeader = false;
                    parent.headers[lastHeaderName] = match[2];
                }
                continue;
            }
        }
        //Body
        else {
            //Multipart body
            if (isMultipart) {
                //Search for boundary start

                //Updated on 2019-10-12: A line before the boundary marker is not required to be an empty line
                //if (lines[i - 1] == "" && line.indexOf("--" + findBoundary) == 0 && !/\-\-(\r?\n)?$/g.test(line)) {
                if (line.indexOf('--' + findBoundary) == 0 && line.indexOf('--' + findBoundary + '--') !== 0) {
                    insideBoundary = true;

                    //Complete the previous boundary
                    if (boundary && boundary.lines) {
                        complete(boundary);
                    }

                    //Start a new boundary
                    let match = /^\-\-([^\r\n]+)(\r?\n)?$/g.exec(line) as RegExpExecArray;
                    boundary = { boundary: match[1], lines: [] as any[] };
                    parent.body.push(boundary);
                    continue;
                }

                if (insideBoundary) {
                    //Search for boundary end
                    if (boundary?.boundary && lines[i - 1] == '' && line.indexOf('--' + findBoundary + '--') == 0) {
                        insideBoundary = false;
                        complete(boundary);
                        continue;
                    }
                    if (boundary?.boundary && line.indexOf('--' + findBoundary + '--') == 0) {
                        continue;
                    }
                    boundary?.lines.push(line);
                }
            } else {
                //Solid string body
                parent.body = lines.splice(i).join('\r\n');
                break;
            }
        }
    }

    //Complete the last boundary
    if (parent.body && parent.body.length && parent.body[parent.body.length - 1].lines) {
        complete(parent.body[parent.body.length - 1]);
    }

    return parent;
}
