const { takeUntilMatchedClosing } = require('./css');

const LOGGING = false;

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

function resolveCustomProps(css) {
	let RE = /(--[\w-]+)\s*:\s*([^;]+)\s*/gm,
		RE2 = /var\(([\w-]+)\)/gm;

	let defs = {}, m;

	// while var(--*) patterns exist
	while (RE2.test(css)) {
		// get all defs
		while (m = RE.exec(css))
			defs[m[1]] = m[2];

		// replace any non-composites
		css = css.replace(RE2, (m0, m1) => !RE2.test(defs[m1]) ? defs[m1] : m0);
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

	let css2 = resolveCustomProps(css);

	// used
	let RE2 = /animation(?:-name)?:([^;!}]+)/gm;

	while (m = RE2.exec(css2)) {
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
	let RE = /@font-face[\s\S]+?font-family:\s*['"]?([\w- ]+)['"]?[^}]+\}/gm, m;

	while (m = RE.exec(css))
		defs.push([m.index, m[0].length, m[1]]);

	let css2 = resolveCustomProps(css);

	// used
	let RE2 = /font-family:([^;!}]+)/gm;

	while (m = RE2.exec(css2)) {
		let inDef = defs.some(d => m.index > d[0] && m.index < d[0] + d[1]);

		if (!inDef) {
			m[1].trim().split(",").forEach(a => {
				used.add(a.trim().replace(/['"]/gm, ''));
			});
		}
	}

	let RE3 = /font:([^;!}]+)/gm;

	while (m = RE3.exec(css2)) {
		m[1].trim().split(",").forEach(a => {
			used.add(a.trim().match(/\s*['"]?([\w- ]+)['"]?$/)[1]);
		});
	}

	return removeBackwards(css, defs, used, shouldDrop, '@font-face ');
}

function postProc(out, shouldDrop, log, START) {
	out = dropKeyFrames(out, shouldDrop);

	LOGGING && log.push([+new Date() - START, 'Drop unused @keyframes']);

	out = dropFontFaces(out, shouldDrop);

	LOGGING && log.push([+new Date() - START, 'Drop unused @font-face']);

	return out;
}

exports.postProc = postProc;
exports.LOGGING = LOGGING;