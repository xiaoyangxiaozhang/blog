const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

function load(relative, overrides = {}, modules = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', relative), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  const state = { draws: [], revoked: [], reads: 0 }
  class Image {
    naturalWidth = overrides.width ?? 1280
    naturalHeight = overrides.height ?? 720
    set src(value) { queueMicrotask(() => overrides.decodeError ? this.onerror() : this.onload()) }
  }
  const canvas = {
    width: 0, height: 0,
    getContext: () => overrides.noContext ? null : { drawImage: (...args) => state.draws.push(args.slice(1)) },
    toBlob: cb => cb(overrides.blob === undefined ? new Blob([new Uint8Array(100)], { type: 'image/jpeg' }) : overrides.blob)
  }
  vm.runInNewContext(code, {
    exports, require: name => modules[name] || require(name), Image, File, Blob, FormData,
    queueMicrotask, console, URL: { createObjectURL: () => { state.reads++; return 'blob:test' }, revokeObjectURL: url => state.revoked.push(url) },
    document: { createElement: () => canvas }, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }
  })
  return { ...exports, state }
}
const photo = size => new File([new Uint8Array([255, 216, 255]), new Uint8Array(size - 3)], 'photo.jpg', { type: 'image/jpeg', lastModified: 123 })

test('pixel dimensions trigger compression below 1 MB, with no enlargement', async () => {
  const helper = load('src/utils/imageUpload.ts', { width: 4000, height: 1600 })
  const result = await helper.compressImage(photo(10000))
  assert.equal(result.size, 100)
  assert.deepEqual(Array.from(helper.state.draws[0]), [0, 0, 1920, 768])
  assert.equal(result.lastModified, 123)
  assert.equal(result.name, 'photo-compressed.jpg')
  assert.deepEqual(helper.state.revoked, ['blob:test'])
})
test('byte size triggers compression for a photo already within the dimension limit', async () => {
  const helper = load('src/utils/imageUpload.ts')
  await helper.compressImage(photo(2 * 1024 * 1024))
  assert.deepEqual(Array.from(helper.state.draws[0]), [0, 0, 1280, 720])
})
test('small photos and every keep-original upload return the same File', async () => {
  const helper = load('src/utils/imageUpload.ts', { width: 4000 })
  const original = photo(20000)
  assert.strictEqual(await helper.compressImage(original, { keepOriginal: true }), original)
  assert.equal(helper.state.reads, 0)
  const small = load('src/utils/imageUpload.ts')
  assert.strictEqual(await small.compressImage(original), original)
  assert.equal(small.state.draws.length, 0)
})
test('PNG screenshots, transparent images, WebP/APNG/GIF, SVG and video retain source bytes', async () => {
  const helper = load('src/utils/imageUpload.ts')
  for (const type of ['image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'video/mp4']) {
    const file = new File([new Uint8Array(2 * 1024 * 1024)], 'source', { type })
    assert.strictEqual(await helper.compressImage(file), file)
  }
  assert.equal(helper.state.reads, 0)
})
test('larger, invalid, failed or unsupported canvas output falls back and revokes URLs', async () => {
  const original = photo(1000)
  for (const overrides of [{ blob: null }, { blob: new Blob([new Uint8Array(2000)], { type: 'image/jpeg' }) }, { blob: new Blob(['png'], { type: 'image/png' }) }, { decodeError: true }, { noContext: true }]) {
    const helper = load('src/utils/imageUpload.ts', { width: 4000, ...overrides })
    assert.strictEqual(await helper.compressImage(original), original)
    assert.deepEqual(helper.state.revoked, ['blob:test'])
  }
  const helper = load('src/utils/imageUpload.ts')
  const invalid = new File(['not a JPEG'], 'fake.jpg', { type: 'image/jpeg' })
  assert.strictEqual(await helper.compressImage(invalid), invalid)
  assert.equal(helper.state.reads, 0)
})
test('session preference and explicit override control the actual multipart upload', async () => {
  const helper = load('src/utils/imageUpload.ts', { width: 4000 })
  const preference = { value: true }
  const uploaded = []
  const api = load('src/api/file.ts', {}, {
    '@/utils/imageUpload': helper,
    '@/utils/imageUploadPreference': { keepOriginalImages: preference },
    '@/utils/request': { __esModule: true, default: { post: async (url, form) => { uploaded.push(form.get('file')); return { file_url: '/test.jpg' } } } }
  })
  const file = photo(10000)
  await api.uploadFile(file)
  assert.equal(uploaded[0].size, file.size)
  assert.deepEqual(new Uint8Array(await uploaded[0].arrayBuffer()), new Uint8Array(await file.arrayBuffer()))
  await api.uploadFile(file, 'image', { keepOriginal: false })
  assert.equal(uploaded[1].size, 100)
})
test('keep-original large files preserve each byte through the existing chunk uploader', async () => {
  const helper = load('src/utils/imageUpload.ts')
  const chunks = []; let initialized
  const size = 5 * 1024 * 1024
  const api = load('src/api/file.ts', {}, {
    '@/utils/imageUpload': helper, '@/utils/imageUploadPreference': { keepOriginalImages: { value: false } },
    '@/utils/request': { __esModule: true, default: {
      post: async (url, body) => { initialized = body; return { upload_id: 'test', chunk_size: size, total_chunks: 3, uploaded_chunks: [] } },
      put: async (url, chunk) => { chunks.push(chunk); return { completed: chunks.length === 3, file: { file_url: '/original.jpg' } } }
    } }
  })
  const file = photo(11 * 1024 * 1024)
  await api.uploadFile(file, 'image', { keepOriginal: true })
  assert.equal(initialized.file_name, file.name)
  assert.equal(initialized.file_size, file.size)
  assert.deepEqual(new Uint8Array(await new Blob(chunks).arrayBuffer()), new Uint8Array(await file.arrayBuffer()))
})
test('RAW conversion cannot silently violate the keep-original choice', async () => {
  const api = load('src/api/file.ts', {}, {
    '@/utils/imageUpload': load('src/utils/imageUpload.ts'),
    '@/utils/imageUploadPreference': { keepOriginalImages: { value: true } }, '@/utils/request': { __esModule: true, default: {} }
  })
  const raw = new File([new Uint8Array([0x49, 0x49, 0x2a, 0])], 'misnamed.png', { type: 'image/png' })
  await assert.rejects(api.uploadFile(raw), /RAW\/TIFF/)
})
