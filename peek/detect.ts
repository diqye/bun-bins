export type ImageFormat = "png" | "jpeg" | "gif" | "webp" | "bmp" | "heic" | "tiff" | "avif" | "ico"
export type FileKind = "text" | "image" | "pdf" | "binary"

export type Detected = {
  kind: FileKind
  /** kind === "image" 时的具体格式 */
  imageFormat?: ImageFormat
}

const HEAD_BYTES = 8192

function ascii(b: Uint8Array, offset: number, len: number): string {
  let s = ""
  for (let i = 0; i < len; i++) s += String.fromCharCode(b[offset + i] ?? 0)
  return s
}

/** ISO BMFF 的 ftyp box 品牌(位于偏移 4),HEIC/AVIF 靠它区分 */
function ftypBrand(b: Uint8Array): string | null {
  if (ascii(b, 4, 4) !== "ftyp") return null
  return ascii(b, 8, 4)
}

const heicBrands = new Set(["heic", "heix", "hevc", "heim", "heis", "hevm", "hevs", "mif1", "msf1"])
const avifBrands = new Set(["avif", "avis"])

const imageTests: { format: ImageFormat; test: (b: Uint8Array) => boolean }[] = [
  { format: "png", test: (b) => ascii(b, 0, 4) === "\x89PNG" },
  { format: "jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { format: "gif", test: (b) => ascii(b, 0, 4) === "GIF8" },
  { format: "webp", test: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP" },
  { format: "bmp", test: (b) => ascii(b, 0, 2) === "BM" },
  { format: "tiff", test: (b) => ascii(b, 0, 4) === "II\x2a\x00" || ascii(b, 0, 4) === "MM\x00\x2a" },
  { format: "ico", test: (b) => b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0 },
  { format: "heic", test: (b) => heicBrands.has(ftypBrand(b) ?? "") },
  { format: "avif", test: (b) => avifBrands.has(ftypBrand(b) ?? "") },
]

/** 无 NUL 且无异常控制字符即视为文本 */
function looksTextual(b: Uint8Array): boolean {
  for (const c of b) {
    if (c === 0) return false
    if (c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d && c !== 0x0c && c !== 0x1b && c !== 0x08) return false
  }
  return true
}

export function detectFromBytes(head: Uint8Array): Detected {
  if (ascii(head, 0, 4) === "%PDF") return { kind: "pdf" }
  for (const { format, test } of imageTests) {
    if (test(head)) return { kind: "image", imageFormat: format }
  }
  return { kind: looksTextual(head) ? "text" : "binary" }
}

export async function detectFile(path: string): Promise<Detected> {
  const head = new Uint8Array(await Bun.file(path).slice(0, HEAD_BYTES).arrayBuffer())
  return detectFromBytes(head)
}
