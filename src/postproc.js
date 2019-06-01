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

const CUSTOM_PROP_DEF = /(--[\w-]+)\s*:\s*([^;}]+);?\s*/gm;
const CUSTOM_PROP_USE = /var\(([\w-]+)\)/gm;
const COMMA_SPACED = /\s*,\s*/gm;

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

function dropKeyFrames(css, flatCss, shouldDrop) {
	// defined
	let defs = [];

	let RE = /@(?:-\w+-)?keyframes\s+([\w-]+)\s*\{/gm, m;

	while (m = RE.exec(css)) {
		let ch = takeUntilMatchedClosing(css, RE.lastIndex, '{', '}');
		defs.push([m.index, m[0].length + ch.length + 1, m[1]]);
	}

	// used
	let used = new Set();

	let RE2 = /animation(?:-name)?:([^;!}]+)/gm;

	while (m = RE2.exec(flatCss)) {
		m[1].trim().split(COMMA_SPACED).forEach(a => {
			let keyFramesName = a.match(/^\S+/)[0];

			if (/^-?[\d.]+m?s/.test(keyFramesName))
				keyFramesName = a.match(/\S+$/)[0];

			used.add(keyFramesName);
		});
	}

	return removeBackwards(css, defs, used, shouldDrop, '@keyframes ');
}

function cleanFontFam(fontFam) {
	return fontFam.trim().replace(/'|"/gm, '').split(COMMA_SPACED);
}

function dropFontFaces(css, flatCss, shouldDrop) {
	// defined
	let gm = 'gm',
		re00 = '@font-face[^}]+\\}+',
		RE00 = RegExp(re00, gm),
		m;

	// get all @font-face blocks in original css
	let defs = [];

	while (m = RE00.exec(css))
		defs.push([m.index, m[0].length]);

	let re01 = 'font-family:([^;!}]+)',
		RE01 = RegExp(re01),
		m2, i = 0;

	// get all @font-face blocks in resolved css
	while (m = RE00.exec(flatCss)) {
		m2 = RE01.exec(m[0]);
		defs[i++].push(cleanFontFam(m2[1])[0]);
	}

	// used
	let used = new Set();

	let RE02 = RegExp(re00 + '|' + re01, gm);

	while (m = RE02.exec(flatCss)) {
		if (m[0][0] !== '@')
			cleanFontFam(m[1]).forEach(a => used.add(a));
	}

	let RE03 = /font:([^;!}]+)/gm;
	let RE04 = /\s*(?:['"][\w- ]+['"]|[\w-]+)\s*(?:,|$)/gm;
	let t;

	while (m = RE03.exec(flatCss)) {
		t = '';
		while (m2 = RE04.exec(m[1]))
			t += m2[0];

		cleanFontFam(t).forEach(a => used.add(a));
	}

	return removeBackwards(css, defs, used, shouldDrop, '@font-face ');
}

function dropCssVars(css, shouldDrop) {
	let css2 = css;

	do {
		css = css2;
		css2 = css.replace(CUSTOM_PROP_DEF, (m, m1) => css.indexOf('var(' + m1 + ')') != -1 ? m : '');
	} while (css2 != css);

	return css2;
}

function postProc(out, shouldDrop, log, START) {
	// flatten & remove custom props to ensure no accidental
	// collisions for regexes, e.g. --animation-name: --font-face:
	// this is used for testing for "used" keyframes and fonts and
	// parsing resolved 'font-family:' names from @font-face defs,
	// so does not need to be regenerated during iterative purging
	let flatCss = resolveCustomProps(out).replace(CUSTOM_PROP_DEF, '');

	out = dropKeyFrames(out, flatCss, shouldDrop);

	LOGGING && log.push([+new Date() - START, 'Drop unused @keyframes']);

	out = dropFontFaces(out, flatCss, shouldDrop);

	LOGGING && log.push([+new Date() - START, 'Drop unused @font-face']);

	out = dropCssVars(out, shouldDrop);

	LOGGING && log.push([+new Date() - START, 'Drop unused --* props']);

	// kill any leftover empty blocks e.g. :root {}
	return out.replace(/[^{}]+\{\s*\}/gm, '');
}

exports.postProc = postProc;