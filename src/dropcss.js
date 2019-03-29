const { parse, TextNode } = require('node-html-parser');
const CSSTree = require('css-tree');
const CSSselect = require("css-select");
const adapter = require("css-select-browser-adapter");

// https://developer.mozilla.org/en-US/docs/Web/CSS/pseudo-classes
const pseudoClassNonTransient = /:(?:first|last|nth|only|not|empty)\b/;		// |lang

const doDrop = sel => true;

// removes text nodes from HTML AST
function pruneText(node) {
	if (node.childNodes) {
		node.childNodes = node.childNodes.filter(ch => {
			if (ch instanceof TextNode)
				return false;

			pruneText(ch);
			return true;
		});
	}

	return node;
}

function dropcss(opts) {
	let htmlAst = parse(opts.html);

	if (!opts.keepText)
		pruneText(htmlAst);

	const cssAst = CSSTree.parse(opts.css, {
		parseRulePrelude: false,
		parseValue: false,
		parseAtrulePrelude: false
	});

	const shouldDrop = opts.shouldDrop || doDrop;

	CSSTree.walk(cssAst, {
		visit: 'Rule',
		enter: function(node, item, list) {
			let atRule = this.atrule;

			if (atRule != null && atRule.name != 'media')
				return;

			let pre = [];

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

				if (domSel == '' || CSSselect.selectOne(domSel, htmlAst.childNodes, {adapter}) || shouldDrop(sel) !== true)
					pre.push(sel);
			});

			if (pre.length == 0)
				list.remove(item);
			else
				node.prelude.value = pre.join(", ");
		}
	});

	let cleaned = CSSTree.generate(cssAst)
		// hack to remove leftover/empty @media queries until i can figure out how to prune them from cssAst
		.replace(/@media\s*\([^\)]+\)\s*\{\}/gm, '');

	return {
		css: cleaned
	};
}

module.exports = dropcss;