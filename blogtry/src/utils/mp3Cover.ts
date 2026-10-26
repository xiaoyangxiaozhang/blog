// 只读取 MP3 的 ID3 标签，音频原文件不做修改。
export async function readMp3Metadata(file: File): Promise<{ title: string; artist: string; cover: File | null; duration: number }> {
  const metadata = { title: '', artist: '', cover: null as File | null, duration: 0 }
  if (!/\.mp3$/i.test(file.name)) return metadata
  const header = new Uint8Array(await file.slice(0, 10).arrayBuffer())
  if (header.length === 10 && header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33) {
    if (![2, 3, 4].includes(header[3]!)) return metadata
    let tagSize = 0
    for (const byte of header.subarray(6, 10)) {
      if (byte & 0x80) throw new Error('MP3 标签长度无效')
      tagSize = tagSize * 128 + byte
    }
    if (tagSize > 16 * 1024 * 1024 || tagSize + 10 > file.size) throw new Error('MP3 标签过大或不完整')
  }

  const { default: MP3Tag } = await import('mp3tag.js')
  const [tags, duration] = await Promise.all([MP3Tag.readBlob(file, { mp4: false, aiff: false, aac: false }), readAudioDuration(file)])
  metadata.duration = duration
  metadata.title = (tags.title || tags.v1?.title || '').replace(/\0/g, '').trim().slice(0, 120)
  metadata.artist = (tags.artist || tags.v1?.artist || '').replace(/\0/g, '').trim().slice(0, 120)
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
  if (!picture) return metadata
  const format = formats[picture.format.toLowerCase()]!
  metadata.cover = new File([Uint8Array.from(picture.data)], `${file.name.replace(/\.mp3$/i, '')}-cover.${format.extension}`, {
    type: format.type,
    lastModified: file.lastModified
  })
  return metadata
}

// 本地读取时长，供同版本歌词匹配使用，不上传、重编码或修改文件。
function readAudioDuration(file: File): Promise<number> {
  if (typeof Audio === 'undefined') return Promise.resolve(0)
  return new Promise(resolve => {
    const audio = new Audio()
    const url = URL.createObjectURL(file)
    const finish = (duration = 0) => {
      clearTimeout(timeout)
      audio.onloadedmetadata = null
      audio.onerror = null
      audio.removeAttribute('src')
      audio.load()
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(duration) && duration > 0 ? duration : 0)
    }
    const timeout = setTimeout(() => finish(), 5000)
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => finish(audio.duration)
    audio.onerror = () => finish()
    audio.src = url
  })
}
