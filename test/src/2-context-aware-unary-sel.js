const dropcss = require('../../dist/dropcss.cjs.js');
const assert = require('assert');

describe('Context-aware, unary selector', () => {
	let html, css;

	describe(' ', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div><span><a></a></span></div>',
				css:	'div a {a:b;}',
			});
			assert.equal(out, 'div a{a:b;}');
		});

		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div><span><a></a></span></div>',
				css:	'span a {a:b;}',
			});
			assert.equal(out, 'span a{a:b;}');
		});

		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div><span><a></a></span></div>',
				css:	'div span a {a:b;}',
			});
			assert.equal(out, 'div span a{a:b;}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div><span><a></a></span></div>',
				css:	'span div {a:b;}',
			});
			assert.equal(out, '');
		});
	});

	describe('>', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div><span><a></a></span></div>',
				css:	'div > span {a:b;}',
			});
			assert.equal(out, 'div > span{a:b;}');
		});

		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div><span><a></a></span></div>',
				css:	'span > a {a:b;}',
			});
			assert.equal(out, 'span > a{a:b;}');
		});

		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div><span><a></a></span></div>',
				css:	'div > span > a {a:b;}',
			});
			assert.equal(out, 'div > span > a{a:b;}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div><span><a></a></span></div>',
				css:	'div > a {a:b;}',
			});
			assert.equal(out, '');
		});
	});

	describe('+', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div><span></span><a></a></div>',
				css:	'span + a {a:b;}',
			});
			assert.equal(out, 'span + a{a:b;}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div><span></span><a></a></div>',
				css:	'a + span {a:b;}',
			});
			assert.equal(out, '');
		});
	});

	describe('~', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div><i></i><span></span><a></a></div>',
				css:	'i ~ a {a:b;}',
			});
			assert.equal(out, 'i ~ a{a:b;}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div><i></i><span></span><a></a></div>',
				css:	'a ~ i {a:b;}',
			});
			assert.equal(out, '');
		});
	});

	describe(':nth-child()', () => {
		it('should retain "odd"', function() {
			let {css: out} = dropcss({
				html:	'<div><span></span></div>',
				css:	'span:nth-child(odd) {a:b;}',
			});
			assert.equal(out, 'span:nth-child(odd){a:b;}');
		});

		it('should retain "2n+1"', function() {
			let {css: out} = dropcss({
				html:	'<div><span></span></div>',
				css:	'span:nth-child(2n+1) {a:b;}',
			});
			assert.equal(out, 'span:nth-child(2n+1){a:b;}');
		});

		it('should retain "1"', function() {
			let {css: out} = dropcss({
				html:	'<div><span></span><i></i></div>',
				css:	'span:nth-child(1) {a:b;}',
			});
			assert.equal(out, 'span:nth-child(1){a:b;}');
		});

		it('should drop "even"', function() {
			let {css: out} = dropcss({
				html:	'<div><span></span></div>',
				css:	'span:nth-child(even) {a:b;}',
			});
			assert.equal(out, '');
		});

		it('should drop "2"', function() {
			let {css: out} = dropcss({
				html:	'<div><span></span><i></i></div>',
				css:	'span:nth-child(2) {a:b;}',
			});
			assert.equal(out, '');
		});
	});

	describe(':nth-last-child()', () => {
		it('should retain "2n+1"', function() {
			let {css: out} = dropcss({
				html:	'<div><span></span></div>',
				css:	'span:nth-last-child(2n+1) {a:b;}',
			});
			assert.equal(out, 'span:nth-last-child(2n+1){a:b;}');
		});
	});

	describe(':first-child', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div><span></span><a></a></div>',
				css:	'span:first-child {a:b;}',
			});
			assert.equal(out, 'span:first-child{a:b;}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div><span></span><a></a></div>',
				css:	'a:first-child {a:b;}',
			});
			assert.equal(out, '');
		});
	});

	describe(':only-child', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div><span></span></div>',
				css:	'span:only-child {a:b;}',
			});
			assert.equal(out, 'span:only-child{a:b;}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div><span></span><span></span></div>',
				css:	'span:only-child {a:b;}',
			});
			assert.equal(out, '');
		});
	});
});