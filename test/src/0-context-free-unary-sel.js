const dropcss = require('../../src/dropcss.js');
const assert = require('assert');

describe('Context-free, unary selector', () => {
	let html, css;

	describe('*', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div></div>',
				css:	'* {}',
			});
			assert.equal(out, '*{}');
		});
	});

	describe('<tag>', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div></div>',
				css:	'div {}',
			});
			assert.equal(out, 'div{}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div></div>',
				css:	'span {}',
			});
			assert.equal(out, '');
		});
	});

	describe('#id', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div id="a"></div>',
				css:	'#a {}',
			});
			assert.equal(out, '#a{}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div id="a"></div>',
				css:	'#b {}',
			});
			assert.equal(out, '');
		});
	});

	describe('.class', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div class="a"></div>',
				css:	'.a {}',
			});
			assert.equal(out, '.a{}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div class="a"></div>',
				css:	'.b {}',
			});
			assert.equal(out, '');
		});
	});

	describe('[attr]', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div foo></div>',
				css:	'[foo] {}',
			});
			assert.equal(out, '[foo]{}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div foo></div>',
				css:	'[bar] {}',
			});
			assert.equal(out, '');
		});
	});

	// todo: test [foo="val"], [foo='val']
	describe('[attr=value]', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	'[foo=bar] {}',
			});
			assert.equal(out, '[foo=bar]{}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	'[foo=cow] {}',
			});
			assert.equal(out, '');
		});
	});

	describe('[attr*=value]', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	'[foo*=a] {}',
			});
			assert.equal(out, '[foo*=a]{}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	'[foo*=c] {}',
			});
			assert.equal(out, '');
		});
	});

	describe('[attr^=value]', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	'[foo^=b] {}',
			});
			assert.equal(out, '[foo^=b]{}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	'[foo^=c] {}',
			});
			assert.equal(out, '');
		});
	});

	describe('[attr$=value]', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	'[foo$=r] {}',
			});
			assert.equal(out, '[foo$=r]{}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	'[foo$=z] {}',
			});
			assert.equal(out, '');
		});
	});

	describe(':not(<tag>)', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div></div>',
				css:	':not(span) {}',
			});
			assert.equal(out, ':not(span){}')
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div></div>',
				css:	':not(div) {}',
			});
			assert.equal(out, '');;
		});
	});

	describe(':not(#id)', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div id="a"></div>',
				css:	':not(#b) {}',
			});
			assert.equal(out, ':not(#b){}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div id="a"></div>',
				css:	':not(#a) {}',
			});
			assert.equal(out, '');
		});
	});

	describe(':not(.class)', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div class="a"></div>',
				css:	':not(.b) {}',
			});
			assert.equal(out, ':not(.b){}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div class="a"></div>',
				css:	':not(.a) {}',
			});
			assert.equal(out, '');
		});
	});

	describe(':not([attr])', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div foo></div>',
				css:	':not([bar]) {}',
			});
			assert.equal(out, ':not([bar]){}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div foo></div>',
				css:	':not([foo]) {}',
			});
			assert.equal(out, '');
		});
	});

	// todo: test [foo="val"], [foo='val']
	describe(':not([attr=value])', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	':not([foo=cow]) {}',
			});
			assert.equal(out, ':not([foo=cow]){}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	':not([foo=bar]) {}',
			});
			assert.equal(out, '');
		});
	});

	describe(':not([attr*=value])', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	':not([foo*=c]) {}',
			});
			assert.equal(out, ':not([foo*=c]){}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	':not([foo*=a]) {}',
			});
			assert.equal(out, '');
		});
	});

	describe(':not([attr^=value])', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	':not([foo^=c]) {}',
			});
			assert.equal(out, ':not([foo^=c]){}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	':not([foo^=b]) {}',
			});
			assert.equal(out, '');
		});
	});

	describe(':not([attr$=value])', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	':not([foo$=z]) {}',
			});
			assert.equal(out, ':not([foo$=z]){}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	':not([foo$=r]) {}',
			});
			assert.equal(out, '');
		});
	});

	// *-child assertions dont make to test in a unary selector since all root elements will be first/last/only "children"
});
