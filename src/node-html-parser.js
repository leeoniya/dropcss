// https://github.com/leeoniya/node-html-parser/tree/parse-empty-attrs

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const he_1 = require("he");
var NodeType;
(function (NodeType) {
    NodeType[NodeType["ELEMENT_NODE"] = 1] = "ELEMENT_NODE";
    NodeType[NodeType["TEXT_NODE"] = 3] = "TEXT_NODE";
})(NodeType = exports.NodeType || (exports.NodeType = {}));
/**
 * Node Class as base class for TextNode and HTMLElement.
 */
class Node {
    constructor() {
        this.childNodes = [];
    }
}
exports.Node = Node;
/**
 * TextNode to contain a text element in DOM tree.
 * @param {string} value [description]
 */
class TextNode extends Node {
    constructor(value) {
        super();
        /**
         * Node Type declaration.
         * @type {Number}
         */
        this.nodeType = NodeType.TEXT_NODE;
        this.rawText = value;
    }
    /**
     * Get unescaped text value of current node and its children.
     * @return {string} text content
     */
    get text() {
        return he_1.decode(this.rawText);
    }
    /**
     * Detect if the node contains only white space.
     * @return {bool}
     */
    get isWhitespace() {
        return /^(\s|&nbsp;)*$/.test(this.rawText);
    }
    toString() {
        return this.text;
    }
}
exports.TextNode = TextNode;
const kBlockElements = {
    div: true,
    p: true,
    // ul: true,
    // ol: true,
    li: true,
    // table: true,
    // tr: true,
    td: true,
    section: true,
    br: true
};
function arr_back(arr) {
    return arr[arr.length - 1];
}
/**
 * HTMLElement, which contains a set of children.
 *
 * Note: this is a minimalist implementation, no complete tree
 *   structure provided (no parentNode, nextSibling,
 *   previousSibling etc).
 * @class HTMLElement
 * @extends {Node}
 */
