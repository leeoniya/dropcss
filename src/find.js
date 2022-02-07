import { nth as isNth } from './nth';
import { getSibsOfType } from './html';
import { parse as parseSel, parseNth } from './sel';

function matchesType(el, name) {
	return name == el.tagName || name == '*';
}

export function matchesAttr(el, name, selVal, matcher) {
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
		let nth = parseNth(val);
		res = isNth(nth[0], nth[1], pos);
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
						res = !find(val, {node: ctx.node, idx: val.length - 1});
						break;
					case 'is':
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
					ctx.idx = tidx
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

export const some = (nodes, sel) => {
	return _some(nodes, Array.isArray(sel) ? sel : parseSel(sel));
};
