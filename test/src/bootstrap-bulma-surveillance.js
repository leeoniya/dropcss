const fs = require('fs');
const dropcss = require('../../src/dropcss.js');
const assert = require('assert');

const vkbeautify = require('../bench/lib/vkbeautify');

describe('Bulma-Bootstrap-Surveillance', () => {
	let html, css;

	describe('stress test', () => {
		it('should run', function() {
			let {css: out} = dropcss({
				html:	fs.readFileSync(__dirname + '/../bench/stress/input/surveillance.html', 'utf8'),
				css:	fs.readFileSync(__dirname + '/../bench/stress/input/bootstrap.min.css', 'utf8') + fs.readFileSync(__dirname + '/../bench/stress/input/bulma.min.css', 'utf8'),
			});

			assert.equal(vkbeautify(out), fs.readFileSync(__dirname + '/../bench/stress/output/dropcss.pretty.css', 'utf8'));
		});
	});
});