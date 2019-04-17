/**
* Copyright (c) 2019, Leon Sorokin
* All rights reserved. (MIT Licensed)
*
* dropcss.js (DropCSS)
* An exceptionally fast, thorough and tiny unused-CSS cleaner
* https://github.com/leeoniya/dropcss (v1.0.5)
*/

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global = global || self, global.dropcss = factory());
}(this, function () { 'use strict';

	var TAG_OPEN = 1;
	var ATTRS = 2;
	var TAG_CLOSE = 3;

	var VOIDS = new Set("area base br col command embed hr img input keygen link meta param source track wbr".split(" "));

	// doctype, comments, meta, style, link & script tags. TODO: CDATA
	var NASTIES = new RegExp('<!doctype[^>]*>|<!--[\\s\\S]*?-->|<script[^>]*>[\\s\\S]*?<\\/script>|<style[^>]*>[\\s\\S]*?<\\/style>|<link[^>]*>|<meta[^>]*>', 'gmi');
	var RE_ATTRS = new RegExp('([\\w-]+)(?:="([^"]*)"|=\'([^\']*)\'|=(\S+))?', 'gm');
	var RE = {
		// TODO: handle self-closed tags <div/> ?
		TAG_HEAD: new RegExp('\\s*<([a-z0-9_-]+)(?:\\s*([^>]*))?>\\s*', 'imy'),
		TEXT: new RegExp('\\s*[^<]*', 'my'),
		TAG_CLOSE: new RegExp('\\s*<\\/[a-z0-9_-]+>\\s*', 'imy'),
	};

	function tokenize(html) {
		var pos = 0, m, tokens = [];

		function syncPos(re) {
			pos = re.lastIndex;
			for (var k in RE)
				{ RE[k].lastIndex = pos; }
		}

		function next() {
			m = RE.TAG_CLOSE.exec(html);

			if (m != null) {
				syncPos(RE.TAG_CLOSE);
				tokens.push(TAG_CLOSE);
				return;
			}

			m = RE.TAG_HEAD.exec(html);

			if (m != null) {
				syncPos(RE.TAG_HEAD);
				var tag = m[1];
				tokens.push(TAG_OPEN, tag);

				var attrs = m[2];

				if (attrs != null) {
					var attrMap = new Map();
					var m2;
					while (m2 = RE_ATTRS.exec(attrs))
						{ attrMap.set(m2[1], (m2[2] || m2[3] || m2[4] || '').trim()); }
					tokens.push(ATTRS, attrMap);
				}

				if (VOIDS.has(tag))
					{ tokens.push(TAG_CLOSE); }

				return;
			}

			m = RE.TEXT.exec(html);

			if (m != null)
				{ syncPos(RE.TEXT); }
		}

		while (pos < html.length)
			{ next(); }

		syncPos({lastIndex: 0});

		return tokens;
	}

	var EMPTY_SET = new Set();

	// TODO: lazy attrs, classList. then test tagNames first to reduce chance of triggering getters
	function node(parent, tagName, attrs) {
		return {
			tagName: tagName,
			attributes: attrs,
			classList: attrs != null && attrs.has('class') ? new Set(attrs.get('class').split(/\s+/g)) : EMPTY_SET,
			parentNode: parent,
			childNodes: [],
		};
	}

	// adds ._ofTypes: {<tagName>: [...]} to parent
	// adds ._typeIdx to childNodes
	function getSibsOfType(par, tagName) {
		if (par != null) {
			var ofTypes = (par._ofTypes = par._ofTypes || {});

			if (!(tagName in ofTypes)) {
				var typeIdx = 0;
				ofTypes[tagName] = par.childNodes.filter(function (n) {
					if (n.tagName == tagName) {
						n._typeIdx = typeIdx++;
						return true;
					}
				});
			}

			return ofTypes[tagName];
		}

		return [];
	}

	function build(tokens, each) {
		var targ = node(null, "root", EMPTY_SET), idx;

		for (var i = 0; i < tokens.length; i++) {
			var t = tokens[i];

			switch (t) {
				case TAG_OPEN:
					var tag = tokens[++i];
					var attrs = EMPTY_SET;

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

	function postProc(node, idx, ctx) {
		// add index for fast positional testing, e.g. :nth-child
		node.idx = idx;

		var attrs = node.attributes;

		// cache seen tags, classes & ids
		ctx.tag.add(node.tagName);
		node.classList.forEach(function (v) { return ctx.class.add(v); });
	/*
		for (let a in attrs) {
			ctx.attr.add('['+a+']');
			ctx.attr.add('['+a+'='+attrs[a]+']');
		}
	*/
		if (attrs.has('id'))
			{ ctx.attr.add('[id='+attrs.get('id')+']'); }
		if (attrs.has('type'))
			{ ctx.attr.add('[type='+attrs.get('type')+']'); }

		// append to flat node list
		ctx.nodes.push(node);
	}

	var _export_parse_ = function (html) {
		html = html.replace(NASTIES, '');

		var tokens = tokenize(html);

		var ctx = {
			nodes: [],
			tag: new Set(["*"]),
			class: new Set(),
			attr: new Set(),
		};

		var tree = build(tokens, function (node, idx) { return postProc(node, idx, ctx); });

		return ctx;
	};

	var COMMENTS = new RegExp('\\s*\\/\\*[\\s\\S]*?\\*\\/\\s*', 'gm');
	var COMBINATORS = new RegExp('\\s*[>~+.#]\\s*|\\[[^\\]]+\\]|\\s+', 'gm');

	var START_AT = 1;
	var CLOSE_AT = 2;
	var SELECTORS = 3;
	var PROPERTIES = 4;
	var AT_CHUNK = 5;		// for @ blocks that should not be processed
	//const COMMENT;


	// mission: "#a > b.c~g[a='a z'] y>.foo.bar" -> ["#a", "b", ".c", "g", "[a=a z]", "y", ".foo", ".bar"]
	// selsStr e.g. "table > a, foo.bar"
	function quickSels(selsStr) {
		// -> ["table > a", "foo.bar"]
		var selsArr = selsStr.split(new RegExp('\\s*,\\s*', 'gm'));

		var sep = '`';

		// -> ["table > a", "foo.bar", [["table", "a"], ["foo", ".bar"]]]
		selsArr.push(selsArr.map(function (sel) { return stripAllPseudos(sel)
			.trim()
			.replace(COMBINATORS, function (m, i) {
				m = m.trim();
				return (
					i == 0 ? m :
					m == '.' || m == '#' ? sep + m :
					m.length <= 1 ? sep :
					sep + m.replace(new RegExp('[\'"]', 'gm'), '')
				);
			})
			.split(new RegExp('`+'), 'gm'); }
		));

		return selsArr;
	}

	var PSEUDO_PARENTH = /:[a-z-]+\([^()]*\)/;

	function stripAllPseudos(sel) {
		var olen = sel.length;

		for (;;) {
			sel = sel.replace(PSEUDO_PARENTH, '');
			if (sel.length == olen)
				{ break; }
			olen = sel.length;
		}

		return sel.replace(new RegExp(':?:[a-z-]+', 'gm'), '');
	}

	// pos must already be past opening @op
	function takeUntilMatchedClosing(css, pos, op, cl) {
		var chunk = '';
		var unclosed = 1;

		while (1) {
			if (css[pos] == op)
				{ unclosed++; }
			else if (css[pos] == cl)
				{ unclosed--; }

			if (unclosed == 0)
				{ break; }

			chunk += css[pos++];
		}

		return chunk;
	}

	function tokenize$1(css) {
		// TODO: dry out with selector regexes?
		var RE = {
			RULE_HEAD: new RegExp('\\s*([^{;]+?)\\s*[{;]\\s*', 'my'),
			RULE_TAIL: new RegExp('\\s*([^}]*?)\\s*\\}', 'my'),
			AT_TAIL: new RegExp('\\s*\\}', 'my'),
			RULE_FULL: new RegExp('\\s*([^{]*?)\\{([^}]+?)\\}', 'my'),
		//	COMMENT: new RegExp('\\s*\\/\\*.*?\\*\\/\\s*', 'my'),
		};

		var inAt = 0;

		var pos = 0, m, tokens = [];

		function syncPos(re) {
			pos = re.lastIndex;
			for (var k in RE)
				{ RE[k].lastIndex = pos; }
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
				var pre = m[1];

				syncPos(RE.RULE_HEAD);

				if (pre[0] == '@') {
					var med = pre.match(/@[a-z-]+/)[0];

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
							var chunk = takeUntilMatchedClosing(css, pos, '{', '}');
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
				{ pos = css.length; }
		}

		while (pos < css.length)
			{ next(); }

	//	const fs = require('fs');
	//	fs.writeFileSync(__dirname + '/tokens.json', JSON.stringify(tokens, null, 2), 'utf8');

		return tokens;
	}

	function parse(css) {
		// strip comments (for now)
		css = css.replace(COMMENTS, '');
		return tokenize$1(css);
	}

	function stripEmptyAts(css) {
		return css.replace(new RegExp('@[a-z-]+[^{]+\\{\\s*\\}', 'gm'), '');
	}

	function generate(tokens) {
		var out = '', lastSelsLen = 0;

		for (var i = 0; i < tokens.length; i++) {
			var tok = tokens[i];

			switch (tok) {
				case SELECTORS:
					var sels = tokens[++i];
					lastSelsLen = sels.length;

					if (lastSelsLen > 0)
						{ out += sels.join(); }
					break;
				case PROPERTIES:
					if (lastSelsLen > 0)
						{ out += '{' + tokens[++i] + '}'; }
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
	        { return false; }

		//when a is in the range -1..1, it matches any element (so only b is checked)
		if (a === -1)
			{ return pos <= b; }
		if (a === 0)
			{ return pos === b; }
		//when b <= 0 and a === 1, they match any element
		if (a === 1)
			{ return b < 0 || pos >= b; }

		//when a > 0, modulo can be used to check if there is a match
		var bMod = b % a;

		if (bMod < 0)
	        { bMod += a; }

		if (a > 1)
	        { return pos >= b && pos % a === bMod; }

		a *= -1; //make `a` positive

		return pos <= b && pos % a === bMod;
	}

	// assumes stripPseudos(sel); has already been called
	function parse$1(sel) {
		var RE = {
			IDENT: new RegExp('([\\w*-]+)', 'iy'),
			ATTR: new RegExp('([\\w-]+)(?:(.?=)\"?([^\\]]*?)\"?)?\\]', 'iy'),
			PSEUDO: new RegExp('([\\w-]+)(\\()?', 'iy'),
			MODE: new RegExp('\\s*[:.#\\[]\\s*', 'iy'),
			COMB: new RegExp('\\s*[>~+]\\s*|\\s+', 'iy'),
		};

		var idx = 0;
		var toks = [];
		var m;
		var lastComb = -1;

		function setIdx(re) {
			idx = re.lastIndex;
			for (var k in RE)
				{ RE[k].lastIndex = idx; }
		}

		function next() {
			var matched = false;

			if (m = RE.COMB.exec(sel)) {
				matched = true;

				var mode = m[0].trim();

				if (mode == '')
					{ mode = ' '; }

				toks.push(mode);
				setIdx(RE.COMB);
				lastComb = idx;
			}
			else if (m = RE.MODE.exec(sel)) {
				matched = true;

				var mode$1 = m[0].trim();

				setIdx(RE.MODE);

				if (mode$1 == ':') {
					m = RE.PSEUDO.exec(sel);

					if (m[2] == '(') {
						var subsel = takeUntilMatchedClosing(sel, RE.PSEUDO.lastIndex, '(', ')');
						RE.PSEUDO.lastIndex += subsel.length + 1;
						m[2] = m[1] == 'not' ? parse$1(subsel) : subsel;
					}

					toks.splice(
						lastComb + 1,
						0,
						m[2],
						m[1],
						mode$1
					);
					setIdx(RE.PSEUDO);
				}
				else if (mode$1 == '[') {
					m = RE.ATTR.exec(sel);
					toks.splice(
						lastComb + 1,
						0,
						m[3],
						m[2],
						m[1],
						mode$1
					);
					setIdx(RE.ATTR);
				}
				else {
					m = RE.IDENT.exec(sel);
					toks.push(m[1], mode$1);
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

		while (idx < sel.length)
			{ next(); }

		return toks;
	}

	var RE_NTH = /^([+-]?\d*)?n([+-]\d+)?$/;

	function parseNth(expr) {
		var m = RE_NTH.exec(expr);

		if (m != null) {
			var a = m[1];
			var b = m[2];

			if (a == null || a == "+")
				{ a = 1; }
			else if (a == "-")
				{ a = -1; }
			else
				{ a = +a; }

			if (b == null)
				{ b = 0; }
			else
				{ b = +b; }

			return [a, b];
		}

		return [0, 0];
	}

	function matchesType(el, name) {
		return name == el.tagName || name == '*';
	}

	function matchesAttr(el, name, selVal, matcher) {
		matcher = matcher || '=';

		var attrs = el.attributes;

		if (attrs.has(name)) {
			var attrVal = attrs.get(name);

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
		var res;

		if (val == 'odd')
			{ res = pos % 2 == 1; }
		else if (val == 'even')
			{ res = pos % 2 == 0; }
		// nth-child(5)
		else if (/^\d+$/.test(val))
			{ res = pos == +val; }
		// :nth-child(An+B)
		else {
			var nth$1 = parseNth(val);
			res = nth(nth$1[0], nth$1[1], pos);
		}

		return res;
	}

	// TODO: look for perf improvements for rules where rightmost selector is *
	// maybe look at next non-* selector and check it it has any children/desc?
	function find(m, ctx) {
		var name, val, mat, par, tidx, res;

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

					var n = ctx.node;
					var tag = n.tagName;
					tidx = n.idx;
					par = n.parentNode;
					var len = par ? par.childNodes.length : 1;
					var tsibs = (void 0);

					switch (name) {
						case 'not':
							res = !find(val, {node: ctx.node, idx: val.length - 1});
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
							{ break; }
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
						{ res = false; }
					break;
				case '+':
					ctx.idx--;
					par = ctx.node.parentNode;
					if (par != null && ctx.node.idx > 0) {
						ctx.node = par.childNodes[ctx.node.idx - 1];
						res = find(m, ctx);
					}
					else
						{ res = false; }
					break;
				case '~':
					ctx.idx--;
					res = false;
					tidx = ctx.node.idx;
					par = ctx.node.parentNode;
					if (par != null && tidx > 0) {
						for (var i = 0; i < tidx && !res; i++) {
							ctx.node = par.childNodes[i];
							res = find(m, ctx);
						}
					}
					break;
			}

			if (!res)
				{ break; }
		}

		return res;
	}

	function some(nodes, m) {
		return nodes.some(function (node) { return find(m, {
			idx: m.length - 1,
			node: node
		}); });
	}

	var _export_some_ = function (nodes, sel) {
		return some(nodes, Array.isArray(sel) ? sel : parse$1(sel));
	};

	var ATTRIBUTES = /\[([\w-]+)(?:(.?=)"?([^\]]*?)"?)?\]/i;

	var pseudoAssertable = /:(?:first|last|nth|only|not)\b/;		// |lang

	function stripNonAssertablePseudos(sel) {
		// strip pseudo-elements and transient pseudo-classes
		return sel.replace(new RegExp(':?:[a-z-]+', 'gm'), function (m) { return sel.startsWith('::') || !pseudoAssertable.test(m) ? '' : m; }
		)
		// remove any empty leftovers eg :not() - [tabindex="-1"]:focus:not(:focus-visible)
		.replace(new RegExp(':[a-z-]+\\(\\)', 'gm'), '');
	}

	function splice(str, index, count, add) {
		return str.slice(0, index) + add + str.slice(index + count);
	}

	function removeBackwards(css, defs, used, shouldDrop, type) {
		type = type || '';

		for (var i = defs.length - 1; i > -1; i--) {
			var d = defs[i];

			if (!used.has(d[2]) && shouldDrop(type + d[2]) === true)
				{ css = splice(css, d[0], d[1], ''); }
		}

		return css;
	}

	function dropKeyFrames(css, shouldDrop) {
		var defs = [];
		var used = new Set();

		// defined
		var RE = new RegExp('@(?:-\\w+-)?keyframes\\s+([\\w-]+)\\s*\\{', 'gm'), m;

		while (m = RE.exec(css)) {
			var ch = takeUntilMatchedClosing(css, RE.lastIndex, '{', '}');
			defs.push([m.index, m[0].length + ch.length + 1, m[1]]);
		}

		// used
		var RE2 = new RegExp('animation(?:-name)?:([^;!}]+)', 'gm');

		while (m = RE2.exec(css)) {
			m[1].trim().split(",").forEach(function (a) {
				a = a.trim();

				var keyFramesName = a.match(/^\S+/)[0];

				if (/^-?[\d.]+m?s/.test(keyFramesName))
					{ keyFramesName = a.match(/\S+$/)[0]; }

				used.add(keyFramesName);
			});
		}

		return removeBackwards(css, defs, used, shouldDrop, '@keyframes ');
	}

	function dropFontFaces(css, shouldDrop) {
		var defs = [];
		var used = new Set();

		// defined
		var RE = new RegExp('@font-face[\\s\\S]+?font-family:\\s*([\'"\\w-]+)[^}]+\\}', 'gm'), m;

		while (m = RE.exec(css)) {
			var clean = m[1].replace(new RegExp('[\'"]', 'gm'), '');
			defs.push([m.index, m[0].length, clean]);
		}

		// used
		var RE2 = new RegExp('font-family:([^;!}]+)', 'gm');

		while (m = RE2.exec(css)) {
			var inDef = defs.some(function (d) { return m.index > d[0] && m.index < d[0] + d[1]; });

			if (!inDef) {
				m[1].trim().split(",").forEach(function (a) {
					used.add(a.trim().replace(new RegExp('[\'"]', 'gm'), ''));
				});
			}
		}

		return removeBackwards(css, defs, used, shouldDrop, '@font-face ');
	}

	var drop = function (sel) { return true; };

	function dropcss(opts) {

		// {nodes, tag, class, id}
		var H = _export_parse_(opts.html, !opts.keepText);

		var shouldDrop = opts.shouldDrop || drop;

		var tokens = parse(opts.css);

		// cache
		var tested = {};

		// null out tokens that have any unmatched sub-selectors in flat dom
		for (var i = 0; i < tokens.length; i++) {
			var token = tokens[i];

			if (token !== SELECTORS)
				{ continue; }

			var sels = tokens[i+1];
			var sels2 = sels[sels.length - 1];

			i++;

			for (var j = 0; j < sels2.length; j++) {
				var subs = sels2[j];

				subsLoop:
				for (var k = 0; k < subs.length; k++) {
					var sub = subs[k];
					var hasOne = false;
					var name = (void 0);

					if (sub == '')
						{ continue; }

					// cache
					if (sub in tested)
						{ hasOne = tested[sub]; }
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
									{ tested[sub] = hasOne = H.attr.has(sub); }
								else {
									var m = sub.match(ATTRIBUTES);
									tested[sub] = hasOne = H.nodes.some(function (el) { return matchesAttr(el, m[1], m[3], m[2]); });
								}
								break;
							default:
								tested[sub] = hasOne = H.tag.has(sub);
						}
					}

					if (!hasOne) {
						if (shouldDrop(sels[j]) === true)
							{ sels[j] = null; }
						else
							{ tested[sels[j]] = true; }			// should this be pseudo-stripped?

						break subsLoop;
					}
				}
			}
		}

		for (var i$1 = 0; i$1 < tokens.length; i$1++) {
			var tok = tokens[i$1];

			if (tok === SELECTORS) {
				i$1++;
				var len = tokens[i$1].length;
				tokens[i$1] = tokens[i$1].filter(function (s) {
					if (typeof s == 'string') {
						if (s in tested)
							{ return tested[s]; }

						var cleaned = stripNonAssertablePseudos(s);

						if (cleaned == '')
							{ return true; }

						if (cleaned in tested)
							{ return tested[cleaned]; }

						return tested[cleaned] = (_export_some_(H.nodes, cleaned) || shouldDrop(s) !== true);
					}

					return false;
				});
			}
		}

		var out = generate(tokens);

		out = dropKeyFrames(out, shouldDrop);

		out = dropFontFaces(out, shouldDrop);

	//	log.forEach(e => console.log(e[0], e[1]));

		return {
			css: stripEmptyAts(out)
		};
	}

	return dropcss;

}));
