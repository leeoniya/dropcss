## 🗑 DropCSS

An exceptionally fast, thorough and tiny unused-CSS cleaner _(MIT Licensed)_

---
### Introduction

DropCSS is an exceptionally fast, thorough and tiny ([~8 KB min](https://github.com/leeoniya/dropcss/tree/master/dist/dropcss.min.js)) unused-CSS cleaner; it takes your HTML and CSS as input and returns only the used CSS as output. Its custom HTML and CSS parsers are highly optimized for the 99% use case and thus avoid the overhead of handling malformed markup or stylesheets, so you must provide well-formed input. There is minimal handling for complex escaping rules, so there will always exist cases of valid input that cannot be processed by DropCSS; for these infrequent cases, please [start a discussion](https://github.com/leeoniya/dropcss/issues), use a previous, larger and slower [0.3.x version](https://github.com/leeoniya/dropcss/releases) that uses heavier but more compliant parsers, or use an alternative CSS cleaner.

As a bonus, DropCSS will also remove unused any `@keyframes` and `@font-face` blocks, despite it being somewhat out of scope for this lib (being a purely intra-CSS optimization). Speaking of which, it's a good idea to run your CSS through a structural optimizer like [clean-css](https://github.com/jakubpawlowicz/clean-css), [csso](https://github.com/css/csso), [cssnano](https://github.com/cssnano/cssnano) or [crass](https://github.com/mattbasta/crass) to re-group selectors, merge redundant rules, etc. It probably makes sense to do this after DropCSS, which can leave redundant blocks, e.g. `.foo, .bar { color: red; }; .bar { width: 50%; }` -> `.bar { color: red; }; .bar { width: 50%; }` if `.foo` is absent from your markup.

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

- `shouldDrop` is called for every CSS selector that could not be matched in the `html`. Return `false` to retain the selector or `true` to drop it. Additionally, this hook can be used to log all removed selectors.
- `keepText` - By default, DropCSS will remove all text nodes from the HTML before processing further since very few CSS selectors can actually target text. Not having to process text nodes is a significant performance boost. However, a few uncommon pseudo-classes like `:blank` and `:empty` do assert on text nodes. If combined as e.g. `:not(:empty)`, this could result wrongful removal, or wrongful retention of selectors. Setting `keepText` to `true` will leave all text nodes in place to allow for this to work properly at the expense of performance.

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
  - `:not()`
  - `:empty`
  - `:first-child`
  - `:last-child`
  - `:only-child`
  - `:nth-child()`
  - `:nth-last-child()`

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
				52.6 KB<br>
				6 files, 1 Folders
            </td>
            <td>6.58 KB</td>
            <td>76.15%</td>
            <td>20ms</td>
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
            <td>409ms</td>
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
            <td>79ms</td>
            <td>1,806 / 22.0%</td>
        </tr>
        <tr>
            <th><a href="https://github.com/purifycss/purifycss">PurifyCSS</a></th>
            <td>
                3.45 MB<br>
                791 Files, 207 Folders
            </td>
            <td>15.46 KB</td>
            <td>44.34%</td>
            <td>179ms</td>
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
### TODO

- All `-of-type` selectors are currently unimplemented, so will not be removed unless already disqualified by a paired selector, (e.g. `.card:first-of-type` when `.card` is absent altogether). This is pretty easy to implement and a good first issue for those interested in contributing: [Issue #4](https://github.com/leeoniya/dropcss/issues/4).
  - `:first-of-type`
  - `:last-of-type`
  - `:only-of-type`
  - `:nth-of-type()`
  - `:nth-last-of-type()`
  - `:nth-only-of-type()`

- Moar tests. Hundreds of additional, granular tests. DropCSS is currently developed against gigantic blobs of diverse, real-world CSS and HTML. These inputs & outputs are also used for perf testing and regression detection. While not all output was verified by hand (this would be infeasible for giganitic mis-matched HTML/CSS inputs), it was loosely verified against what other cleaners remove and what they leave behind. Writing tests is additonally challenging because the way selectors are drop-tested is optimized to fast-path many cases; a complex-looking test like `.foo > ul + p:not([foo*=bar]):hover` will actually short circuit early if `.foo`, `ul` or `p` are missing from the dom, and will never continue to structural/context or negation assertions. Tests must be carefully written to ensure they hit all the desired paths; it's easy to waste a lot of time writing useless tests that add no value. Unfortunately, even 100% cumulative code coverage of the test suite would only serve as a starting point. Good tests would be a diverse set of real-world inputs and manually verified outputs.

---
### Caveats

- Not tested against or designd to handle malformed HTML or CSS
- Excessive escaping or reserved characters in your HTML or CSS can break DropCSS's parsers
- There is no processing or execution of `<script>` tags; your HTML must be fully formed (or SSR'd). You should generate and append any additional HTML that you'd want to be considered by DropCSS. If you need JS execution, consider using the larger, slower but still good output, `UnCSS`. Alternatively, [Puppeteer can now output coverage reports](https://www.philkrie.me/2018/07/04/extracting-coverage.html), and there might be tools that utilize this coverage data to clean your CSS, too. DropCSS aims to be minimal, simple and effective.

---
### Acknowledgements

- Felix Böhm's [nth-check](https://github.com/fb55/nth-check) - it's not much code, but getting `An+B` expression testing exactly right is frustrating. I got part-way there before discovering this tiny solution.
- Vadim Kiryukhin's [vkbeautify](https://github.com/vkiryukhin/vkBeautify) - the benchmark and test code uses this tiny formatter to make it easier to spot differences in output diffs.