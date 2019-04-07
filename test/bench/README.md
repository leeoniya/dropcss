This is a `/stress` benchmark measures DropCSS against other popular CSS cleaning libraries.

The input HTML file is a large, 1.28 MB [wiki article](https://en.wikipedia.org/wiki/Internet_censorship_and_surveillance_by_country) with 18,085 DOM nodes; it ranks #6 on [Wikipedia's Long pages](https://en.wikipedia.org/wiki/Special:LongPages) at time of writing. The input CSS is two popular CSS frameworks concatenated together: the full minified builds of [Bootstrap](https://getbootstrap.com/) (140KB) and [Bulma](https://bulma.io/) (172KB). For reference, visually busy, mobile-responsive ecommerce sites tend to have front pages with ~250 KB of HTML, ~3,500 DOM nodes and ~250 KB of served CSS.

Employing HTML that utilizes little of the CSS is intentional since the goal is to maximize the rules that must be removed while increasing the cost of assertion by providing a huge DOM structure.

```
[ 'DropCSS',      '123ms',   '5.37 KB' ]
[ 'PurgeCSS',     '346ms',  '21.06 KB' ]
[ 'PurifyCSS',    '827ms',  '13.26 KB' ]
[ 'UnCSS',      '27153ms',  '13.63 KB' ]
[ 'miminalcss', '35401ms',   '4.52 KB' ]
```

**Notes:**

- `minimalcss` appears to also run a CSS structural optimization pass, which can be done to the other results in a post-pass to get smaller results for an additional < 30ms. It also has many correctness issues with removing pseudo-selectors like `:hover`. Its output very likely is broken.