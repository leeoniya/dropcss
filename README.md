## 🗑 DropCSS

An exceptionally fast, thorough and tiny unused-CSS cleaner _(MIT Licensed)_

---
### Introduction

DropCSS is an exceptionally fast, thorough and tiny ([~8.5 KB min](https://github.com/leeoniya/dropcss/tree/master/dist/dropcss.min.js)) unused-CSS cleaner; it takes your HTML and CSS as input and returns only the used CSS as output. Its custom HTML and CSS parsers are highly optimized for the 99% use case and thus avoid the overhead of handling malformed markup or stylesheets, so you must provide well-formed input. There is minimal handling for complex escaping rules, so there will always exist cases of valid input that cannot be processed by DropCSS; for these infrequent cases, please [start a discussion](https://github.com/leeoniya/dropcss/issues).

As a bonus, DropCSS will also remove unused `@keyframes` and `@font-face` blocks - an out-of-scope, purely intra-CSS optimization. Speaking of which, it's a good idea to run your CSS through a structural optimizer like [clean-css](https://github.com/jakubpawlowicz/clean-css), [csso](https://github.com/css/csso), [cssnano](https://github.com/cssnano/cssnano) or [crass](https://github.com/mattbasta/crass) to re-group selectors, merge redundant rules, etc. It probably makes sense to do this after DropCSS, which can leave redundant blocks, e.g. `.foo, .bar { color: red; }; .bar { width: 50%; }` -> `.bar { color: red; }; .bar { width: 50%; }` if `.foo` is absent from your markup.

More on this project's backstory & discussions: v0.1.0 alpha: [/r/javascript](https://old.reddit.com/r/javascript/comments/b3mcu8/dropcss_010_a_minimal_and_thorough_unused_css/), [Hacker News](https://news.ycombinator.com/item?id=19469080) and v1.0.0 release: [/r/javascript](https://old.reddit.com/r/javascript/comments/bb7im2/dropcss_v100_an_exceptionally_fast_thorough_and/).

---
<h3 align="center">Live Demo: <a href="https://codepen.io/leeoniya/pen/LvbRyq">https://codepen.io/leeoniya/pen/LvbRyq</a></h3>

---
### Installation

```
npm install -D dropcss
```

---
### Usage & API

```js
const dropcss = require('dropcss');

let html = `
    <html>
        <head></head>
        <body>
            <p>Hello World!</p>
        </body>
    </html>
`;

let css = `
    .card {
      padding: 8px;
    }

    p:hover a:first-child {
      color: red;
    }
`;

const whitelist = /#foo|\.bar/;

let dropped = new Set();

let cleaned = dropcss({
    html,
    css,
    shouldDrop: (sel) => {
        if (whitelist.test(sel))
            return false;
        else {
            dropped.add(sel);
            return true;
        }
    },
});

console.log(cleaned.css);

console.log('Selectors: ', cleaned.tokens.filter(Array.isArray).flat());

console.log(dropped);
```

The `shouldDrop` hook is called for every CSS selector that could not be matched in the `html`. Return `false` to retain the selector or `true` to drop it.

---
### Features

- Retention of all transient pseudo-class and pseudo-element selectors which cannot be deterministically checked from the parsed HTML.
- Supported selectors
  - `*` - universal
  - `<tag>` - tag
  - `#` - id
  - `.` - class
  - ` ` - descendant
  - `>` - child
  - `+` - adjacent sibling
  - `~` - general sibling
  - `[attr]` - attribute
  - `[attr=val]`
  - `[attr*=val]`
  - `[attr^=val]`
  - `[attr$=val]`
  - `[attr~=val]`
  - `:not()`
  - `:first-child`
  - `:last-child`
  - `:only-child`
  - `:nth-child()`
  - `:nth-last-child()`
  - `:first-of-type`
  - `:last-of-type`
  - `:only-of-type`
  - `:nth-of-type()`
  - `:nth-last-of-type()`

---
### Performance

#### Input

**test.html**

- 18.8 KB minified
- 502 dom nodes via `document.querySelectorAll("*").length`

**styles.min.css**

- 27.67 KB combined, optimized and minified via [clean-css](https://github.com/jakubpawlowicz/clean-css)
- contents: Bootstrap's [reboot.css](https://github.com/twbs/bootstrap/blob/master/dist/css/bootstrap-reboot.css), an in-house flexbox grid, global layout, navbars, colors & page-specific styles. (the grid accounts for ~85% of this starting weight, lots of media queries & repetition)

#### Output

<table>
    <thead>
        <tr>
            <th></th>
            <th>lib size w/deps</th>
            <th>output size</th>
            <th>reduction</th>
            <th>time elapsed</th>
            <th>unused bytes (test.html coverage)</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <th><strong>DropCSS</strong></th>
            <td>
                58.4 KB<br>
                6 Files, 2 Folders
            </td>
            <td>6.58 KB</td>
            <td>76.15%</td>
            <td>21 ms</td>
            <td>575 / 8.5%</td>
        </tr>
        <tr>
            <th><a href="https://github.com/uncss/uncss">UnCSS</a></th>
            <td>
                13.5 MB<br>
                2,829 Files, 301 Folders
            </td>
            <td>6.72 KB</td>
            <td>75.71%</td>
            <td>385 ms</td>
            <td>638 / 9.3%</td>
        </tr>
        <tr>
            <th><a href="https://github.com/FullHuman/purgecss">Purgecss</a></th>
            <td>
                2.69 MB<br>
                560 Files, 119 Folders
            </td>
            <td>8.01 KB</td>
            <td>71.05%</td>
            <td>88 ms</td>
            <td>1,806 / 22.0%</td>
        </tr>
        <tr>
            <th><a href="https://github.com/purifycss/purifycss">PurifyCSS</a></th>
            <td>
                3.46 MB<br>
                792 Files, 207 Folders
            </td>
            <td>15.46 KB</td>
            <td>44.34%</td>
            <td>173 ms</td>
            <td>9,440 / 59.6%</td>
        </tr>
    </tbody>
</table>

**Notes**

- About 400 "unused bytes" are due to an explicit/shared whitelist, not an inability of the tools to detect/remove that CSS.
- About 175 "unused bytes" are due to vendor-prefixed (-moz, -ms) properties & selectors that are inactive in Chrome, which is used for testing coverage.
- Purgecss does not support attribute or complex selectors: [Issue #110](https://github.com/FullHuman/purgecss/issues/110).

A full **[Stress Test](https://github.com/leeoniya/dropcss/tree/master/test/bench)** is also available.

---
### JavaScript Execution

DropCSS does not load external resources or execute `<script>` tags, so your HTML must be fully formed (or SSR'd). Alternatively, you can use [Puppeteer](https://github.com/GoogleChrome/puppeteer) and a local http server to get full `<script>` execution.

[Here's a 35 line script](/demos/puppeteer/index.js) which does exactly that:

```js
const httpServer = require('http-server');
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const dropcss = require('dropcss');

const server = httpServer.createServer({root: './www'});
server.listen(8080);

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:8080/index.html');
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
                cleanSelectors: clean.tokens.filter(Array.isArray).flat(),
                elapsed: +new Date() - start,
            });
        })
    ));

    server.close();
})();
```

---
### Special / Escaped Sequences

DropCSS is stupid and will choke on unusual selectors, like the ones used by the popular [Tailwind CSS](https://github.com/tailwindcss/tailwindcss) framework:

`class` attributes can look like this:

```html
<div class="px-6 pt-6 overflow-y-auto text-base lg:text-sm lg:py-12 lg:pl-6 lg:pr-8 sticky?lg:h-(screen-16)"></div>
<div class="px-2 -mx-2 py-1 transition-fast relative block hover:translate-r-2px hover:text-gray-900 text-gray-600 font-medium"></div>
```

...and the CSS looks like this:

```css
.sticky\?lg\:h-\(screen-16\){...}
.lg\:text-sm{...}
.lg\:focus\:text-green-700:focus{...}
```

Ouch.

The solution is to temporarily replace the escaped characters in the HTML and CSS with some unique strings which match `/[\w-]/`. This allows DropCSS's tokenizer to consider the classname as one contiguous thing. After processing, we simply reverse the operation.

```js
// remap
let css2 = css
    .replace(/\\\:/gm, '__0')
    .replace(/\\\//gm, '__1')
    .replace(/\\\?/gm, '__2')
    .replace(/\\\(/gm, '__3')
    .replace(/\\\)/gm, '__4');

let html2 = html.replace(/class=["'][^"']*["']/gm, m =>
    m
    .replace(/\:/gm, '__0')
    .replace(/\//gm, '__1')
    .replace(/\?/gm, '__2')
    .replace(/\(/gm, '__3')
    .replace(/\)/gm, '__4')
);

let res = dropcss({
    css: css2,
    html: html2,
});

// undo
res.css = res.css
    .replace(/__0/gm, '\\:')
    .replace(/__1/gm, '\\/')
    .replace(/__2/gm, '\\?')
    .replace(/__3/gm, '\\(')
    .replace(/__4/gm, '\\)');
```

This performant work-around allows DropCSS to process Tailwind without issues \o/ and is easily adaptable to support other "interesting" cases. One thing to keep in mind is that `shouldDrop()` will be called with selectors containing the temp replacements rather than original selectors, so make sure to account for this if `shouldDrop()` is used to test against some whitelist.

---
### Caveats

- Not tested against or designd to handle malformed HTML or CSS
- Excessive escaping or reserved characters in your HTML or CSS can break DropCSS's parsers

---
### Acknowledgements

- Felix Böhm's [nth-check](https://github.com/fb55/nth-check) - it's not much code, but getting `An+B` expression testing exactly right is frustrating. I got part-way there before discovering this tiny solution.
- Vadim Kiryukhin's [vkbeautify](https://github.com/vkiryukhin/vkBeautify) - the benchmark and test code uses this tiny formatter to make it easier to spot differences in output diffs.