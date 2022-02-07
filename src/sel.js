import { takeUntilMatchedClosing } from './css';
import { parseErr } from './err';

const pseudoClasses = /not|is/

// assumes stripPseudos(sel); has already been called
export function parse(sel) {
	const RE = {
		IDENT:	/([\w*-]+)/iy,
		ATTR:	/([\w-]+)(?:(.?=)["']?([^\]]*?)["']?)?\]/iy,
		PSEUDO: /([\w-]+)(\()?/iy,
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
			lastComb = toks.length - 1;
		}
		else if (m = RE.MODE.exec(sel)) {
			matched = true;

			let mode = m[0].trim();

			setIdx(RE.MODE);

			if (mode == ':') {
				m = RE.PSEUDO.exec(sel);

				if (m[2] == '(') {
					let subsel = takeUntilMatchedClosing(sel, RE.PSEUDO.lastIndex, '(', ')');
					RE.PSEUDO.lastIndex += subsel.length + 1;
					m[2] = pseudoClasses.test(m[1]) ? parse(subsel) : subsel;
				}

				toks.splice(
					lastComb + 1,
					0,
					m[2],
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

	let prevPos = idx;

	while (idx < sel.length) {
		next();

		if (prevPos === idx)
			parseErr('sel', sel, idx);

		prevPos = idx;
	}

	return toks;
}

const RE_NTH = /^([+-]?\d*)?n([+-]\d+)?$/;

export function parseNth(expr) {
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
