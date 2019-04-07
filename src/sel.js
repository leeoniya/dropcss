const matches = require('./matches');

// assumes stripPseudos(sel); has already been called
function parse(sel) {
	const RE = {
		IDENT:	/([\w*-]+)/iy,
		ATTR:	/([\w-]+)(?:(.?=)"?([^\]]*?)"?)?\]/iy,
		PSEUDO:	/([\w-]+)(?:\(([^)]*)\))?/iy,
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
			lastComb = idx;
		}
		else if (m = RE.MODE.exec(sel)) {
			matched = true;

			let mode = m[0].trim();

			setIdx(RE.MODE);

			if (mode == ':') {
				m = RE.PSEUDO.exec(sel);
				toks.splice(
					lastComb + 1,
					0,
					m[2] != null && m[1] == 'not' ? parse(m[2]) : m[2],
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

	while (idx < sel.length)
		next();

	return toks;
}

function some(nodes, m) {
	return nodes.some(node => find(m, {
		idx: m.length - 1,
		node
	}));
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

// DRYed out nth-child/nth-last-child logic
function _nthChild(pos, val) {
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
		res = matches.nthChild(nth[0], nth[1], pos);
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

				let n = ctx.node;
				tidx = n.idx;
				par = n.parentNode;
				let len = par ? par.childNodes.length : 1;

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

exports.parse = parse;
exports.some = (nodes, sel) => {
	return some(nodes, Array.isArray(sel) ? sel : parse(sel));
};