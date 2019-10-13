import { readFileSync } from 'fs'
import vkbeautify from '../bench/lib/vkbeautify'
import { join } from 'path'

export default class Context {
  /**
   * Reads the file from the filesystem
   * @param {string} path
   */
  readFile(path) {
    return readFileSync(path, 'utf8')
  }
  /**
   * Reads the file from the benchmark dir.
   * @param {string[]} path
   */
  readBench(...path) {
    const p = join(__dirname, '../bench', ...path)
    return this.readFile(p)
  }
  get vkbeautify() {
    return vkbeautify
  }
}