/**
* Copyright (c) 2022, Leon Sorokin
* All rights reserved. (MIT Licensed)
*
* dropcss.js (DropCSS)
* An exceptionally fast, thorough and tiny unused-CSS cleaner
* https://github.com/leeoniya/dropcss (v1.0.16)
*/

'use strict';

function parseErr(srcType, srcStr, pos) {
	throw new Error(srcType + ' parser stopped here: "' + srcStr.substring(pos, pos + 100) + '"');
}

const TAG_OPEN = 1;
const ATTRS = 2;
const TAG_CLOSE = 3;

const VOIDS = new Set("area base br col command embed hr img input keygen link meta param source track wbr".split(" "));

// doctype, comments, meta, style, link & script tags. TODO: CDATA
const NASTIES = /<!doctype[^>]*>|<!--[\s\S]*?-->|<script[^>]*>[\s\S]*?<\/script>|<style[^>]*>[\s\S]*?<\/style>|<link\s+[^>]*>|<meta\s+[^>]*>/gmi;
const RE = {
	NAME: /\s*<([\w-]+)\s*/myi,
	ATTR: /\s*([\w-:]+)(?:="([^"]*)"|='([^']*)'|=([\w-]+))?\s*/myi,
	TAIL: /\s*(\/?>)\s*/myi,
	TEXT: /\s*[^<]*/my,
	CLOSE: /\s*<\/[\w-]+>\s*/myi,
};

function tokenize$1(html) {
	let pos = 0, m, m2, tokens = [];

	function syncPos(re) {
		pos = re.lastIndex;
		for (let k in RE)
			RE[k].lastIndex = pos;
	}

	function next() {
		m = RE.CLOSE.exec(html);

		if (m != null) {
			syncPos(RE.CLOSE);
			tokens.push(TAG_CLOSE);
			return;
		}

		m = RE.NAME.exec(html);

		if (m != null) {
			syncPos(RE.NAME);
			let tag = m[1];
			tokens.push(TAG_OPEN, tag);

			let attrMap;

			while (m2 = RE.ATTR.exec(html)) {
				syncPos(RE.ATTR);
				attrMap = attrMap || new Map();
				attrMap.set(m2[1], (m2[2] || m2[3] || m2[4] || '').trim());
			}

			if (attrMap)
				tokens.push(ATTRS, attrMap);

			m2 = RE.TAIL.exec(html);

			if (VOIDS.has(tag) || m2[1] == "/>")
				tokens.push(TAG_CLOSE);

			syncPos(RE.TAIL);

			return;
		}

		m = RE.TEXT.exec(html);

		if (m != null)
			syncPos(RE.TEXT);
	}

	let prevPos = pos;

	while (pos < html.length) {
		next();

		if (prevPos === pos)
			parseErr('html', html, pos);

		prevPos = pos;
	}

	syncPos({lastIndex: 0});

	return tokens;
}

const EMPTY_SET = new Set();

// TODO: lazy attrs, classList. then test tagNames first to reduce chance of triggering getters
function node(parent, tagName, attrs) {
	return {
		tagName,
		attributes: attrs,
		classList: attrs != null && attrs.has('class') ? new Set(attrs.get('class').split(/\s+/g)) : EMPTY_SET,
		parentNode: parent,
		childNodes: [],
	};
}

const EMPTY_ARR = [];

// adds ._ofTypes: {<tagName>: [...]} to parent
// adds ._typeIdx to childNodes
function getSibsOfType(par, tagName) {
	if (par != null) {
		let ofTypes = (par._ofTypes = par._ofTypes || {});

		if (!(tagName in ofTypes)) {
			let typeIdx = 0;
			ofTypes[tagName] = par.childNodes.filter(n => {
				if (n.tagName == tagName) {
					n._typeIdx = typeIdx++;
					return true;
				}
			});
		}

		return ofTypes[tagName];
	}

	return EMPTY_ARR;
}

