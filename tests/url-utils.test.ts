import assert from 'node:assert/strict'
import { getUrlWithoutRefreshParam } from '../lib/url-utils'

function run() {
  const withOnlyRefresh = getUrlWithoutRefreshParam('https://example.com/?refresh=session')
  assert.equal(withOnlyRefresh, '/')

  const withAdditionalParams = getUrlWithoutRefreshParam(
    'https://example.com/?refresh=session&foo=bar&feature=on',
  )
  assert.equal(withAdditionalParams, '/?foo=bar&feature=on')

  const refreshAfterOtherParams = getUrlWithoutRefreshParam(
    'https://example.com/?foo=bar&refresh=session&feature=on',
  )
  assert.equal(refreshAfterOtherParams, '/?foo=bar&feature=on')

  const withoutRefresh = getUrlWithoutRefreshParam('https://example.com/?foo=bar')
  assert.equal(withoutRefresh, '/?foo=bar')

  const withHash = getUrlWithoutRefreshParam('https://example.com/path?refresh=session#section')
  assert.equal(withHash, '/path')
}

run()
console.log('url-utils tests passed')
