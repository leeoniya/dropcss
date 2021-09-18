const dropcss = require('../../dist/dropcss.cjs.js');
const assert = require('assert');

describe('Context-free, unary selector', () => {
	let html, css;

	describe('*', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div></div>',
				css:	'* {a:b;}',
			});
			assert.equal(out, '*{a:b;}');
		});
	});

	describe('<tag>', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div></div>',
				css:	'div {a:b;}',
			});
			assert.equal(out, 'div{a:b;}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div></div>',
				css:	'span {a:b;}',
			});
			assert.equal(out, '');
		});
	});

	describe('#id', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div id="a"></div>',
				css:	'#a {a:b;}',
			});
			assert.equal(out, '#a{a:b;}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div id="a"></div>',
				css:	'#b {a:b;}',
			});
			assert.equal(out, '');
		});
	});

	describe('.class', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div class="a"></div>',
				css:	'.a {a:b;}',
			});
			assert.equal(out, '.a{a:b;}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div class="a"></div>',
				css:	'.b {a:b;}',
			});
			assert.equal(out, '');
		});
	});

	describe('[attr]', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div foo></div>',
				css:	'[foo] {a:b;}',
			});
			assert.equal(out, '[foo]{a:b;}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div foo></div>',
				css:	'[bar] {a:b;}',
			});
			assert.equal(out, '');
		});
	});

	// todo: test [foo="val"], [foo='val']
	describe('[attr=value]', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	'[foo=bar] {a:b;}',
			});
			assert.equal(out, '[foo=bar]{a:b;}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	'[foo=cow] {a:b;}',
			});
			assert.equal(out, '');
		});
	});

	describe('[attr*=value]', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	'[foo*=a] {a:b;}',
			});
			assert.equal(out, '[foo*=a]{a:b;}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	'[foo*=c] {a:b;}',
			});
			assert.equal(out, '');
		});
	});

	describe('[attr^=value]', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	'[foo^=b] {a:b;}',
			});
			assert.equal(out, '[foo^=b]{a:b;}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	'[foo^=c] {a:b;}',
			});
			assert.equal(out, '');
		});
	});

	describe('[attr$=value]', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	'[foo$=r] {a:b;}',
			});
			assert.equal(out, '[foo$=r]{a:b;}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	'[foo$=z] {a:b;}',
			});
			assert.equal(out, '');
		});
	});

	describe('[attr~=value]', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	'[foo~=bar] {a:b;}',
			});
			assert.equal(out, '[foo~=bar]{a:b;}');
		});

		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar baz"></div>',
				css:	'[foo~=bar] {a:b;}',
			});
			assert.equal(out, '[foo~=bar]{a:b;}');
		});

		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div foo="baz bar"></div>',
				css:	'[foo~=bar] {a:b;}',
			});
			assert.equal(out, '[foo~=bar]{a:b;}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar-baz"></div>',
				css:	'[foo~=bar] {a:b;}',
			});
			assert.equal(out, '');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div foo="baz-bar"></div>',
				css:	'[foo~=bar] {a:b;}',
			});
			assert.equal(out, '');
		});
	});

	describe(':not(<tag>)', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div></div>',
				css:	':not(span) {a:b;}',
			});
			assert.equal(out, ':not(span){a:b;}')
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div></div>',
				css:	':not(div) {a:b;}',
			});
			assert.equal(out, '');;
		});
	});

	describe(':not(#id)', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div id="a"></div>',
				css:	':not(#b) {a:b;}',
			});
			assert.equal(out, ':not(#b){a:b;}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div id="a"></div>',
				css:	':not(#a) {a:b;}',
			});
			assert.equal(out, '');
		});
	});

	describe(':not(.class)', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div class="a"></div>',
				css:	':not(.b) {a:b;}',
			});
			assert.equal(out, ':not(.b){a:b;}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div class="a"></div>',
				css:	':not(.a) {a:b;}',
			});
			assert.equal(out, '');
		});
	});

	describe(':not([attr])', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div foo></div>',
				css:	':not([bar]) {a:b;}',
			});
			assert.equal(out, ':not([bar]){a:b;}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div foo></div>',
				css:	':not([foo]) {a:b;}',
			});
			assert.equal(out, '');
		});
	});

	// todo: test [foo="val"], [foo='val']
	describe(':not([attr=value])', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	':not([foo=cow]) {a:b;}',
			});
			assert.equal(out, ':not([foo=cow]){a:b;}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	':not([foo=bar]) {a:b;}',
			});
			assert.equal(out, '');
		});
	});

	describe(':not([attr*=value])', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	':not([foo*=c]) {a:b;}',
			});
			assert.equal(out, ':not([foo*=c]){a:b;}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	':not([foo*=a]) {a:b;}',
			});
			assert.equal(out, '');
		});
	});

	describe(':not([attr^=value])', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	':not([foo^=c]) {a:b;}',
			});
			assert.equal(out, ':not([foo^=c]){a:b;}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	':not([foo^=b]) {a:b;}',
			});
			assert.equal(out, '');
		});
	});

	describe(':not([attr$=value])', () => {
		it('should retain present', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	':not([foo$=z]) {a:b;}',
			});
			assert.equal(out, ':not([foo$=z]){a:b;}');
		});

		it('should drop absent', function() {
			let {css: out} = dropcss({
				html:	'<div foo="bar"></div>',
				css:	':not([foo$=r]) {a:b;}',
			});
			assert.equal(out, '');
		});
	});

	// *-child assertions dont make to test in a unary selector since all root elements will be first/last/only "children"
});
