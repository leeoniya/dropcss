const nth = require('./nth');

function matchesType(el, name) {
	return name == el.tagName || name == '*';
}

function matchesAttr(el, name, value, matcher) {
	matcher = matcher || '=';

	let attrs = el.attributes;

	if (attrs.has(name)) {
		let v = attrs.get(name);

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

exports.type = matchesType;
exports.class = matchesClass;
exports.attr = matchesAttr;
exports.nthChild = nth;