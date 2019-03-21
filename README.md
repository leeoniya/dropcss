## DropCSS

A simple, thorough and fast unused-CSS cleaner _(MIT Licensed)_

---
### Introduction

DropCSS is an unused CSS cleaner that's just some clever & minimal glue between these awesome low-level tools:

- [Fast HTML Parser](https://github.com/taoqf/node-html-parser)
- [CSSTree](https://github.com/csstree/csstree)
- [css-select](https://github.com/fb55/css-select)

The entire logic for DropCSS is this [~75 line file](https://github.com/leeoniya/dropcss/blob/master/src/dropcss.js).

---
### Install

```
npm install --save-dev dropcss
```

---
### API

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

let cleansedCSS = dropcss({
    html,
    css,
    keep: (sel) => {
        // test selector against some whitelist
        // and return `true` to retain it
        return /#foo/.test(sel);
    },
})
```

---
### Performance

#### Input

**test.html**

- 18.8 KB minified
- 502 dom nodes via `document.querySelectorAll("*").length`

**styles.min.css**

- 27.67 KB minified
- contents: [bootstrap reboot.css](https://github.com/twbs/bootstrap/blob/master/dist/css/bootstrap-reboot.min.css), a custom flex grid, global & page-specific styles. (the grid accounts for ~85% of this starting weight, lots of media queries & repetition)

#### Output

<table>
    <thead>
        <tr>
            <th></th>
            <th>lib size w/deps</th>
            <th>output size</th>
            <th>time elapsed</th>
            <th>unused bytes (test.html coverage)</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <th><strong>DropCSS</strong></th>
            <td>
                2.06 MB<br>
                244 Files, 47 Folders
            </td>
            <td>6.67 KB</td>
            <td>195ms</td>
            <td>575 / 8.5%</td>
        </tr>
        <tr>
            <th><a href="https://github.com/uncss/uncss">UnCSS</a></th>
            <td>
                13.7 MB<br>
                2,831 Files, 301 Folders
            </td>
            <td>6.72 KB</td>
            <td>424ms</td>
            <td>730 / 10.6%</td>
        </tr>
        <tr>
            <th><a href="https://github.com/FullHuman/purgecss">Purgecss</a></th>
            <td>
                2.53 MB<br>
                513 Files, 110 Folders
            </td>
            <td>8.01 KB</td>
            <td>79ms</td>
            <td>1,898 / 23.1%</td>
        </tr>
        <tr>
            <th><a href="https://github.com/purifycss/purifycss">PurifyCSS</a></th>
            <td>
                3.45 MB<br>
                791 Files, 207 Folders
            </td>
            <td>15.4 KB</td>
            <td>186ms</td>
            <td>9,532 / 60.2%</td>
        </tr>
    </tbody>
</table>

**Notes**

- About 400 "unused bytes" are due to an explicit/shared whitelist, not an inability of the tools to detect/remove that CSS.
- About 175 "unused bytes" are due to vendor-prefixed css properties (-moz, -ms) that are not active in Chrome (used to test coverage), but are properly retained.
- Purgecss is fast but has no support for removing attribute selectors [Issue #110](https://github.com/FullHuman/purgecss/issues/110), and maybe other stuff.

---
### DropCSS Caveats

- Not tested against malformed HTML (the underlying Fast HTML Parser claims to support common cases but not all)
- Not tested against malformed CSS (the underlying CSSTree parser claims to be "Tolerant to errors by design")

---
### TODO

- Remove unused keyframe defs
- See if any perf can be gained. Run a profile and maybe cache result of querySelector for identical selectors encountered across multiple @media blocks.
- (Internal) figure out how to properly prune empty @media query block nodes from the AST instead of doing a regex replace on the output.

---
### Similar Projects

- [UnCSS](https://github.com/uncss/uncss)
- [Purgecss](https://github.com/FullHuman/purgecss)
- [PurifyCSS](https://github.com/purifycss/purifycss)