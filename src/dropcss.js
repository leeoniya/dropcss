const { parse } = require('node-html-parser');
const csstree = require('css-tree');
const CSSselect = require("css-select");
const adapter = require("./adapter");

// https://developer.mozilla.org/en-US/docs/Web/CSS/pseudo-classes
const pseudoClassNonTransient = /:(?:first|last|nth|only|not|empty)\b/;		// |lang

function dropcss(opts) {
	const htmlAst = parse(opts.html);

	const cssAst = csstree.parse(opts.css, {
		parseRulePrelude: false,
		parseValue: false,
		parseAtrulePrelude: false
	});

	const keep = opts.keep || (() => false);

	csstree.walk(cssAst, function(node, item, list) {
		if (node.type == "Rule") {
			var pre = [];

			// TOFIX: splitting on comma can break :is(p, a)/:matches()/:not(p, a)
			// https://developer.mozilla.org/en-US/docs/Web/CSS/:is
			node.prelude.value.split(",").forEach((sel) => {
				sel = sel.trim();

				// strip pseudo-elements and transient pseudo-classes
				let domSel = sel.replace(/:?:[a-z-]+/gm, (m) =>
					sel.startsWith('::') || !pseudoClassNonTransient.test(m) ? '' : m
				)
				// remove any empty leftovers eg :not() - [tabindex="-1"]:focus:not(:focus-visible)
				.replace(/:[a-z-]+\(\)/gm, '');

				if (domSel == '' || CSSselect.selectOne(domSel, htmlAst.childNodes, {adapter}) || keep(sel))
					pre.push(sel);
			});

			if (pre.length == 0)
				list.remove(item);
			else
				node.prelude.value = pre.join(", ");
		}
	});

	return (
		csstree.generate(cssAst)
		// hack to remove leftover/empty @media queries until i can figure out how to prune them from cssAst
		.replace(/@media\s*\([^\)]+\)\s*\{\}/gm, '')
	);
}

module.exports = dropcss;