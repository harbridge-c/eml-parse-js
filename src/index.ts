import { build } from './build';
import type {
	Attachment,
	BoundaryHeaders,
	EmailAddress,
	EmlContent,
	ParsedEml
} from './interface';
import { parse } from './parse';
import { read } from './read';

export {
	build as buildEml,
	parse as parseEml,
	read as readEml
};

export type {
	Attachment,
	BoundaryHeaders,
	EmailAddress,
	EmlContent,
	ParsedEml
};