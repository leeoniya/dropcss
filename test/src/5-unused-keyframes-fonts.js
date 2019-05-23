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
	});
});