class HTMLElement extends Node {
    /**
     * Creates an instance of HTMLElement.
     * @param keyAttrs	id and class attribute
     * @param [rawAttrs]	attributes in string
     *
     * @memberof HTMLElement
     */
    constructor(tagName, keyAttrs, rawAttrs = '', parentNode = null) {
        super();
        this.tagName = tagName;
        this.rawAttrs = rawAttrs;
        this.parentNode = parentNode;
        this.classNames = [];
        /**
         * Node Type declaration.
         */
        this.nodeType = NodeType.ELEMENT_NODE;
        this.rawAttrs = rawAttrs || '';
        this.parentNode = parentNode || null;
        this.childNodes = [];
        if (keyAttrs.id) {
            this.id = keyAttrs.id;
        }
        if (keyAttrs.class) {
            this.classNames = keyAttrs.class.split(/\s+/);
        }
    }
    /**
     * Remove Child element from childNodes array
     * @param {HTMLElement} node     node to remove
     */
    removeChild(node) {
        this.childNodes = this.childNodes.filter((child) => {
            return (child !== node);
        });
    }
    /**
     * Exchanges given child with new child
     * @param {HTMLElement} oldNode     node to exchange
     * @param {HTMLElement} newNode     new node
     */
    exchangeChild(oldNode, newNode) {
        let idx = -1;
        for (let i = 0; i < this.childNodes.length; i++) {
            if (this.childNodes[i] === oldNode) {
                idx = i;
                break;
            }
        }
        this.childNodes[idx] = newNode;
    }
    /**
     * Get escpaed (as-it) text value of current node and its children.
     * @return {string} text content
     */
    get rawText() {
        let res = '';
        for (let i = 0; i < this.childNodes.length; i++)
            res += this.childNodes[i].rawText;
        return res;
    }
    /**
     * Get unescaped text value of current node and its children.
     * @return {string} text content
     */
    get text() {
        return he_1.decode(this.rawText);
    }
    /**
     * Get structured Text (with '\n' etc.)
     * @return {string} structured text
     */
    get structuredText() {
        let currentBlock = [];
        const blocks = [currentBlock];
        function dfs(node) {
            if (node.nodeType === NodeType.ELEMENT_NODE) {
                if (kBlockElements[node.tagName]) {
                    if (currentBlock.length > 0) {
                        blocks.push(currentBlock = []);
                    }
                    node.childNodes.forEach(dfs);
                    if (currentBlock.length > 0) {
                        blocks.push(currentBlock = []);
                    }
                }
                else {
                    node.childNodes.forEach(dfs);
                }
            }
            else if (node.nodeType === NodeType.TEXT_NODE) {
                if (node.isWhitespace) {
                    // Whitespace node, postponed output
                    currentBlock.prependWhitespace = true;
                }
                else {
                    let text = node.text;
                    if (currentBlock.prependWhitespace) {
                        text = ' ' + text;
                        currentBlock.prependWhitespace = false;
                    }
                    currentBlock.push(text);
                }
            }
        }
        dfs(this);
        return blocks
            .map(function (block) {
            // Normalize each line's whitespace
            return block.join('').trim().replace(/\s{2,}/g, ' ');
        })
            .join('\n').replace(/\s+$/, ''); // trimRight;
    }
    toString() {
        const tag = this.tagName;
        if (tag) {
            const is_un_closed = /^meta$/i.test(tag);
            const is_self_closed = /^(img|br|hr|area|base|input|doctype|link)$/i.test(tag);
            const attrs = this.rawAttrs ? ' ' + this.rawAttrs : '';
            if (is_un_closed) {
                return `<${tag}${attrs}>`;
            }
            else if (is_self_closed) {
                return `<${tag}${attrs} />`;
            }
            else {
                return `<${tag}${attrs}>${this.innerHTML}</${tag}>`;
            }
        }
        else {
            return this.innerHTML;
        }
    }
    get innerHTML() {
        return this.childNodes.map((child) => {
            return child.toString();
        }).join('');
    }
    set_content(content) {
        if (content instanceof Node) {
            content = [content];
        }
        else if (typeof content == 'string') {
            const r = parse(content);
            content = r.childNodes.length ? r.childNodes : [new TextNode(content)];
        }
        this.childNodes = content;
    }
    get outerHTML() {
        return this.toString();
    }
    /**
     * Trim element from right (in block) after seeing pattern in a TextNode.
     * @param  {RegExp} pattern pattern to find
     * @return {HTMLElement}    reference to current node
     */
    trimRight(pattern) {
        for (let i = 0; i < this.childNodes.length; i++) {
            const childNode = this.childNodes[i];
            if (childNode.nodeType === NodeType.ELEMENT_NODE) {
                childNode.trimRight(pattern);
            }
            else {
                const index = childNode.rawText.search(pattern);
                if (index > -1) {
                    childNode.rawText = childNode.rawText.substr(0, index);
                    // trim all following nodes.
                    this.childNodes.length = i + 1;
                }
            }
        }
        return this;
    }
    /**
     * Get DOM structure
     * @return {string} strucutre
     */
    get structure() {
        const res = [];
        let indention = 0;
        function write(str) {
            res.push('  '.repeat(indention) + str);
        }
        function dfs(node) {
            const idStr = node.id ? ('#' + node.id) : '';
            const classStr = node.classNames.length ? ('.' + node.classNames.join('.')) : '';
            write(node.tagName + idStr + classStr);
            indention++;
            for (let i = 0; i < node.childNodes.length; i++) {
                const childNode = node.childNodes[i];
                if (childNode.nodeType === NodeType.ELEMENT_NODE) {
                    dfs(childNode);
                }
                else if (childNode.nodeType === NodeType.TEXT_NODE) {
                    if (!childNode.isWhitespace)
                        write('#text');
                }
            }
            indention--;
        }
        dfs(this);
        return res.join('\n');
    }
    /**
     * Remove whitespaces in this sub tree.
     * @return {HTMLElement} pointer to this
     */
    removeWhitespace() {
        let o = 0;
        for (let i = 0; i < this.childNodes.length; i++) {
            const node = this.childNodes[i];
            if (node.nodeType === NodeType.TEXT_NODE) {
                if (node.isWhitespace)
                    continue;
                node.rawText = node.rawText.trim();
            }
            else if (node.nodeType === NodeType.ELEMENT_NODE) {
                node.removeWhitespace();
            }
            this.childNodes[o++] = node;
        }
        this.childNodes.length = o;
        return this;
    }
    /**
     * Query CSS selector to find matching nodes.
     * @param  {string}         selector Simplified CSS selector
     * @param  {Matcher}        selector A Matcher instance
     * @return {HTMLElement[]}  matching elements
     */
    querySelectorAll(selector) {
        let matcher;
        if (selector instanceof Matcher) {
            matcher = selector;
            matcher.reset();
        }
        else {
            matcher = new Matcher(selector);
        }
        const res = [];
        const stack = [];
        for (let i = 0; i < this.childNodes.length; i++) {
            stack.push([this.childNodes[i], 0, false]);
            while (stack.length) {
                const state = arr_back(stack);
                const el = state[0];
                if (state[1] === 0) {
                    // Seen for first time.
                    if (el.nodeType !== NodeType.ELEMENT_NODE) {
                        stack.pop();
                        continue;
                    }
                    if (state[2] = matcher.advance(el)) {
                        if (matcher.matched) {
                            res.push(el);
                            // no need to go further.
                            matcher.rewind();
                            stack.pop();
                            continue;
                        }
                    }
                }
                if (state[1] < el.childNodes.length) {
                    stack.push([el.childNodes[state[1]++], 0, false]);
                }
                else {
                    if (state[2])
                        matcher.rewind();
                    stack.pop();
                }
            }
        }
        return res;
    }
    /**
     * Query CSS Selector to find matching node.
     * @param  {string}         selector Simplified CSS selector
     * @param  {Matcher}        selector A Matcher instance
     * @return {HTMLElement}    matching node
     */
    querySelector(selector) {
        let matcher;
        if (selector instanceof Matcher) {
            matcher = selector;
            matcher.reset();
        }
        else {
            matcher = new Matcher(selector);
        }
        const stack = [];
        for (let i = 0; i < this.childNodes.length; i++) {
            stack.push([this.childNodes[i], 0, false]);
            while (stack.length) {
                const state = arr_back(stack);
                const el = state[0];
                if (state[1] === 0) {
                    // Seen for first time.
                    if (el.nodeType !== NodeType.ELEMENT_NODE) {
                        stack.pop();
                        continue;
                    }
                    if (state[2] = matcher.advance(el)) {
                        if (matcher.matched) {
                            return el;
                        }
                    }
                }
                if (state[1] < el.childNodes.length) {
                    stack.push([el.childNodes[state[1]++], 0, false]);
                }
                else {
                    if (state[2])
                        matcher.rewind();
                    stack.pop();
                }
            }
        }
        return null;
    }
    /**
     * Append a child node to childNodes
     * @param  {Node} node node to append
     * @return {Node}      node appended
     */
    appendChild(node) {
        // node.parentNode = this;
        this.childNodes.push(node);
        if (node instanceof HTMLElement) {
            node.parentNode = this;
        }
        return node;
    }
    /**
     * Get first child node
     * @return {Node} first child node
     */
    get firstChild() {
        return this.childNodes[0];
    }
    /**
     * Get last child node
     * @return {Node} last child node
     */
    get lastChild() {
        return arr_back(this.childNodes);
    }
    /**
     * Get attributes
     * @return {Object} parsed and unescaped attributes
     */
    get attributes() {
        if (this._attrs)
            return this._attrs;
        this._attrs = {};
        const attrs = this.rawAttributes;
        for (const key in attrs) {
            this._attrs[key] = he_1.decode(attrs[key]);
        }
        return this._attrs;
    }
    /**
     * Get escaped (as-it) attributes
     * @return {Object} parsed attributes
     */
    get rawAttributes() {
        if (this._rawAttrs)
            return this._rawAttrs;
        const attrs = {};
        if (this.rawAttrs) {
            const re = /\b([a-z][a-z0-9\-]*)(?:\s*=\s*(?:"([^"]+)"|'([^']+)'|(\S+)))?/ig;
            let match;
            while (match = re.exec(this.rawAttrs)) {
                attrs[match[1]] = match[2] || match[3] || match[4] || "";
            }
        }
        this._rawAttrs = attrs;
        return attrs;
    }
}
exports.HTMLElement = HTMLElement;
/**
 * Cache to store generated match functions
 * @type {Object}
 */
