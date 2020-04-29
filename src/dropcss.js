"use strict";

const { parse: parseHTML } = require('./html');
const { parse: parseCSS, generate: generateCSS, SELECTORS, stripEmptyAts } = require('./css');
const { some, matchesAttr } = require('./find');
const { postProc } = require('./postproc');
const { LOGGING } = require('./env');

const ATTRIBUTES = /\[([\w-]+)(?:(.?=)"?([^\]]*?)"?)?\]/i;

const pseudoAssertable = /:(?:first|last|nth|only|not)\b/;		// |lang

function stripNonAssertablePseudos(sel) {
	// strip pseudo-elements and transient pseudo-classes
	return sel.replace(/:?:[a-z-]+/gm, (m) =>
		m.startsWith('::') || !pseudoAssertable.test(m) ? '' : m
	)
	// remove any empty leftovers eg :not() - [tabindex="-1"]:focus:not(:focus-visible)
	.replace(/:[a-z-]+\(\)/gm, '');
}

const retTrue = sel => true;

function dropcss(opts) {
	let log, START;

	if (LOGGING) {
		START = +new Date();
		log = [[0, 'Start']];
	}

	// {nodes, tag, class, id}
	const H = parseHTML(opts.html, !opts.keepText);

	LOGGING && log.push([+new Date() - START, 'HTML parsed & processed']);

	const shouldDrop = opts.shouldDrop || retTrue;
	const didRetain  = opts.didRetain  || retTrue;

	let tokens = parseCSS(opts.css);

	LOGGING && log.push([+new Date() - START, 'CSS tokenized']);

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

	LOGGING && log.push([+new Date() - START, 'Context-free first pass']);

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

	LOGGING && log.push([+new Date() - START, 'Context-aware second pass']);

	let out = generateCSS(tokens, didRetain);

	LOGGING && log.push([+new Date() - START, 'Generate output']);

	out = postProc(out, shouldDrop, log, START);

	LOGGING && log.forEach(e => console.log(e[0], e[1]));

	return {
		css: stripEmptyAts(out),
	};
}

module.exports = dropcss;