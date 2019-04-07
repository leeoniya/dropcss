/**
* Copyright (c) 2019, Leon Sorokin
* All rights reserved. (MIT Licensed)
*
* dropcss.js (DropCSS)
* An exceptionally fast, thorough and tiny unused-CSS cleaner
* https://github.com/leeoniya/dropcss (v0.5.0-dev)
*/

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global = global || self, global.dropcss = factory());
}(this, function () { 'use strict';

	var TAG_OPEN = 1;
	var ATTRS = 2;
	var TEXT = 3;
	var TAG_CLOSE = 4;

	function tokenize(html, keepText) {
		var RE = {
			// TODO: handle self-closed tags <div/> ?
			TAG_HEAD: /\s*<([a-z0-9_-]+)(?:\s+([^>]*))?>\s*/my,
			TAG_TEXT: /\s*[^<]*/my,
			TAG_CLOSE: /\s*<\/[a-z0-9_-]+>\s*/my,
		};

		var RE_ATTRS = /([\w-]+)(?:="([^"]*)"|='([^']*)'|=(\S+))?/gm;

		var pos = 0, m, tokens = [];

		function syncPos(re) {
			pos = re.lastIndex;
			for (var k in RE)
				{ RE[k].lastIndex = pos; }
		}

		var voidTags = {
			area: true,
			base: true,
			br: true,
			col: true,
			command: true,
			embed: true,
			hr: true,
			img: true,
			input: true,
			keygen: true,
			link: true,
			meta: true,
			param: true,
			source: true,
			track: true,
			wbr: true
		};

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

				if (tag in voidTags)
					{ tokens.push(TAG_CLOSE); }

				return;
			}

			m = RE.TAG_TEXT.exec(html);

			if (m != null) {
				syncPos(RE.TAG_TEXT);

				if (keepText)
					{ tokens.push(TEXT, m[0]); }
			}
		}

		while (pos < html.length)
			{ next(); }

		return tokens;
	}

	var EMPTY_SET = new Set();

	// TODO: lazy attrs, classList. then test tagNames first to reduce chance of triggering getters
	function node(parent, tagName, attrs) {
		var isText = tagName == '#';

		return {
			tagName: tagName,
			attributes: attrs,
			classList: !isText && attrs != null && attrs.has('class') ? new Set(attrs.get('class').split(/\s+/g)) : EMPTY_SET,
			parentNode: parent,
			childNodes: isText ? null : [],
		};
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
				case TEXT:
					var n = node(targ, '#', EMPTY_SET);
					targ.childNodes.push(n);
					each(n, targ.childNodes.length - 1);
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

	var parse = function (html, pruneText) {
		// remove doctype, comments, meta, style, link & script tags. TODO: CDATA
		html = html.replace(/<!doctype[^>]*>|<!--[\s\S]*?-->|<script[^>]*>[\s\S]*?<\/script>|<style[^>]*>[\s\S]*?<\/style>|<link[^>]*>|<meta[^>]*>/gmi, '');

		var tokens = tokenize(html, !pruneText);

		var ctx = {
			nodes: [],
			tag: new Set(["*"]),
			class: new Set(),
			attr: new Set(),
		};

		var tree = build(tokens, function (node, idx) { return postProc(node, idx, ctx); });

		return ctx;
	};

	var html = {
		parse: parse
	};

	var COMMENTS = /\s*\/\*[\s\S]*?\*\/\s*/gm;
	var COMBINATORS = /\s*[>~+]\s*|\s+/g;

	var START_AT = 1;
	var CLOSE_AT = 2;
	var SELECTORS = 3;
	var PROPERTIES = 4;
	var AT_CHUNK = 5;		// for @ blocks that should not be processed
	//const COMMENT;

	// selsStr e.g. "table > a, foo.bar"
	function quickSels(selsStr) {
		// -> ["table > a", "foo.bar"]
		var selsArr = selsStr.split(/\s*,\s*/gm);

		// -> ["table > a", "foo.bar", [["table", "a"], ["foo", ".bar"]]]
		selsArr.push(selsArr.map(function (sel) {
			return stripAllPseudos(sel).trim()
			// for quick checks we can actually split input[type=month] into "input [type=month]" and
			// .foo.bar#moo into ".foo .bar #moo". this way each can be quick-checked without context
			.replace(/(\.|#|\[)/gm, ' $1').replace(/\]/gm, '] ').trim()
			.split(COMBINATORS);
		}));

		return selsArr;
	}

	function stripAllPseudos(sel) {
		return sel.replace(/:?:[a-z-]+(?:\([^()]+\))?/gm, '');
	}

	function tokenize$1(css) {
		// TODO: dry out with selector regexes?
		var RE = {
			RULE_HEAD:	/\s*([^{;]+?)\s*[{;]\s*/my,
			RULE_TAIL:	/\s*([^}]*?)\s*\}/my,
			AT_TAIL:	/\s*\}/my,
			RULE_FULL:	/\s*([^{]*?)\{([^}]+?)\}/my,
		//	COMMENT:	/\s*\/\*.*?\*\/\s*/my,
		};

		var inAt = 0;

		var pos = 0, m, tokens = [];

		function syncPos(re) {
			pos = re.lastIndex;
			for (var k in RE)
				{ RE[k].lastIndex = pos; }
		}

		// pos must already be past opening {
		function takeUntilMatchedClosing() {
			var chunk = '';
			var unclosed = 1;

			while (1) {
				if (css[pos] == '{')
					{ unclosed++; }
				else if (css[pos] == '}')
					{ unclosed--; }

				if (unclosed == 0)
					{ break; }

				chunk += css[pos++];
			}

			syncPos({lastIndex: pos});

			return chunk;
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
							var chunk = takeUntilMatchedClosing();
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

	function parse$1(css) {
		// strip comments (for now)
		css = css.replace(COMMENTS, '');
		return tokenize$1(css);
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
		return out.replace(/@[a-z-]+\s+[^{]+\{\s*\}/gm, '');
	}

	var parse_1 = parse$1;
	var generate_1 = generate;
	var SELECTORS_1 = SELECTORS;

	var css = {
		parse: parse_1,
		generate: generate_1,
		SELECTORS: SELECTORS_1
	};

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

	var nth_1 = nth;

	function matchesType(el, name) {
		return name == el.tagName || name == '*';
	}

	function matchesAttr(el, name, value, matcher) {
		matcher = matcher || '=';

		var attrs = el.attributes;

		if (attrs.has(name)) {
			var v = attrs.get(name);

			switch (matcher) {
				case '=': return value == null || value == v;
				case '*=': return v.indexOf(value) != -1;
				case '^=': return v.startsWith(value);
				case '$=': return v.endsWith(value);
			}
		}

		return false;
	}

	function matchesClass(el, name) {
		return el.classList.has(name);
	}

	var type = matchesType;
	var class_1 = matchesClass;
	var attr = matchesAttr;
	var nthChild = nth_1;

	var matches = {
		type: type,
		class: class_1,
		attr: attr,
		nthChild: nthChild
	};

	// assumes stripPseudos(sel); has already been called
	function parse$2(sel) {
		var RE = {
			IDENT:	/([\w*-]+)/iy,
			ATTR:	/([\w-]+)(?:(.?=)"?([^\]]*?)"?)?\]/iy,
			PSEUDO:	/([\w-]+)(?:\(([^)]*)\))?/iy,
			MODE:	/\s*[:.#\[]\s*/iy,
			COMB:	/\s*[>~+]\s*|\s+/iy
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
					toks.splice(
						lastComb + 1,
						0,
						m[2] != null && m[1] == 'not' ? parse$2(m[2]) : m[2],
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

	function some(nodes, m) {
		return nodes.some(function (node) { return find(m, {
			idx: m.length - 1,
			node: node
		}); });
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

	// DRYed out nth-child/nth-last-child logic
	function _nthChild(pos, val) {
		if (val == 'odd')
			{ res = pos % 2 == 1; }
		else if (val == 'even')
			{ res = pos % 2 == 0; }
		// nth-child(5)
		else if (/^\d+$/.test(val))
			{ res = pos == +val; }
		// :nth-child(An+B)
		else {
			var nth = parseNth(val);
			res = matches.nthChild(nth[0], nth[1], pos);
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
					res		= matches.type(ctx.node, name);
					ctx.idx--;
					break;
				case '#':
					val		= m[--ctx.idx];
					res		= matches.attr(ctx.node, 'id', val, '=');
					ctx.idx--;
					break;
				case '.':
					name	= m[--ctx.idx];
					res		= matches.class(ctx.node, name);
					ctx.idx--;
					break;
				case '[':
					name	= m[--ctx.idx];
					mat		= m[--ctx.idx];
					val		= m[--ctx.idx];
					res		= matches.attr(ctx.node, name, val, mat);
					ctx.idx--;
					break;
				case ':':
					name	= m[--ctx.idx];
					val		= m[--ctx.idx];

					var n = ctx.node;
					tidx = n.idx;
					par = n.parentNode;
					var len = par ? par.childNodes.length : 1;

					switch (name) {
						case 'not':
							res = !find(val, {node: ctx.node, idx: val.length - 1});
							break;
						case 'empty':
							res = n.tagName != '#' && n.childNodes.length == 0;
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
							res = _nthChild(tidx + 1, val);
							break;
						case 'nth-last-child':
							res = _nthChild(len - tidx, val);
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

	var parse_1$1 = parse$2;
	var some_1 = function (nodes, sel) {
		return some(nodes, Array.isArray(sel) ? sel : parse$2(sel));
	};

	var sel = {
		parse: parse_1$1,
		some: some_1
	};

	var parseHTML = html.parse;
	var parseCSS = css.parse;
	var generateCSS = css.generate;
	var SELECTORS$1 = css.SELECTORS;
	var some$1 = sel.some;


	var ATTRIBUTES = /\[([\w-]+)(?:(.?=)"?([^\]]*?)"?)?\]/i;

	var pseudoAssertable = /:(?:first|last|nth|only|not|empty)\b/;		// |lang

	function stripNonAssertablePseudos(sel) {
		// strip pseudo-elements and transient pseudo-classes
		return sel.replace(/:?:[a-z-]+/gm, function (m) { return sel.startsWith('::') || !pseudoAssertable.test(m) ? '' : m; }
		)
		// remove any empty leftovers eg :not() - [tabindex="-1"]:focus:not(:focus-visible)
		.replace(/:[a-z-]+\(\)/gm, '');
	}

	var drop = function (sel) { return false; };

	function dropcss(opts) {

		// {nodes, tag, class, id}
		var H = parseHTML(opts.html, !opts.keepText);

		var shouldKeep = opts.shouldKeep || drop;

		var tokens = parseCSS(opts.css);

		// cache
		var tested = {};

		// null out tokens that have any unmatched sub-selectors in flat dom
		for (var i = 0; i < tokens.length; i++) {
			var token = tokens[i];

			if (token !== SELECTORS$1)
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
									tested[sub] = hasOne = H.nodes.some(function (el) { return matches.attr(el, m[1], m[3], m[2]); });
								}
								break;
							default:
								tested[sub] = hasOne = H.tag.has(sub);
						}
					}

					if (!hasOne) {
						if (shouldKeep(sels[j]) !== true)
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

			if (tok === SELECTORS$1) {
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

						return tested[cleaned] = (some$1(H.nodes, cleaned) || shouldKeep(s) === true);
					}

					return false;
				});
			}
		}

		var out = generateCSS(tokens);

	//	log.forEach(e => console.log(e[0], e[1]));

		return {
			css: out
		};
	}

	var dropcss_1 = dropcss;

	return dropcss_1;

}));
