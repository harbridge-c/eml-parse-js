# eml-parse-js

[![Test Status][test-badge]][test-link]
[![NPM Version][npm-badge]][npm-link]
[![License][license-badge]][license-link]
[![Downloads][downloads-badge]][downloads-link]
[![Codecov][codecov-badge]][codecov-link]

`@vortiq/eml-parse-js` is a JavaScript library for parsing and building EML files, designed for use in browser environments. It provides tools to handle [RFC 822](https://www.w3.org/Protocols/rfc822/) compliant email formats.

## Getting Started

This section will guide you through the initial setup and basic usage of `@vortiq/eml-parse-js`. We'll cover installation and a simple example to get you parsing EML files quickly.


### Installation

To install `@vortiq/eml-parse-js` as a dependency in your project, you can use npm or yarn:

```bash
npm install @vortiq/eml-parse-js
```

or

```bash
yarn add @vortiq/eml-parse-js
```

### Basic Usage

Here's a quick example of how to parse an EML file string and access its content as a JavaScript object:

```javascript
import { parseEml, readEml } from '@vortiq/eml-parse-js';

const emlString = `Date: Wed, 01 Jan 2020 00:00:00 -0000
From: sender@example.com
To: receiver@example.com
Subject: Hello World

This is the email body.`;

try {
  const parsedEml = parseEml(emlString);
  const emailObject = readEml(parsedEml);
  console.log('Subject:', emailObject.subject);
  // Output: Subject: Hello World
  console.log('From Address:', emailObject.from && emailObject.from[0] ? emailObject.from[0].address : 'not found');
  // Output: From Address: sender@example.com
  console.log('To Address:', emailObject.to && emailObject.to[0] ? emailObject.to[0].address : 'not found');
  // Output: To Address: receiver@example.com
  console.log('Text Body:', emailObject.text);
  // Output: Text Body: This is the email body.
} catch (error) {
  console.error('Error processing EML:', error);
}
```

## API Usage

This library provides several functions for working with EML files. The primary ones are `parseEml`, `readEml`, and `buildEml`.

### `parseEml(eml: string, options?: Options): ParsedEml`

The `parseEml` function takes an EML file content as a string and parses it into a structured JavaScript object. This object, `ParsedEml`, contains the raw headers and body of the email, including all MIME parts.

-   **`eml`**: A string containing the EML file content.
-   **`options`** (optional): An object with parsing options. One common option is `headersOnly: true` to parse only the email headers.

The returned `ParsedEml` object provides a detailed, somewhat raw representation of the EML structure.

```javascript
import { parseEml } from '@vortiq/eml-parse-js';

const emlString = `Date: Thu, 02 Jan 2020 00:00:00 -0000
From: another.sender@example.com
To: another.receiver@example.com
Subject: Test Email for parseEml
Content-Type: text/plain

This is the body of the test email for parseEml.`;

try {
  const parsedEmail = parseEml(emlString);
  console.log('Raw Subject:', parsedEmail.headers && parsedEmail.headers.subject ? parsedEmail.headers.subject : 'not found');
  // Output: Raw Subject: Test Email for parseEml
  console.log('Raw Subject:', parsedEmail.headers && parsedEmail.headers.subject ? parsedEmail.headers.subject : 'not found');
  // Output: Raw Subject: Test Email for parseEml
  // parseEml provides the raw body, which might be a string or structured by MIME parts
  console.log('Raw Body:', parsedEmail.body);
  // Output: Raw Body: This is the body of the test email for parseEml.
  // Output: Raw Body: This is the body of the test email for parseEml.
} catch (error) {
  console.error('Failed to parse EML with parseEml:', error);
}
```

### `readEml(eml: ParsedEml, options?: Options): EmlContent`

The `readEml` function takes a `ParsedEml` object (the output from `parseEml`) and converts it into a more user-friendly `EmlContent` object. This object simplifies access to common email fields like subject, from, to, cc, date, text body, HTML body, and attachments.

-   **`eml`**: A `ParsedEml` object (obtained from `parseEml`).
-   **`options`**: Optional settings. Currently, only `headersOnly: boolean` is supported. If true, only headers are processed into the `EmlContent` (the body and attachments from `ParsedEml` are ignored).

The `EmlContent` object makes it easier to work with the email's content directly. For example, attachments are processed and their data is made available.

Here's an example of using `readEml`, including the `headersOnly` option:

```javascript
import { parseEml, readEml } from '@vortiq/eml-parse-js';

const emlSimpleForRead = `Date: Mon, 23 Oct 2023 10:00:00 -0700
From: "Sender Name" <sender.ops@example.com>
To: "Recipient Name" <receiver.ops@example.com>
Subject: Example for readEml
Content-Type: text/plain; charset="utf-8"

This is a simple text body for the readEml example.`;

try {
  const parsedVersion = parseEml(emlSimpleForRead);
  // Full processing with readEml
  const emailContent = readEml(parsedVersion);
  
  console.log('readEml Subject:', emailContent.subject);
  // Output: readEml Subject: Example for readEml
  console.log('readEml From:', emailContent.from && emailContent.from[0] ? emailContent.from[0].address : 'not found');
  // Output: readEml From: sender.ops@example.com
  console.log('readEml Text Body Preview:', emailContent.text ? emailContent.text.substring(0, 20) : 'not found');
  // Output: readEml Text Body Preview: This is a simple tex

  // Using headersOnly option with readEml
  // Note: parseEml also has a headersOnly option.
  // If you only need headers from the start, use parseEml's option.
  // readEml's headersOnly option is used if you have a full ParsedEml object
  // but only want to populate the EmlContent with header-derived information.
  const headersOnlyContent = readEml(parsedVersion, { headersOnly: true });
  console.log('readEml Subject (headersOnly):', headersOnlyContent.subject);
  // Output: readEml Subject (headersOnly): Example for readEml
  console.log('readEml Text Body (headersOnly, should be null or undefined):', headersOnlyContent.text);
  // Output: readEml Text Body (headersOnly, should be null or undefined): null
} catch (error) {
  console.error('Error in readEml example section:', error);
}
```

### `buildEml(data: EmlContent, options?: BuildOptions): string`

The `buildEml` function takes a `EmlContent` object (or an EML string, which it will first parse using `parseEml` and then `readEml`) and constructs an EML file string. This is useful for creating or modifying emails programmatically.

-   **`data`**: A `EmlContent` object representing the email to be built, or an EML string.
-   **`options`**: Optional settings for building the EML, like encoding preferences (not fully implemented yet).

This function allows you to assemble an EML message from its constituent parts, including headers, text/HTML bodies, and attachments.

## Fork Notice

This library is a fork of a fork (of maybe about fork.)   And, it was created because it was getting difficult to find something that was well documented and tested for an area that is so fundamental.  This repository originated as a fork of `eml-format-js` (for browser environments) and `eml-format` (for Node.js environments), and was more recently forked from `https://github.com/MQpeng/eml-parse-js`. The primary motivations for this fork include:

*   Fixing issues related to parsing HTML from EML files with `quoted-printable` encoding.
*   Adding support for `base64` encoded data in attachments.
*   Expanding test coverage.
*   Improving documentation.
*   Modernizing the codebase.

It has also changed enough from the original fork, that I'm no longer tracking changes to the project this was forked from.  The changes at this point include naming, function signatures, and approach.  If you are finding this library because you are looking for something compatible with the library it was forked from you will likely be disappointed, so consider that a warning - this isn't a drop-in replacement for the libary it was forked from.

## License

MIT License

Copyright (c) 2021 Bean

Copyright (c) 2025 C Harbridge

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

[test-badge]: https://github.com/vortiq/eml-parse-js/actions/workflows/test.yml/badge.svg
[test-link]: https://github.com/vortiq/eml-parse-js/actions/workflows/test.yml
[npm-badge]: https://img.shields.io/npm/v/@vortiq/eml-parse-js.svg
[npm-link]: https://www.npmjs.com/package/@vortiq/eml-parse-js
[license-badge]: https://img.shields.io/npm/l/@vortiq/eml-parse-js.svg
[license-link]: https://github.com/vortiq/eml-parse-js/blob/master/LICENSE
[downloads-badge]: https://img.shields.io/npm/dt/@vortiq/eml-parse-js.svg
[downloads-link]: https://www.npmjs.com/package/@vortiq/eml-parse-js
[codecov-badge]: https://codecov.io/gh/vortiq/eml-parse-js/branch/master/graph/badge.svg
[codecov-link]: https://codecov.io/gh/vortiq/eml-parse-js
[snyk-badge]: https://snyk.io/test/github/vortiq/eml-parse-js/badge.svg
[snyk-link]: https://snyk.io/test/github/vortiq/eml-parse-js