const dropcss = require('../dist/dropcss.cjs.js');

// super mega-huge combined stylesheet
let css = `
	em {
		color: red;
	}

	p {
		font-weight: bold;
	}

	.foo {
		font-size: 10pt;
	}
`;

// html of page (or state) A
let htmlA = `
	<html>
		<head></head>
		<body>
			<em>Hello World!</em>
		</body>
	</html>
`;

// html of page (or state) B
let htmlB = `
	<html>
		<head></head>
		<body>
			<p>Soft Kitties!</p>
		</body>
	</html>
`;

// whitelist
let whitelist = new Set();

let resA = dropcss({
	css,
	html: htmlA,
});

// accumulate retained A selectors
resA.sels.forEach(sel => whitelist.add(sel));

let resB = dropcss({
	css,
	html: htmlB,
});

// accumulate retained B selectors
resB.sels.forEach(sel => whitelist.add(sel));

// final purge relying only on accumulated whitelist
let cleaned = dropcss({
	html: '',
	css,
	shouldDrop: sel => !whitelist.has(sel),
});

console.log(cleaned.css);