function build(tokens, each) {
	let targ = node(null, "root", EMPTY_SET), idx;

	for (let i = 0; i < tokens.length; i++) {
		let t = tokens[i];

		switch (t) {
			case TAG_OPEN:
				let tag = tokens[++i];
				let attrs = EMPTY_SET;

				if (tokens[i+1] === ATTRS) {
					i += 2;
					attrs = tokens[i];
				}

				idx = targ.childNodes.length;
				targ.childNodes.push(targ = node(targ, tag, attrs));
				each(targ, idx);
				break;
		//	case ATTRS:
		//		break;
			case TAG_CLOSE:
				targ = targ.parentNode;
				break;
		}
	}

	return targ;
}

function postProc$1(node, idx, ctx) {
	// add index for fast positional testing, e.g. :nth-child
	node.idx = idx;

	let attrs = node.attributes;

	// cache seen tags, classes & ids
	ctx.tag.add(node.tagName);
	node.classList.forEach(v => ctx.class.add(v));
/*
	for (let a in attrs) {
		ctx.attr.add('['+a+']');
		ctx.attr.add('['+a+'='+attrs[a]+']');
	}
*/
	if (attrs.has('id'))
		ctx.attr.add('[id='+attrs.get('id')+']');
	if (attrs.has('type'))
		ctx.attr.add('[type='+attrs.get('type')+']');

	// append to flat node list
	ctx.nodes.push(node);
}

const parse$2 = html => {
	html = html.replace(NASTIES, '');

	let tokens = tokenize$1(html);

	const ctx = {
		nodes: [],
		tag: new Set(["*"]),
		class: new Set(),
		attr: new Set(),
	};

	build(tokens, (node, idx) => postProc$1(node, idx, ctx));

	return ctx;
};

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

