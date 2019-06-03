const dropcss = require('../../src/dropcss.js');
const assert = require('assert');

describe('Unused @keyframes and @font-face', () => {
	let html;

	describe('@keyframes', () => {
		let css = `
			div{color: red;}
			@keyframes pulse{0%{width:300%;}100%{width:100%;}}
			@-webkit-keyframes pulse{0%{width:300%;}100%{width:100%;}}
			@keyframes nudge{0%{width:300%;}100%{width:100%;}}
			@-webkit-keyframes nudge{0%{width:300%;}100%{width:100%;}}
			@keyframes bop{0%{width:300%;}100%{width:100%;}}
			@-webkit-keyframes bop{0%{width:300%;}100%{width: 100%;}}
			span{color: black;}
		`;

		it('should drop all', function() {
			let prepend = '';

			let {css: out} = dropcss({
				html:	'<div></div>',
				css:	prepend + css,
			});
			assert.equal(out, prepend + 'div{color: red;}');
		});

		it('should drop pulse, nudge', function() {
			let prepend = 'div{animation-name: bop;}';

			let {css: out} = dropcss({
				html:	'<div></div>',
				css:	prepend + css,
			});
			assert.equal(out, prepend + 'div{color: red;}@keyframes bop{0%{width:300%;}100%{width:100%;}}@-webkit-keyframes bop{0%{width:300%;}100%{width: 100%;}}');
		});

		it('should drop bop', function() {
			let prepend = 'div{animation: pulse 3s ease infinite alternate, nudge 5s linear infinite alternate;}';

			let {css: out} = dropcss({
				html:	'<div></div>',
				css:	prepend + css,
			});
			assert.equal(out, prepend + 'div{color: red;}@keyframes pulse{0%{width:300%;}100%{width:100%;}}@-webkit-keyframes pulse{0%{width:300%;}100%{width:100%;}}@keyframes nudge{0%{width:300%;}100%{width:100%;}}@-webkit-keyframes nudge{0%{width:300%;}100%{width:100%;}}');
		});

		it('should retain nudge', function() {
			let prepend = 'div{animation: foo 3s ease infinite alternate, nudge 5s linear infinite alternate;}';

			let {css: out} = dropcss({
				html:	'<div></div>',
				css:	prepend + css,
			});
			assert.equal(out, prepend + 'div{color: red;}@keyframes nudge{0%{width:300%;}100%{width:100%;}}@-webkit-keyframes nudge{0%{width:300%;}100%{width:100%;}}');
		});
	});

	describe('@font-face', () => {
		let css = "div{color: red;}@font-face{font-family: 'Open Sans';}span{color: black;}";
		let fontUse = "";

		it('should retain if used', function() {
			let prepend = "div{font-family: 'Open Sans', Fallback, sans-serif;}";

			let {css: out} = dropcss({
				html:	'<div></div>',
				css:	prepend + css,
			});
			assert.equal(out, prepend + "div{color: red;}@font-face{font-family: 'Open Sans';}");
		});

		it('should retain if used (shorthand)', function() {
			let prepend = "div{font: italic small-caps normal 13px Arial, 'Open Sans', Helvetica, sans-serif;}";

			let {css: out} = dropcss({
				html:	'<div></div>',
				css:	prepend + css,
			});
			assert.equal(out, prepend + "div{color: red;}@font-face{font-family: 'Open Sans';}");
		});

		it('should drop if unused', function() {
			let prepend = "";

			let {css: out} = dropcss({
				html:	'<div></div>',
				css:	prepend + css,
			});
			assert.equal(out, prepend + "div{color: red;}");
		});

		it('should drop if unused (multiple defs)', function() {
			let prepend = "@font-face{font-family:MuseoSans;}@font-face{font-family:MuseoSans;}";

			let {css: out} = dropcss({
				html:	'<div></div>',
				css:	prepend + css,
			});
			assert.equal(out, "div{color: red;}");
		});
	});

	describe('@font-face (custom props)', () => {
		let css = "div{color: red;}:root {--font-family: Foo, 'Bar Baz';}@font-face {font-family: Foo}";
		let fontUse = "";

		it('should drop if unused (--font-family: should not be confused with font use)', function() {
			let prepend = "";

			let {css: out} = dropcss({
				html:	'<div></div>',
				css:	prepend + css,
			});
			assert.equal(out, prepend + "div{color: red;}");
		});

		it('should retain if used in font-family:', function() {
			let prepend = "div{font-family: var(--font-family);}";

			let {css: out} = dropcss({
				html:	'<div></div>',
				css:	prepend + css,
			});
			assert.equal(out, prepend + "div{color: red;}:root{--font-family: Foo, 'Bar Baz';}@font-face{font-family: Foo}");
		});

		it('should retain if used (deep resolve)', function() {
			let css2 = [
				":root {--font: var(--sty) var(--wgt) 1em/var(--lht) var(--fam1), var(--fam2); --sty: italic; --wgt: bold; --lht: var(--hgt)em; --fam1: 'Open Sans'; --fam2: Arial; --hgt: 1.6;}",
				"@font-face {font-family: var(--fam1);}",
				"div {font: var(--font);}",
			].join("");

			let {css: out} = dropcss({
				html:	'<div></div>',
				css:	css2,
			});
			assert.equal(out, ":root{--font: var(--sty) var(--wgt) 1em/var(--lht) var(--fam1), var(--fam2); --sty: italic; --wgt: bold; --lht: var(--hgt)em; --fam1: 'Open Sans'; --fam2: Arial; --hgt: 1.6;}@font-face{font-family: var(--fam1);}div{font: var(--font);}");
		});

		it('should drop if unused (deep resolve)', function() {
			let css2 = [
				":root {--font: var(--sty) var(--wgt) 1em/var(--lht) var(--fam1), var(--fam2); --sty: italic; --wgt: bold; --lht: var(--hgt)em; --fam1: 'Open Sans'; --fam2: Arial; --hgt: 1.6;}",
				"@font-face {font-family: var(--fam1);}",
			//	"div {font: var(--font);}",
			].join("");

			let {css: out} = dropcss({
				html:	'<div></div>',
				css:	css2,
			});
			assert.equal(out, "");
		});
	});

	describe('custom props', () => {
		it('should not confuse BEM -- classes with custom props', function() {
			let css = ":root{--red: #f00;}.a--b:hover{color: var(--red);}.--c{width: 10px;}";

			let {css: out} = dropcss({
				html:	'<div class="a--b"></div><div class="--c"></div>',
				css:	css,
			});
			assert.equal(out, css);
		});
	});
});