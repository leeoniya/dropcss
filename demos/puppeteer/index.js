const httpServer = require('http-server');
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const dropcss = require('../../dist/dropcss.cjs.js');

const server = httpServer.createServer({root: './www'});
server.listen(8080);

(async () => {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();
	await page.goto('http://127.0.0.1:8080/index.html');
//	await page.waitForNavigation({ waitUntil: 'networkidle2' });
	const html = await page.content();
	const styleHrefs = await page.$$eval('link[rel=stylesheet]', els => Array.from(els).map(s => s.href));
	await browser.close();

	await Promise.all(styleHrefs.map(href =>
		fetch(href).then(r => r.text()).then(css => {
			let start = +new Date();

			let clean = dropcss({
				css,
				html,
			});

			console.log({
				stylesheet: href,
				cleanCss: clean.css,
				elapsed: +new Date() - start,
			});
		})
	));

	server.close();
})();