const dropcss = require('../../src/dropcss.js');
const assert = require('assert');

describe('Unused @keyframes and @font-face', () => {
	let html;
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

	describe('@keyframes', () => {
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

//	describe('@font-face', () => {});
});