## 🗑 DropCSS

A simple, thorough and fast unused-CSS cleaner _(MIT Licensed)_

---
### Introduction

DropCSS is an unused CSS cleaner; it takes your HTML and CSS as input and returns only the used CSS as output. The core is simply some minimal glue between these awesome low-level tools:

- [Fast HTML Parser](https://github.com/taoqf/node-html-parser)
- [CSSTree](https://github.com/csstree/csstree)
- [css-select](https://github.com/fb55/css-select)

The entire logic for DropCSS is this [~60 line file](https://github.com/leeoniya/dropcss/blob/master/src/dropcss.js).

It is recommended to also run your CSS through an optimizer like [clean-css](https://github.com/jakubpawlowicz/clean-css) to group selectors, merge and remove redundant rules, purge unused keyframes, etc. Whether this is done before or after DropCSS is up to you, but since `clean-css` also minifies, it probably makes sense to run DropCSS first to avoid bouncing [and re-parsing] the output back and forth (optimize & minify -> drop) vs (optimize -> drop -> minify), though this will likely depend on your actual input; profiling is your friend.

A bit more on this project's backstory & discussions in [/r/javascript](https://old.reddit.com/r/javascript/comments/b3mcu8/dropcss_010_a_minimal_and_thorough_unused_css/) and on [Hacker News](https://news.ycombinator.com/item?id=19469080).

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

// returns { css }
let cleaned = dropcss({
    html,
    css,
    keepText: false,
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

console.log(dropped);
```

- `shouldDrop` is called for every CSS selector that could not be matched in the `html`. Return `false` to retain it or `true` to drop it. Additionally, this hook can be used to log all removed selectors.
- `keepText` - By default, DropCSS will remove all text nodes from the HTML before processing further since very few CSS selectors can actually target text. Not having to process text nodes is a significant performance boost. However, a few uncommon pseudo-classes like `:blank` and `:empty` do assert on text nodes. If combined as e.g. `:not(:empty)`, this could result wrongful removal, or wrongful retention of selectors. Setting `keepText` to `true` will leave all text nodes in place to allow for this to work properly at the expense of performance.

---
### Features

DropCSS stands on the shoulders of giants.

- Removal of practically all conceivable selectors is achieved thanks to the exhaustive selector support of `css-select`: https://github.com/fb55/css-select#supported-selectors.
- CSSTree enables media queries to be transparently processed and removed like all other blocks without special handling.
- Retention of all transient pseudo-class and pseudo-element selectors which cannot be deterministically checked from the parsed HTML.

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
                2.16 MB<br>
                251 Files, 51 Folders
            </td>
            <td>6.60 KB</td>
            <td>76.15%</td>
            <td>138ms</td>
            <td>575 / 8.5%</td>
        </tr>
        <tr>
            <th><a href="https://github.com/uncss/uncss">UnCSS</a></th>
            <td>
                13.7 MB<br>
                2,831 Files, 301 Folders
            </td>
            <td>6.72 KB</td>
            <td>75.71%</td>
            <td>429ms</td>
            <td>638 / 9.3%</td>
        </tr>
        <tr>
            <th><a href="https://github.com/FullHuman/purgecss">Purgecss</a></th>
            <td>
                2.53 MB<br>
                513 Files, 110 Folders
            </td>
            <td>8.01 KB</td>
            <td>71.05%</td>
            <td>78ms</td>
            <td>1,806 / 22.0%</td>
        </tr>
        <tr>
            <th><a href="https://github.com/purifycss/purifycss">PurifyCSS</a></th>
            <td>
                3.45 MB<br>
                791 Files, 207 Folders
            </td>
            <td>15.4 KB</td>
            <td>44.34%</td>
            <td>186ms</td>
            <td>9,440 / 59.6%</td>
        </tr>
    </tbody>
</table>

**Notes**

- About 400 "unused bytes" are due to an explicit/shared whitelist, not an inability of the tools to detect/remove that CSS.
- About 175 "unused bytes" are due to vendor-prefixed (-moz, -ms) properties & selectors that are inactive in Chrome, which is used for testing coverage.
- Purgecss does not support attribute or complex selectors: [Issue #110](https://github.com/FullHuman/purgecss/issues/110).

---
### Caveats

- Not tested against malformed HTML (the underlying Fast HTML Parser claims to support common cases but not all)
- Not tested against malformed CSS (the underlying CSSTree parser claims to be "Tolerant to errors by design")
- There is no processing or execution of `<script>` tags; your HTML must be fully formed (or SSR'd). You should generate and append any additional HTML that you'd want to be considered by DropCSS. If you need JS execution, consider using the larger, slower but still good output, `UnCSS`. Alternatively, [Puppeteer can now output coverage reports](https://www.philkrie.me/2018/07/04/extracting-coverage.html), and there might be tools that utilize this coverage data to clean your CSS, too. DropCSS aims to be minimal, simple and effective.