const fs = require('fs');

const dropcss = require('../../../dist/dropcss.cjs.js');
const Purgecss = require('purgecss');
const uncss = require('uncss');
const purify = require("purify-css");
//const minimalcss = require('minimalcss');

const vkbeautify = require('../lib/vkbeautify');

const css = fs.readFileSync('./input/bootstrap.min.css', 'utf8') + fs.readFileSync('./input/bulma.min.css', 'utf8');
const html = fs.readFileSync('./input/surveillance.html', 'utf8');

let res, start;

// DropCSS
start = +new Date();
res = dropcss({
	css,
	html,
});
console.log(['DropCSS', (+new Date() - start) + 'ms', (res.css.length / 1024).toFixed(2) + " KB"]);
fs.writeFileSync('./output/dropcss.css', res.css, 'utf8');
fs.writeFileSync('./output/dropcss.pretty.css', vkbeautify(res.css), 'utf8');

// PurgeCSS
start = +new Date();
let purgeCss = new Purgecss({
    content: [{raw: html, extension: 'html'}],
	css: [{raw: css}],
});
res = purgeCss.purge()[0];
console.log(['PurgeCSS', (+new Date() - start) + 'ms', (res.css.length / 1024).toFixed(2) + " KB"]);
fs.writeFileSync('./output/purgecss.css', res.css, 'utf8');
fs.writeFileSync('./output/purgecss.pretty.css', vkbeautify(res.css), 'utf8');

// PurifyCSS
start = +new Date();
res = purify(html, css, {minify: true});
console.log(['PurifyCSS', (+new Date() - start) + 'ms', (res.length / 1024).toFixed(2) + " KB"]);
fs.writeFileSync('./output/purifycss.css', res, 'utf8');
fs.writeFileSync('./output/purifycss.pretty.css', vkbeautify(res), 'utf8');

// UnCSS
let htmlExtern = html.replace(/<script\s*[^>]+><\/script>|<link\s*[^>]+?stylesheet.*?>/gm, '');
start = +new Date();
uncss(htmlExtern, {raw: css}, function(error, output) {
	console.log(['UnCSS', (+new Date() - start) + 'ms', (output.length / 1024).toFixed(2) + " KB"]);
	fs.writeFileSync('./output/uncss.css', output, 'utf8');
	fs.writeFileSync('./output/uncss.pretty.css', vkbeautify(output), 'utf8');
});

/*
// minimalcss
// 35401ms, 4.52 KB
// this bench requires that surveillance.html has the 2x <link rel="stylesheet"> entries and that a local http server can
// deliver it and the stylesheets. feel free to do that and uncomment this bench if you want. i have no plans to make this "just work"
start = +new Date();
minimalcss.minimize({urls: ['http://localhost:8080/surveillance2.html']}).then(result => {
	console.log(['minimalcss', (+new Date() - start) + 'ms', (result.finalCss.length / 1024).toFixed(2) + " KB"]);
	fs.writeFileSync('./output/minimalcss.css', result.finalCss, 'utf8');
}).catch(error => {
	console.error(`Failed the minimize CSS: ${error}`);
});
*/