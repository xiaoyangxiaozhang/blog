// 只读取 MP3 的 ID3 标签，避免为提取封面把整首音频载入内存。
export async function extractMp3Cover(file: File): Promise<File | null> {
  if (!/\.mp3$/i.test(file.name)) return null
  const header = new Uint8Array(await file.slice(0, 10).arrayBuffer())
  if (header.length < 10 || header[0] !== 0x49 || header[1] !== 0x44 || header[2] !== 0x33) return null
  if (![2, 3, 4].includes(header[3]!)) return null

  let tagSize = 0
  for (const byte of header.subarray(6, 10)) {
    if (byte & 0x80) throw new Error('MP3 标签长度无效')
    tagSize = tagSize * 128 + byte
  }
  if (tagSize > 16 * 1024 * 1024 || tagSize + 10 > file.size) throw new Error('MP3 标签过大或不完整')

  const { default: MP3Tag } = await import('mp3tag.js')
  const tags = await MP3Tag.readBlob(file, { id3v1: false, mp4: false, aiff: false, aac: false })
  const pictures = tags.v2?.APIC || tags.v2?.PIC || []
  const formats: Record<string, { type: string; extension: string }> = {
    'image/jpeg': { type: 'image/jpeg', extension: 'jpg' },
    'image/jpg': { type: 'image/jpeg', extension: 'jpg' },
    jpg: { type: 'image/jpeg', extension: 'jpg' },
    'image/png': { type: 'image/png', extension: 'png' },
    png: { type: 'image/png', extension: 'png' },
    'image/webp': { type: 'image/webp', extension: 'webp' },
    'image/gif': { type: 'image/gif', extension: 'gif' }
  }
  const supported = pictures.filter(picture => picture.data.length && Object.hasOwn(formats, picture.format.toLowerCase()))
  const picture = supported.find(picture => picture.type === 3) || supported[0]
  if (!picture) return null
  const format = formats[picture.format.toLowerCase()]!
  return new File([Uint8Array.from(picture.data)], `${file.name.replace(/\.mp3$/i, '')}-cover.${format.extension}`, {
    type: format.type,
    lastModified: file.lastModified
  })
}
