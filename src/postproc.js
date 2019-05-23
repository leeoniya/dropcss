const { LOGGING } = require('./env');
const { takeUntilMatchedClosing } = require('./css');

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

const CUSTOM_PROP_DEF = /(--[\w-]+)\s*:\s*([^;}]+)\s*/gm;
const CUSTOM_PROP_USE = /var\(([\w-]+)\)/gm;

function resolveCustomProps(css) {
	let defs = {}, m;

	// while var(--*) patterns exist
	while (CUSTOM_PROP_USE.test(css)) {
		// get all defs
		while (m = CUSTOM_PROP_DEF.exec(css))
			defs[m[1]] = m[2];

		// replace any non-composites
		css = css.replace(CUSTOM_PROP_USE, (m0, m1) => !CUSTOM_PROP_USE.test(defs[m1]) ? defs[m1] : m0);
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

function cleanFontFam(fontFam) {
	return fontFam.trim().replace(/'|"/gm, '').split(/\s*,\s*/);
}

function dropFontFaces(css, shouldDrop) {
	// defined
	let gm = 'gm',
		re00 = '@font-face[^}]+\\}+',
		RE00 = RegExp(re00, gm),
		m;

	// get all @font-face blocks in original css
	let defs = [];

	while (m = RE00.exec(css))
		defs.push([m.index, m[0].length]);

	// flatten & remove custom props to ensure no accidental
	// collisions for regexes, e.g. --font-family:
	let tcss = resolveCustomProps(css).replace(CUSTOM_PROP_DEF, '');

	let re01 = 'font-family:([^;!}]+)',
		RE01 = RegExp(re01, gm),
		m2, i = 0;

	// get all @font-face blocks in resolved css
	while (m = RE00.exec(tcss)) {
		m2 = RE01.exec(m[0]);
		defs[i++].push(cleanFontFam(m2[1])[0]);
	}

	// used
	let used = new Set();

	let RE02 = RegExp(re00 + '|' + re01, gm);

	while (m = RE02.exec(tcss)) {
		if (m[0][0] !== '@')
			cleanFontFam(m[1]).forEach(a => used.add(a));
	}

	let RE03 = /font:([^;!}]+)/gm;
	let RE04 = /\s*(?:['"][\w- ]+['"]|[\w-]+)\s*(?:,|$)/gm;
	let t;

	while (m = RE03.exec(tcss)) {
		t = '';
		while (m2 = RE04.exec(m[1]))
			t += m2[0];

		cleanFontFam(t).forEach(a => used.add(a));
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