let pMatchFunctionCache = {};
/**
 * Function cache
 */
const functionCache = {
    "f145": function (el, tagName, classes, attr_key, value) {
        "use strict";
        tagName = tagName || "";
        classes = classes || [];
        attr_key = attr_key || "";
        value = value || "";
        if (el.id != tagName.substr(1))
            return false;
        for (let cls = classes, i = 0; i < cls.length; i++)
            if (el.classNames.indexOf(cls[i]) === -1)
                return false;
        return true;
    },
    "f45": function (el, tagName, classes, attr_key, value) {
        "use strict";
        tagName = tagName || "";
        classes = classes || [];
        attr_key = attr_key || "";
        value = value || "";
        for (let cls = classes, i = 0; i < cls.length; i++)
            if (el.classNames.indexOf(cls[i]) === -1)
                return false;
        return true;
    },
    "f15": function (el, tagName, classes, attr_key, value) {
        "use strict";
        tagName = tagName || "";
        classes = classes || [];
        attr_key = attr_key || "";
        value = value || "";
        if (el.id != tagName.substr(1))
            return false;
        return true;
    },
    "f1": function (el, tagName, classes, attr_key, value) {
        "use strict";
        tagName = tagName || "";
        classes = classes || [];
        attr_key = attr_key || "";
        value = value || "";
        if (el.id != tagName.substr(1))
            return false;
    },
    "f5": function (el, tagName, classes, attr_key, value) {
        "use strict";
        el = el || {};
        tagName = tagName || "";
        classes = classes || [];
        attr_key = attr_key || "";
        value = value || "";
        return true;
    },
    "f245": function (el, tagName, classes, attr_key, value) {
        "use strict";
        tagName = tagName || "";
        classes = classes || [];
        attr_key = attr_key || "";
        value = value || "";
        let attrs = el.attributes;
        for (let key in attrs) {
            const val = attrs[key];
            if (key == attr_key && val == value) {
                return true;
            }
        }
        return false;
        // for (let cls = classes, i = 0; i < cls.length; i++) {if (el.classNames.indexOf(cls[i]) === -1){ return false;}}
        // return true;
    },
    "f25": function (el, tagName, classes, attr_key, value) {
        "use strict";
        tagName = tagName || "";
        classes = classes || [];
        attr_key = attr_key || "";
        value = value || "";
        let attrs = el.attributes;
        for (let key in attrs) {
            const val = attrs[key];
            if (key == attr_key && val == value) {
                return true;
            }
        }
        return false;
        //return true;
    },
    "f2": function (el, tagName, classes, attr_key, value) {
        "use strict";
        tagName = tagName || "";
        classes = classes || [];
        attr_key = attr_key || "";
        value = value || "";
        let attrs = el.attributes;
        for (let key in attrs) {
            const val = attrs[key];
            if (key == attr_key && val == value) {
                return true;
            }
        }
        return false;
    },
    "f345": function (el, tagName, classes, attr_key, value) {
        "use strict";
        tagName = tagName || "";
        classes = classes || [];
        attr_key = attr_key || "";
        value = value || "";
        if (el.tagName != tagName)
            return false;
        for (let cls = classes, i = 0; i < cls.length; i++)
            if (el.classNames.indexOf(cls[i]) === -1)
                return false;
        return true;
    },
    "f35": function (el, tagName, classes, attr_key, value) {
        "use strict";
        tagName = tagName || "";
        classes = classes || [];
        attr_key = attr_key || "";
        value = value || "";
        if (el.tagName != tagName)
            return false;
        return true;
    },
    "f3": function (el, tagName, classes, attr_key, value) {
        "use strict";
        tagName = tagName || "";
        classes = classes || [];
        attr_key = attr_key || "";
        value = value || "";
        if (el.tagName != tagName)
            return false;
    }
};
/**
 * Matcher class to make CSS match
 *
 * @class Matcher
 */
