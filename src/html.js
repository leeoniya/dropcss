const TAG_OPEN = 1;
const ATTRS = 2;
const TEXT = 3;
const TAG_CLOSE = 4;

const VOIDS = new Set("area base br col command embed hr img input keygen link meta param source track wbr".split(" "));

// doctype, comments, meta, style, link & script tags. TODO: CDATA
const NASTIES = /<!doctype[^>]*>|<!--[\s\S]*?-->|<script[^>]*>[\s\S]*?<\/script>|<style[^>]*>[\s\S]*?<\/style>|<link[^>]*>|<meta[^>]*>/gmi;
const RE_ATTRS = /([\w-]+)(?:="([^"]*)"|='([^']*)'|=(\S+))?/gm;
const RE = {
	// TODO: handle self-closed tags <div/> ?
	TAG_HEAD: /\s*<([a-z0-9_-]+)(?:\s+([^>]*))?>\s*/my,
	TAG_TEXT: /\s*[^<]*/my,
	TAG_CLOSE: /\s*<\/[a-z0-9_-]+>\s*/my,
};

function tokenize(html, keepText) {
	let pos = 0, m, tokens = [];

	function syncPos(re) {
		pos = re.lastIndex;
		for (let k in RE)
			RE[k].lastIndex = pos;
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
			let tag = m[1];
			tokens.push(TAG_OPEN, tag);

			let attrs = m[2];

			if (attrs != null) {
				let attrMap = new Map();
				let m2;
				while (m2 = RE_ATTRS.exec(attrs))
					attrMap.set(m2[1], (m2[2] || m2[3] || m2[4] || '').trim());
				tokens.push(ATTRS, attrMap);
			}

			if (VOIDS.has(tag))
				tokens.push(TAG_CLOSE);

			return;
		}

		m = RE.TAG_TEXT.exec(html);

		if (m != null) {
			syncPos(RE.TAG_TEXT);

			if (keepText)
				tokens.push(TEXT, m[0]);
		}
	}

	while (pos < html.length)
		next();

	syncPos({lastIndex: 0});

	return tokens;
}

const EMPTY_SET = new Set();

// TODO: lazy attrs, classList. then test tagNames first to reduce chance of triggering getters
function node(parent, tagName, attrs) {
	let isText = tagName == '#';

	return {
		tagName,
		attributes: attrs,
		classList: !isText && attrs != null && attrs.has('class') ? new Set(attrs.get('class').split(/\s+/g)) : EMPTY_SET,
		parentNode: parent,
		childNodes: isText ? null : [],
	};
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
			case TEXT:
				let n = node(targ, '#', EMPTY_SET);
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

exports.parse = (html, pruneText) => {
	html = html.replace(NASTIES, '');

	let tokens = tokenize(html, !pruneText);

	const ctx = {
		nodes: [],
		tag: new Set(["*"]),
		class: new Set(),
		attr: new Set(),
	};

	let tree = build(tokens, (node, idx) => postProc(node, idx, ctx));

	return ctx;
};