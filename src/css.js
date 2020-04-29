"use strict";

const { parseErr } = require('./err');

const COMMENTS = /\s*\/\*[\s\S]*?\*\/\s*/gm;
const COMBINATORS = /\s*[>~+.#]\s*|\[[^\]]+\]|\s+/gm;

const START_AT = 1;
const CLOSE_AT = 2;
const SELECTORS = 3;
const PROPERTIES = 4;
const AT_CHUNK = 5;		// for @ blocks that should not be processed
//const COMMENT;


// mission: "#a > b.c~g[a='a z'] y>.foo.bar" -> ["#a", "b", ".c", "g", "[a=a z]", "y", ".foo", ".bar"]
// selsStr e.g. "table > a, foo.bar"
function quickSels(selsStr) {
	// -> ["table > a", "foo.bar"]
	let selsArr = selsStr.split(/\s*,\s*/gm);

	let sep = '`';

	// -> ["table > a", "foo.bar", [["table", "a"], ["foo", ".bar"]]]
	selsArr.push(selsArr.map(sel =>
		stripAllPseudos(sel)
		.trim()
		.replace(COMBINATORS, (m, i) => {
			m = m.trim();
			return (
				i == 0 ? m :
				m == '.' || m == '#' ? sep + m :
				m.length <= 1 ? sep :
				sep + m.replace(/['"]/gm, '')
			);
		})
		.split(/`+/gm)
	));

	return selsArr;
}

const PSEUDO_PARENTH = /:[a-z-]+\([^()]*\)/;

function stripAllPseudos(sel) {
	let olen = sel.length;

	for (;;) {
		sel = sel.replace(PSEUDO_PARENTH, '');
		if (sel.length == olen)
			break;
		olen = sel.length;
	}

	return sel.replace(/:?:[a-z-]+/gm, '');
}

// pos must already be past opening @op
function takeUntilMatchedClosing(css, pos, op, cl) {
	let chunk = '';
	let unclosed = 1;

	while (1) {
		if (css[pos] == op)
			unclosed++;
		else if (css[pos] == cl)
			unclosed--;

		if (unclosed == 0)
			break;

		chunk += css[pos++];
	}

	return chunk;
}

function tokenize(css) {
	// TODO: dry out with selector regexes?
	const RE = {
		RULE_HEAD:	/\s*([^{;]+?)\s*[{;]\s*/my,
		RULE_TAIL:	/\s*([^}]*?)\s*\}/my,
		AT_TAIL:	/\s*\}/my,
		RULE_FULL:	/\s*([^{]*?)\{([^}]+?)\}/my,
	//	COMMENT:	/\s*\/\*.*?\*\/\s*/my,
	};

	let inAt = 0;

	let pos = 0, m, tokens = [];

	function syncPos(re) {
		pos = re.lastIndex;
		for (let k in RE)
			RE[k].lastIndex = pos;
	}

	function next() {
		if (inAt > 0) {
			m = RE.AT_TAIL.exec(css);

			if (m != null) {
				inAt--;
				tokens.push(CLOSE_AT);
				syncPos(RE.AT_TAIL);
				return;
			}
		}

		// try to find rule start or @ start
		m = RE.RULE_HEAD.exec(css);

		if (m != null) {
			let pre = m[1];

			syncPos(RE.RULE_HEAD);

			if (pre[0] == '@') {
				let med = pre.match(/@[a-z-]+/)[0];

				switch (med) {
					// containers (can contain selectors and other @), start with '{' and terminate on matched '}'
					case '@media':
					case '@supports':
					case '@document':
						inAt++;
						tokens.push(START_AT, pre);
						break;
					// inlines, terminated by ';'
					case '@import':
					case '@charset':
					case '@namespace':
						tokens.push(AT_CHUNK, pre + ';');
						break;
					default:
					// blobs (do not contain selectors), start with '{' and terminate on matched '}'
				//	case '@font-face':
				//	case '@keyframes':
				//	case '@page':
				//	case '@counter-style':
				//	case '@font-feature-values':
						inAt++;
						let chunk = takeUntilMatchedClosing(css, pos, '{', '}');
						syncPos({lastIndex: pos + chunk.length});
						tokens.push(START_AT, pre, AT_CHUNK, chunk);
						break;
				}
			}
			else {
				tokens.push(SELECTORS, quickSels(m[1]));
				// if cannot contain nested {}
				m = RE.RULE_TAIL.exec(css);
				tokens.push(PROPERTIES, m[1]);
				syncPos(RE.RULE_TAIL);
			}
		}
		else
			pos = css.length;
	}

	let prevPos = pos;

	while (pos < css.length) {
		next();

		if (prevPos === pos)
			parseErr('css', css, pos);

		prevPos = pos;
	}

//	const fs = require('fs');
//	fs.writeFileSync(__dirname + '/tokens.json', JSON.stringify(tokens, null, 2), 'utf8');

	return tokens;
}

function parse(css) {
	// strip comments (for now)
	css = css.replace(COMMENTS, '');
	return tokenize(css);
}

function stripEmptyAts(css) {
	return css.replace(/@[a-z-]+[^{]+\{\s*\}/gm, '');
}

function generate(tokens, didRetain) {
	let out = '', lastSelsLen = 0;

	for (let i = 0; i < tokens.length; i++) {
		let tok = tokens[i];

		switch (tok) {
			case SELECTORS:
				let sels = tokens[++i];
				lastSelsLen = sels.length;

				if (lastSelsLen > 0) {
					sels.forEach(didRetain);
					out += sels.join();
				}
				break;
			case PROPERTIES:
				if (lastSelsLen > 0)
					out += '{' + tokens[++i] + '}';
				break;
			case START_AT:
				out += tokens[++i] + '{';
				break;
			case CLOSE_AT:
				out += '}';
				break;
			case AT_CHUNK:
				out += tokens[++i];
				break;
		}
	}

	// strip leftover empty @ rules
	return stripEmptyAts(out);
}

exports.parse = parse;
exports.generate = generate;
exports.SELECTORS = SELECTORS;
exports.takeUntilMatchedClosing = takeUntilMatchedClosing;
exports.stripEmptyAts = stripEmptyAts;