class Matcher {
    /**
     * Creates an instance of Matcher.
     * @param {string} selector
     *
     * @memberof Matcher
     */
    constructor(selector) {
        this.nextMatch = 0;
        functionCache["f5"] = functionCache["f5"];
        this.matchers = selector.split(' ').map((matcher) => {
            if (pMatchFunctionCache[matcher])
                return pMatchFunctionCache[matcher];
            const parts = matcher.split('.');
            const tagName = parts[0];
            const classes = parts.slice(1).sort();
            let source = '"use strict";';
            let function_name = 'f';
            let attr_key = "";
            let value = "";
            if (tagName && tagName != '*') {
                let matcher;
                if (tagName[0] == '#') {
                    source += 'if (el.id != ' + JSON.stringify(tagName.substr(1)) + ') return false;'; //1
                    function_name += '1';
                }
                else if (matcher = tagName.match(/^\[\s*(\S+)\s*(=|!=)\s*((((["'])([^\6]*)\6))|(\S*?))\]\s*/)) {
                    attr_key = matcher[1];
                    let method = matcher[2];
                    if (method !== '=' && method !== '!=') {
                        throw new Error('Selector not supported, Expect [key${op}value].op must be =,!=');
                    }
                    if (method === '=') {
                        method = '==';
                    }
                    value = matcher[7] || matcher[8];
                    source += `let attrs = el.attributes;for (let key in attrs){const val = attrs[key]; if (key == "${attr_key}" && val == "${value}"){return true;}} return false;`; //2
                    function_name += '2';
                }
                else {
                    source += 'if (el.tagName != ' + JSON.stringify(tagName) + ') return false;'; //3
                    function_name += '3';
                }
            }
            if (classes.length > 0) {
                source += 'for (let cls = ' + JSON.stringify(classes) + ', i = 0; i < cls.length; i++) if (el.classNames.indexOf(cls[i]) === -1) return false;'; //4
                function_name += '4';
            }
            source += 'return true;'; //5
            function_name += '5';
            let obj = {
                func: functionCache[function_name],
                tagName: tagName || "",
                classes: classes || "",
                attr_key: attr_key || "",
                value: value || ""
            };
            source = source || "";
            return pMatchFunctionCache[matcher] = obj;
        });
    }
    /**
     * Trying to advance match pointer
     * @param  {HTMLElement} el element to make the match
     * @return {bool}           true when pointer advanced.
     */
    advance(el) {
        if (this.nextMatch < this.matchers.length &&
            this.matchers[this.nextMatch].func(el, this.matchers[this.nextMatch].tagName, this.matchers[this.nextMatch].classes, this.matchers[this.nextMatch].attr_key, this.matchers[this.nextMatch].value)) {
            this.nextMatch++;
            return true;
        }
        return false;
    }
    /**
     * Rewind the match pointer
     */
    rewind() {
        this.nextMatch--;
    }
    /**
     * Trying to determine if match made.
     * @return {bool} true when the match is made
     */
    get matched() {
        return this.nextMatch == this.matchers.length;
    }
    /**
     * Rest match pointer.
     * @return {[type]} [description]
     */
    reset() {
        this.nextMatch = 0;
    }
    /**
     * flush cache to free memory
     */
    flushCache() {
        pMatchFunctionCache = {};
    }
}
exports.Matcher = Matcher;
// https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name
const kMarkupPattern = /<!--[^]*?(?=-->)-->|<(\/?)([a-z][-.0-9_a-z]*)\s*([^>]*?)(\/?)>/ig;
const kAttributePattern = /(^|\s)(id|class)\s*=\s*("([^"]+)"|'([^']+)'|(\S+))/ig;
const kSelfClosingElements = {
    area: true,
    base: true,
    br: true,
    col: true,
    hr: true,
    img: true,
    input: true,
    link: true,
    meta: true
};
const kElementsClosedByOpening = {
    li: { li: true },
    p: { p: true, div: true },
    b: { div: true },
    td: { td: true, th: true },
    th: { td: true, th: true },
    h1: { h1: true },
    h2: { h2: true },
    h3: { h3: true },
    h4: { h4: true },
    h5: { h5: true },
    h6: { h6: true }
};
const kElementsClosedByClosing = {
    li: { ul: true, ol: true },
    a: { div: true },
    b: { div: true },
    i: { div: true },
    p: { div: true },
    td: { tr: true, table: true },
    th: { tr: true, table: true }
};
const kBlockTextElements = {
    script: true,
    noscript: true,
    style: true,
    pre: true
};
/**
 * Parses HTML and returns a root element
 * Parse a chuck of HTML source.
 * @param  {string} data      html
 * @return {HTMLElement}      root element
 */
function parse(data, options) {
    const root = new HTMLElement(null, {});
    let currentParent = root;
    const stack = [root];
    let lastTextPos = -1;
    options = options || {};
    let match;
    while (match = kMarkupPattern.exec(data)) {
        if (lastTextPos > -1) {
            if (lastTextPos + match[0].length < kMarkupPattern.lastIndex) {
                // if has content
                const text = data.substring(lastTextPos, kMarkupPattern.lastIndex - match[0].length);
                currentParent.appendChild(new TextNode(text));
            }
        }
        lastTextPos = kMarkupPattern.lastIndex;
        if (match[0][1] == '!') {
            // this is a comment
            continue;
        }
        if (options.lowerCaseTagName)
            match[2] = match[2].toLowerCase();
        if (!match[1]) {
            // not </ tags
            let attrs = {};
            for (let attMatch; attMatch = kAttributePattern.exec(match[3]);) {
                attrs[attMatch[2]] = attMatch[4] || attMatch[5] || attMatch[6];
            }
            if (!match[4] && kElementsClosedByOpening[currentParent.tagName]) {
                if (kElementsClosedByOpening[currentParent.tagName][match[2]]) {
                    stack.pop();
                    currentParent = arr_back(stack);
                }
            }
            currentParent = currentParent.appendChild(new HTMLElement(match[2], attrs, match[3]));
            stack.push(currentParent);
            if (kBlockTextElements[match[2]]) {
                // a little test to find next </script> or </style> ...
                let closeMarkup = '</' + match[2] + '>';
                let index = data.indexOf(closeMarkup, kMarkupPattern.lastIndex);
                if (options[match[2]]) {
                    let text;
                    if (index == -1) {
                        // there is no matching ending for the text element.
                        text = data.substr(kMarkupPattern.lastIndex);
                    }
                    else {
                        text = data.substring(kMarkupPattern.lastIndex, index);
                    }
                    if (text.length > 0) {
                        currentParent.appendChild(new TextNode(text));
                    }
                }
                if (index == -1) {
                    lastTextPos = kMarkupPattern.lastIndex = data.length + 1;
                }
                else {
                    lastTextPos = kMarkupPattern.lastIndex = index + closeMarkup.length;
                    match[1] = 'true';
                }
            }
        }
        if (match[1] || match[4] ||
            kSelfClosingElements[match[2]]) {
            // </ or /> or <br> etc.
            while (true) {
                if (currentParent.tagName == match[2]) {
                    stack.pop();
                    currentParent = arr_back(stack);
                    break;
                }
                else {
                    // Trying to close current tag, and move on
                    if (kElementsClosedByClosing[currentParent.tagName]) {
                        if (kElementsClosedByClosing[currentParent.tagName][match[2]]) {
                            stack.pop();
                            currentParent = arr_back(stack);
                            continue;
                        }
                    }
                    // Use aggressive strategy to handle unmatching markups.
                    break;
                }
            }
        }
    }
    const valid = !!(stack.length === 1);
    if (!options.noFix) {
        const response = root;
        response.valid = valid;
        while (stack.length > 1) {
            // Handle each error elements.
            const last = stack.pop();
            const oneBefore = arr_back(stack);
            if (last.parentNode && last.parentNode.parentNode) {
                if (last.parentNode === oneBefore && last.tagName === oneBefore.tagName) {
                    // Pair error case <h3> <h3> handle : Fixes to <h3> </h3>
                    oneBefore.removeChild(last);
                    last.childNodes.forEach((child) => {
                        oneBefore.parentNode.appendChild(child);
                    });
                    stack.pop();
                }
                else {
                    // Single error  <div> <h3> </div> handle: Just removes <h3>
                    oneBefore.removeChild(last);
                    last.childNodes.forEach((child) => {
                        oneBefore.appendChild(child);
                    });
                }
            }
            else {
                // If it's final element just skip.
            }
        }
        response.childNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
                node.parentNode = null;
            }
        });
        return response;
    }
    else {
        const response = new TextNode(data);
        response.valid = valid;
        return response;
    }
}
exports.parse = parse;
