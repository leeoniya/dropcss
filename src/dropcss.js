"use strict";

const { parse: parseHTML } = require('./html');
const { parse: parseCSS, generate: generateCSS, SELECTORS, takeUntilMatchedClosing, stripEmptyAts } = require('./css');
const { some, matchesAttr } = require('./find');

const ATTRIBUTES = /\[([\w-]+)(?:(.?=)"?([^\]]*?)"?)?\]/i;

const pseudoAssertable = /:(?:first|last|nth|only|not)\b/;		// |lang

function stripNonAssertablePseudos(sel) {
	// strip pseudo-elements and transient pseudo-classes
	return sel.replace(/:?:[a-z-]+/gm, (m) =>
		sel.startsWith('::') || !pseudoAssertable.test(m) ? '' : m
	)
	// remove any empty leftovers eg :not() - [tabindex="-1"]:focus:not(:focus-visible)
	.replace(/:[a-z-]+\(\)/gm, '');
}

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

function dropKeyFrames(css, shouldDrop) {
	let defs = [];
	let used = new Set();

	// defined
	let RE = /@(?:-\w+-)?keyframes\s+([\w-]+)\s*\{/gm, m;

	while (m = RE.exec(css)) {
		let ch = takeUntilMatchedClosing(css, RE.lastIndex, '{', '}');
		defs.push([m.index, m[0].length + ch.length + 1, m[1]]);
	}

	// used
	let RE2 = /animation(?:-name)?:([^;!}]+)/gm;

	while (m = RE2.exec(css)) {
		m[1].trim().split(",").forEach(a => {
			a = a.trim();

			let keyFramesName = a.match(/^\S+/)[0];

			if (/^-?[\d.]+m?s/.test(keyFramesName))
				keyFramesName = a.match(/\S+$/)[0];

			used.add(keyFramesName);
		});
	}

	return removeBackwards(css, defs, used, shouldDrop, '@keyframes ');
}

function dropFontFaces(css, shouldDrop) {
	let defs = [];
	let used = new Set();

	// defined
	let RE = /@font-face[\s\S]+?font-family:\s*(['"\w-]+)[^}]+\}/gm, m;

	while (m = RE.exec(css)) {
		let clean = m[1].replace(/['"]/gm, '');
		defs.push([m.index, m[0].length, clean]);
	}

	// used
	let RE2 = /font-family:([^;!}]+)/gm;

	while (m = RE2.exec(css)) {
		let inDef = defs.some(d => m.index > d[0] && m.index < d[0] + d[1]);

		if (!inDef) {
			m[1].trim().split(",").forEach(a => {
				used.add(a.trim().replace(/['"]/gm, ''));
			});
		}
	}

	return removeBackwards(css, defs, used, shouldDrop, '@font-face ');
}

const drop = sel => true;

function dropcss(opts) {
	let START = +new Date();

	let log = [[0, 'Start']];

	// {nodes, tag, class, id}
	const H = parseHTML(opts.html, !opts.keepText);

	log.push([+new Date() - START, 'HTML parsed & processed']);

	const shouldDrop = opts.shouldDrop || drop;

	let tokens = parseCSS(opts.css);

	log.push([+new Date() - START, 'CSS tokenized']);

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

	log.push([+new Date() - START, 'Context-free first pass']);

	for (let i = 0; i < tokens.length; i++) {
		let tok = tokens[i];

		if (tok === SELECTORS) {
			i++;
			let len = tokens[i].length;
			tokens[i] = tokens[i].filter(s => {
				if (typeof s == 'string') {
					if (s in tested)
						return tested[s];

					let cleaned = stripNonAssertablePseudos(s);

					if (cleaned == '')
						return true;

					if (cleaned in tested)
						return tested[cleaned];

					return tested[cleaned] = (some(H.nodes, cleaned) || shouldDrop(s) !== true);
				}

				return false;
			});
		}
	}

	log.push([+new Date() - START, 'Context-aware second pass']);

	let kept = new Set();

	let out = generateCSS(tokens, kept);

	log.push([+new Date() - START, 'Generate output']);

	out = dropKeyFrames(out, shouldDrop);

	log.push([+new Date() - START, 'Drop unused @keyframes']);

	out = dropFontFaces(out, shouldDrop);

	log.push([+new Date() - START, 'Drop unused @font-face']);

//	log.forEach(e => console.log(e[0], e[1]));

	return {
		css: stripEmptyAts(out),
		sels: kept,
	};
}

module.exports = dropcss;