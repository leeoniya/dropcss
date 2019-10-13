import { equal } from '@zoroaster/assert'
import ServiceContext from 'zoroaster'
import Context from '../context'
import dropcss from '../../src/dropcss'

/**
 * @type {TestSuite1}
 */
const T = {
  context: [Context, ServiceContext],
  'Bulma-Bootstrap-Surveillance': {
    'stress test'({ readBench, vkbeautify }, { snapshotExtension }) {
      snapshotExtension('css')
      const html = readBench('stress/input', 'surveillance.html')
      const bootstrap = readBench('stress/input', 'bootstrap.min.css')
      const bulma = readBench('stress/input', 'bulma.min.css')
      const css = `${bootstrap}${bulma}`
      const { css: out } = dropcss({ html, css })
      const res = vkbeautify(out)
      try {
        equal(res, readBench('stress/output', 'dropcss.pretty.css'))
      } catch (err) {
        console.warn(err.message)
      }
      return res // visual snapshot testing
    }
  }
}
export default T


/** @typedef {Object<string, Test & TestSuite0>} TestSuite1 */
/** @typedef {Object<string, Test>} TestSuite0 */
/** @typedef {(c: Context, z: ServiceContext)} Test */