const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const { createPinia, setActivePinia } = require('pinia')
const axios = require('axios')

function fixture() {
  let finishRefresh
  let refreshCount = 0
  const refreshResponse = new Promise(resolve => { finishRefresh = resolve })
  const api = { refreshToken: () => { refreshCount++; return refreshResponse } }
  const window = { __APP_CONFIG__: { apiUrl: 'https://audit.invalid' }, location: { pathname: '/login', replace() {} } }
  const modules = {}
  const load = (name, relative) => {
    const source = fs.readFileSync(path.join(__dirname, '..', relative), 'utf8').replace('import.meta.env.VITE_API_URL', 'undefined')
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    const exports = {}
    vm.runInNewContext(code, { exports, require: name => name === '@/api/user' ? api : modules[name] || require(name), localStorage: { removeItem() {} }, window, Blob, console })
    modules[name] = exports
    return exports
  }
  setActivePinia(createPinia())
  const store = load('@/stores/auth', 'src/stores/auth.ts').useAuthStore()
  const request = load('@/utils/request', 'src/utils/request.ts').default
  store.setTokens('old-session')
  return { store, request, finishRefresh, get refreshCount() { return refreshCount } }
}

test('logout discards a refresh that was already in flight', async () => {
  const f = fixture()
  const pending = f.store.refreshAccessToken()
  await new Promise(setImmediate)
  f.store.clearAuthState()
  f.finishRefresh({ access_token: 'stale-result' })
  assert.equal(await pending, false)
  assert.equal(f.store.checkAuth(), false)
})

test('a late refresh cannot overwrite a newer login', async () => {
  const f = fixture()
  const pending = f.store.refreshAccessToken()
  await new Promise(setImmediate)
  f.store.clearAuthState()
  f.store.setTokens('new-session')
  f.finishRefresh({ access_token: 'stale-result' })
  assert.equal(await pending, false)
  assert.equal(f.store.getAccessToken(), 'new-session')
})

test('concurrent 401 responses share refresh and each retry only once', async () => {
  const f = fixture()
  let retries = 0
  f.request.defaults.adapter = async config => {
    if (!config._retry) throw new axios.AxiosError('expired', 'ERR_BAD_REQUEST', config, null, { status: 401, data: {} })
    retries++
    assert.equal(config.headers.Authorization, 'Bearer rotated')
    return { status: 200, data: { code: 0, data: 'ok' }, config, headers: {} }
  }
  const pending = Promise.all([f.request.get('/one'), f.request.get('/two')])
  await new Promise(setImmediate)
  assert.equal(f.refreshCount, 1)
  f.finishRefresh({ access_token: 'rotated' })
  assert.deepEqual(await pending, ['ok', 'ok'])
  assert.equal(retries, 2)
})

test('a request waiting on refresh cannot clear or retry with a newer session', async () => {
  const f = fixture()
  let calls = 0
  f.request.defaults.adapter = async config => {
    calls++
    throw new axios.AxiosError('expired', 'ERR_BAD_REQUEST', config, null, { status: 401, data: {} })
  }
  const pending = assert.rejects(f.request.get('/private'))
  await new Promise(setImmediate)
  f.store.clearAuthState()
  f.store.setTokens('new-session')
  f.finishRefresh({ access_token: 'stale-result' })
  await pending
  assert.equal(f.store.getAccessToken(), 'new-session')
  assert.equal(calls, 1)
})

test('explicit disabled user state is preserved', () => {
  const f = fixture()
  f.store.setUserInfo({ id: 1, is_enabled: false })
  assert.equal(f.store.getUserInfo().is_enabled, false)
})
