const dropcss = require('../../src/dropcss.js');
const assert = require('assert');

describe('Context-aware, unary selector', () => {
	let html, css;

	describe(' ', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div><span><a></a></span></div>',
				css:	'div a {}',
			});
			assert.equal(out, 'div a{}');
		});

		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div><span><a></a></span></div>',
				css:	'span a {}',
			});
			assert.equal(out, 'span a{}');
		});

		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div><span><a></a></span></div>',
				css:	'div span a {}',
			});
			assert.equal(out, 'div span a{}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div><span><a></a></span></div>',
				css:	'span div {}',
			});
			assert.equal(out, '');
		});
	});

	describe('>', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div><span><a></a></span></div>',
				css:	'div > span {}',
			});
			assert.equal(out, 'div > span{}');
		});

		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div><span><a></a></span></div>',
				css:	'span > a {}',
			});
			assert.equal(out, 'span > a{}');
		});

		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div><span><a></a></span></div>',
				css:	'div > span > a {}',
			});
			assert.equal(out, 'div > span > a{}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div><span><a></a></span></div>',
				css:	'div > a {}',
			});
			assert.equal(out, '');
		});
	});

	describe('+', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div><span></span><a></a></div>',
				css:	'span + a {}',
			});
			assert.equal(out, 'span + a{}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div><span></span><a></a></div>',
				css:	'a + span {}',
			});
			assert.equal(out, '');
		});
	});

	describe('~', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div><i></i><span></span><a></a></div>',
				css:	'i ~ a {}',
			});
			assert.equal(out, 'i ~ a{}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div><i></i><span></span><a></a></div>',
				css:	'a ~ i {}',
			});
			assert.equal(out, '');
		});
	});

	describe(':nth-child()', () => {
		it('should retain "odd"', function() {
			let {css: out} = dropcss({
				html:	'<div><span></span></div>',
				css:	'span:nth-child(odd) {}',
			});
			assert.equal(out, 'span:nth-child(odd){}');
		});

		it('should retain "2n+1"', function() {
			let {css: out} = dropcss({
				html:	'<div><span></span></div>',
				css:	'span:nth-child(2n+1) {}',
			});
			assert.equal(out, 'span:nth-child(2n+1){}');
		});

		it('should retain "1"', function() {
			let {css: out} = dropcss({
				html:	'<div><span></span><i></i></div>',
				css:	'span:nth-child(1) {}',
			});
			assert.equal(out, 'span:nth-child(1){}');
		});

		it('should drop "even"', function() {
			let {css: out} = dropcss({
				html:	'<div><span></span></div>',
				css:	'span:nth-child(even) {}',
			});
			assert.equal(out, '');
		});

		it('should drop "2"', function() {
			let {css: out} = dropcss({
				html:	'<div><span></span><i></i></div>',
				css:	'span:nth-child(2) {}',
			});
			assert.equal(out, '');
		});
	});

	describe(':nth-last-child()', () => {
		it('should retain "2n+1"', function() {
			let {css: out} = dropcss({
				html:	'<div><span></span></div>',
				css:	'span:nth-last-child(2n+1) {}',
			});
			assert.equal(out, 'span:nth-last-child(2n+1){}');
		});
	});

	describe(':first-child', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div><span></span><a></a></div>',
				css:	'span:first-child {}',
			});
			assert.equal(out, 'span:first-child{}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div><span></span><a></a></div>',
				css:	'a:first-child {}',
			});
			assert.equal(out, '');
		});
	});

	describe(':only-child', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div><span></span></div>',
				css:	'span:only-child {}',
			});
			assert.equal(out, 'span:only-child{}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div><span></span><span></span></div>',
				css:	'span:only-child {}',
			});
			assert.equal(out, '');
		});
	});
});