function parse$1(css) {
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

// adapted from https://github.com/fb55/nth-check/blob/master/compile.js

// https://css-tricks.com/how-nth-child-works/
// https://css-tricks.com/useful-nth-child-recipies/
// https://css-tricks.com/examples/nth-child-tester/
// http://nthmaster.com/

/* leon's incomplete attempt
function nthChild(el, a, b) {
	if (a < 0) {
		console.log("Unimplemented: -A in :nth-child(An+B)", m);
		return true;
	}

	let p = el.idx + 1;

	let diff = p - b;

	return diff >= 0 && diff % a == 0;
}
*/


/*
	tests if an element's pos (index+1) matches the given rule
	highly optimized to return the fastest solution
*/
function nth(a, b, pos) {
	//when b <= 0, a*n won't be possible for any matches when a < 0
	//besides, the specification says that no element is matched when a and b are 0
	if (b < 0 && a <= 0)
        return false;

	//when a is in the range -1..1, it matches any element (so only b is checked)
	if (a === -1)
		return pos <= b;
	if (a === 0)
		return pos === b;
	//when b <= 0 and a === 1, they match any element
	if (a === 1)
		return b < 0 || pos >= b;

	//when a > 0, modulo can be used to check if there is a match
	let bMod = b % a;

	if (bMod < 0)
        bMod += a;

	if (a > 1)
        return pos >= b && pos % a === bMod;

	a *= -1; //make `a` positive

	return pos <= b && pos % a === bMod;
}

const pseudoClasses = /not|is/;

// assumes stripPseudos(sel); has already been called
function parse(sel) {
	const RE = {
		IDENT:	/([\w*-]+)/iy,
		ATTR:	/([\w-]+)(?:(.?=)["']?([^\]]*?)["']?)?\]/iy,
		PSEUDO: /([\w-]+)(\()?/iy,
		MODE:	/\s*[:.#\[]\s*/iy,
		COMB:	/\s*[>~+]\s*|\s+/iy
	};

	let idx = 0;
	let toks = [];
	let m;
	let lastComb = -1;

	function setIdx(re) {
		idx = re.lastIndex;
		for (let k in RE)
			RE[k].lastIndex = idx;
	}

	function next() {
		let matched = false;

		if (m = RE.COMB.exec(sel)) {
			matched = true;

			let mode = m[0].trim();

			if (mode == '')
				mode = ' ';

			toks.push(mode);
			setIdx(RE.COMB);
			lastComb = toks.length - 1;
		}
		else if (m = RE.MODE.exec(sel)) {
			matched = true;

			let mode = m[0].trim();

			setIdx(RE.MODE);

			if (mode == ':') {
				m = RE.PSEUDO.exec(sel);

				if (m[2] == '(') {
					let subsel = takeUntilMatchedClosing(sel, RE.PSEUDO.lastIndex, '(', ')');
					RE.PSEUDO.lastIndex += subsel.length + 1;
					m[2] = pseudoClasses.test(m[1]) ? parse(subsel) : subsel;
				}

				toks.splice(
					lastComb + 1,
					0,
					m[2],
					m[1],
					mode
				);
				setIdx(RE.PSEUDO);
			}
			else if (mode == '[') {
				m = RE.ATTR.exec(sel);
				toks.splice(
					lastComb + 1,
					0,
					m[3],
					m[2],
					m[1],
					mode,
				);
				setIdx(RE.ATTR);
			}
			else {
				m = RE.IDENT.exec(sel);
				toks.push(m[1], mode);
				setIdx(RE.IDENT);
			}
		}
		else if (m = RE.IDENT.exec(sel)) {
			matched = true;
			toks.push(m[1], '_');
			setIdx(RE.IDENT);
		}

		return matched;
	}

	let prevPos = idx;

	while (idx < sel.length) {
		next();

		if (prevPos === idx)
			parseErr('sel', sel, idx);

		prevPos = idx;
	}

	return toks;
}

const RE_NTH = /^([+-]?\d*)?n([+-]\d+)?$/;

function parseNth(expr) {
	let m = RE_NTH.exec(expr);

	if (m != null) {
		let a = m[1];
		let b = m[2];

		if (a == null || a == "+")
			a = 1;
		else if (a == "-")
			a = -1;
		else
			a = +a;

		if (b == null)
			b = 0;
		else
			b = +b;

		return [a, b];
	}

	return [0, 0];
}

function matchesType(el, name) {
	return name == el.tagName || name == '*';
}

function matchesAttr(el, name, selVal, matcher) {
	matcher = matcher || '=';

	let attrs = el.attributes;

	if (attrs.has(name)) {
		let attrVal = attrs.get(name);

		switch (matcher) {
			case '=': return selVal == null || selVal == attrVal;
			case '*=': return attrVal.indexOf(selVal) != -1;
			case '^=': return attrVal.startsWith(selVal);
			case '$=': return attrVal.endsWith(selVal);
			case '~=': return (
				selVal == attrVal ||
				attrVal.startsWith(selVal + ' ') ||
				attrVal.endsWith(' ' + selVal) ||
				attrVal.indexOf(' ' + selVal + ' ') != -1
			);
		}
	}

	return false;
}

function matchesClass(el, name) {
	return el.classList.has(name);
}

// DRYed out nth-child/nth-last-child logic
function matchesNth(pos, val) {
	let res;

	if (val == 'odd')
		res = pos % 2 == 1;
	else if (val == 'even')
		res = pos % 2 == 0;
	// nth-child(5)
	else if (/^\d+$/.test(val))
		res = pos == +val;
	// :nth-child(An+B)
	else {
		let nth$1 = parseNth(val);
		res = nth(nth$1[0], nth$1[1], pos);
	}

	return res;
}

// TODO: look for perf improvements for rules where rightmost selector is *
// maybe look at next non-* selector and check it it has any children/desc?
function find(m, ctx) {
	let name, val, mat, par, tidx, res;

	while (ctx.idx > -1) {
		switch(m[ctx.idx]) {
			case '_':
				name	= m[--ctx.idx];
				res		= matchesType(ctx.node, name);
				ctx.idx--;
				break;
			case '#':
				val		= m[--ctx.idx];
				res		= matchesAttr(ctx.node, 'id', val, '=');
				ctx.idx--;
				break;
			case '.':
				name	= m[--ctx.idx];
				res		= matchesClass(ctx.node, name);
				ctx.idx--;
				break;
			case '[':
				name	= m[--ctx.idx];
				mat		= m[--ctx.idx];
				val		= m[--ctx.idx];
				res		= matchesAttr(ctx.node, name, val, mat);
				ctx.idx--;
				break;
			case ':':
				name	= m[--ctx.idx];
				val		= m[--ctx.idx];

				let n = ctx.node;
				let tag = n.tagName;
				tidx = n.idx;
				par = n.parentNode;
				let len = par ? par.childNodes.length : 1;
				let tsibs;

				switch (name) {
					case 'not':
						debugger
						res = !find(val, {node: ctx.node, idx: val.length - 1});
						break;
					case 'is':
						debugger
						res = find(val, {node: ctx.node, idx: val.length - 1});
						break;
					case 'first-child':
						res = tidx == 0;
						break;
					case 'last-child':
						res = tidx == len - 1;
						break;
					case 'only-child':
						res = len == 1;
						break;
					case 'nth-child':
						res = matchesNth(tidx + 1, val);
						break;
					case 'nth-last-child':
						res = matchesNth(len - tidx, val);
						break;
					case 'first-of-type':
						tsibs = getSibsOfType(par, tag);
						res = n._typeIdx == 0;
						break;
					case 'last-of-type':
						tsibs = getSibsOfType(par, tag);
						res = n._typeIdx == tsibs.length - 1;
						break;
					case 'only-of-type':
						tsibs = getSibsOfType(par, tag);
						res = tsibs.length == 1;
						break;
					case 'nth-of-type':
						tsibs = getSibsOfType(par, tag);
						res = matchesNth(n._typeIdx + 1, val);
						break;
					case 'nth-last-of-type':
						tsibs = getSibsOfType(par, tag);
						res = matchesNth(tsibs.length - n._typeIdx, val);
						break;
				}

				ctx.idx--;
				break;
			case ' ':
				tidx = --ctx.idx;
				res = false;
				while (!res) {
					par = ctx.node.parentNode;
					if (par == null)
						break;
					ctx.idx = tidx;
					ctx.node = par;
					res = find(m, ctx);
				}
				break;
			case '>':
				ctx.idx--;
				par = ctx.node.parentNode;
				if (par != null) {
					ctx.node = par;
					res = find(m, ctx);
				}
				else
					res = false;
				break;
			case '+':
				ctx.idx--;
				par = ctx.node.parentNode;
				if (par != null && ctx.node.idx > 0) {
					ctx.node = par.childNodes[ctx.node.idx - 1];
					res = find(m, ctx);
				}
				else
					res = false;
				break;
			case '~':
				ctx.idx--;
				res = false;
				tidx = ctx.node.idx;
				par = ctx.node.parentNode;
				if (par != null && tidx > 0) {
					for (let i = 0; i < tidx && !res; i++) {
						ctx.node = par.childNodes[i];
						res = find(m, ctx);
					}
				}
				break;
		}

		if (!res)
			break;
	}

	return res;
}

function _some(nodes, m) {
	return nodes.some(node => find(m, {
		idx: m.length - 1,
		node
	}));
}

const some = (nodes, sel) => {
	return _some(nodes, Array.isArray(sel) ? sel : parse(sel));
};

function splice(str, index, count, add) {
	return str.slice(0, index) + add + str.slice(index + count);
}

function removeBackwards(css, defs, used, shouldDrop, type) {
	type = type || '';

	for (let i = defs.length - 1; i > -1; i--) {
		let d = defs[i];

		if (!used.has(d[2]) && shouldDrop(type + d[2]) === true)
			css = splice(css, d[0], d[1], '');
	}

	return css;
}

const CUSTOM_PROP_DEF = /([{};])\s*(--[\w-]+)\s*:\s*([^;}]+);?\s*/gm;
const CUSTOM_PROP_USE = /var\(([\w-]+)\)/gm;
const COMMA_SPACED = /\s*,\s*/gm;

function resolveCustomProps(css) {
	let defs = {}, m;

	// while var(--*) patterns exist
	while (CUSTOM_PROP_USE.test(css)) {
		// get all defs
		while (m = CUSTOM_PROP_DEF.exec(css))
			defs[m[2]] = m[3];

		// replace any non-composites
		css = css.replace(CUSTOM_PROP_USE, (m0, m1) => !CUSTOM_PROP_USE.test(defs[m1]) ? defs[m1] : m0);
	}

	return css;
}

function dropKeyFrames(css, flatCss, shouldDrop) {
	// defined
	let defs = [];

	let RE = /@(?:-\w+-)?keyframes\s+([\w-]+)\s*\{/gm, m;

	while (m = RE.exec(css)) {
		let ch = takeUntilMatchedClosing(css, RE.lastIndex, '{', '}');
		defs.push([m.index, m[0].length + ch.length + 1, m[1]]);
	}

	// used
	let used = new Set();

	let RE2 = /animation(?:-name)?:([^;!}]+)/gm;

	while (m = RE2.exec(flatCss)) {
		m[1].trim().split(COMMA_SPACED).forEach(a => {
			let keyFramesName = a.match(/^\S+/)[0];

			if (/^-?[\d.]+m?s/.test(keyFramesName))
				keyFramesName = a.match(/\S+$/)[0];

			used.add(keyFramesName);
		});
	}

	return removeBackwards(css, defs, used, shouldDrop, '@keyframes ');
}

function cleanFontFam(fontFam) {
	return fontFam.trim().replace(/'|"/gm, '').split(COMMA_SPACED);
}

function dropFontFaces(css, flatCss, shouldDrop) {
	// defined
	let gm = 'gm',
		re00 = '@font-face[^}]+\\}+',
		RE00 = RegExp(re00, gm),
		m;

	// get all @font-face blocks in original css
	let defs = [];

	while (m = RE00.exec(css))
		defs.push([m.index, m[0].length]);

	let re01 = 'font-family:([^;!}]+)',
		RE01 = RegExp(re01),
		m2, i = 0;

	// get all @font-face blocks in resolved css
	while (m = RE00.exec(flatCss)) {
		m2 = RE01.exec(m[0]);
		defs[i++].push(cleanFontFam(m2[1])[0]);
	}

	// used
	let used = new Set();

	let RE02 = RegExp(re00 + '|' + re01, gm);

	while (m = RE02.exec(flatCss)) {
		if (m[0][0] !== '@')
			cleanFontFam(m[1]).forEach(a => used.add(a));
	}

	let RE03 = /font:([^;!}]+)/gm;
	let RE04 = /\s*(?:['"][\w- ]+['"]|[\w-]+)\s*(?:,|$)/gm;
	let t;

	while (m = RE03.exec(flatCss)) {
		t = '';
		while (m2 = RE04.exec(m[1]))
			t += m2[0];

		cleanFontFam(t).forEach(a => used.add(a));
	}

	return removeBackwards(css, defs, used, shouldDrop, '@font-face ');
}

function dropCssVars(css, shouldDrop) {
	let css2 = css;

	do {
		css = css2;
		css2 = css.replace(CUSTOM_PROP_DEF, (m, m1, m2) => css.indexOf('var(' + m2 + ')') != -1 ? m : m1);
	} while (css2 != css);

	return css2;
}

function postProc(out, shouldDrop, log, START) {
	// flatten & remove custom props to ensure no accidental
	// collisions for regexes, e.g. --animation-name: --font-face:
	// this is used for testing for "used" keyframes and fonts and
	// parsing resolved 'font-family:' names from @font-face defs,
	// so does not need to be regenerated during iterative purging
	let flatCss = resolveCustomProps(out).replace(CUSTOM_PROP_DEF, (m, m1) => m1);

	out = dropKeyFrames(out, flatCss, shouldDrop);

	out = dropFontFaces(out, flatCss, shouldDrop);

	out = dropCssVars(out);

	// kill any leftover empty blocks e.g. :root {}
	return out.replace(/[^{}]+\{\s*\}/gm, '');
}

const ATTRIBUTES = /\[([\w-]+)(?:(.?=)"?([^\]]*?)"?)?\]/i;

const pseudoAssertable = /:(?:first|last|nth|only|not|is)\b/;

const pseudoNonAssertableParenth = /:(?:lang)\([^)]*\)/g;

// strips pseudo-elements and transient pseudo-classes
function stripNonAssertablePseudos(sel) {
	return sel
		.replace(pseudoNonAssertableParenth, '')
		.replace(/:?:[a-z-]+/gm, (m) => m.startsWith('::') || !pseudoAssertable.test(m) ? '' : m)
		// remove any empty leftovers eg :not() - [tabindex="-1"]:focus:not(:focus-visible)
		.replace(/:[a-z-]+\(\)/gm, '');
}

const retTrue = sel => true;

function dropcss(opts) {

	// {nodes, tag, class, id}
	const H = parse$2(opts.html, !opts.keepText);

	const shouldDrop = opts.shouldDrop || retTrue;
	const didRetain  = opts.didRetain  || retTrue;

	let tokens = parse$1(opts.css);

	// cache
	let tested = {};

	// null out tokens that have any unmatched sub-selectors in flat dom
	for (let i = 0; i < tokens.length; i++) {
		let token = tokens[i];

		if (token !== SELECTORS)
			continue;

		let sels = tokens[i+1];
		let sels2 = sels[sels.length - 1];

		i++;

		for (let j = 0; j < sels2.length; j++) {
			let subs = sels2[j];

			subsLoop:
			for (let k = 0; k < subs.length; k++) {
				let sub = subs[k];
				let hasOne = false;
				let name;

				if (sub == '')
					continue;

				// cache
				if (sub in tested)
					hasOne = tested[sub];
				else {
					// hehe Sub-Zero :D
					switch (sub[0]) {
						case "#":
							name = sub.substr(1);
							tested[sub] = hasOne = H.attr.has('[id=' + name + ']');
							break;
						case ".":
							name = sub.substr(1);
							tested[sub] = hasOne = H.class.has(name);
							break;
						case "[":
							// [type=...] is super common in css, so it gets special fast-path treatment, which is a large perf win
							if (sub.startsWith('[type='))
								tested[sub] = hasOne = H.attr.has(sub);
							else {
								let m = sub.match(ATTRIBUTES);
								tested[sub] = hasOne = H.nodes.some(el => matchesAttr(el, m[1], m[3], m[2]));
							}
							break;
						default:
							tested[sub] = hasOne = H.tag.has(sub);
					}
				}

				if (!hasOne) {
					if (shouldDrop(sels[j]) === true)
						sels[j] = null;
					else
						tested[sels[j]] = true;			// should this be pseudo-stripped?

					break subsLoop;
				}
			}
		}
	}

	for (let i = 0; i < tokens.length; i++) {
		let tok = tokens[i];

		if (tok === SELECTORS) {
			i++;
			tokens[i].length;
			tokens[i] = tokens[i].filter(s => {
				if (typeof s == 'string') {
					if (s in tested)
						return tested[s];

					let cleaned = stripNonAssertablePseudos(s);

					if (cleaned == '')
						return true;

					if (cleaned in tested)
						return tested[cleaned];
debugger
					return tested[cleaned] = (some(H.nodes, cleaned) || shouldDrop(s) !== true);
				}

				return false;
			});
		}
	}

	let out = generate(tokens, didRetain);

	out = postProc(out, shouldDrop);

	return {
		css: stripEmptyAts(out),
	};
}

module.exports = dropcss;
