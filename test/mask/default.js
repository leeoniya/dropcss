import makeTestSuite from '@zoroaster/mask'
import dropcss from '../../src/dropcss'

// todo: test [foo="val"], [foo='val'], :not([attr~=value])
// *-child assertions dont make to test in a unary selector since all root elements will be first/last/only "children"
const contextFreeUnarySel = makeTestSuite('test/result/0-context-free-unary-sel', {
  getResults() {
    let html, css
    if (!this.preamble) {
      [html, ...css] = this.input.split('\n')
      css = css.join('\n')
    } else {
      html = this.preamble
      css = this.input
    }
    ;[,html] = /content: '(.+?)'/.exec(html)
    return dropcss({ html, css })
  },
  mapActual({ css }) {
    return css
  }
})

export default {
  'Context-free, unary selector': contextFreeUnarySel
}