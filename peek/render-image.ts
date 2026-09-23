import { unlink, rmdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { CellSize } from "./term"
import type { ImageFormat } from "./detect"
import type { ImageProto } from "./term"

type Dims = { width: number; height: number }

// iTerm2 协议原生支持的格式;kitty 协议只接受 png
const itermFormats = new Set(["png", "jpeg", "gif"])

function parseDims(b: Uint8Array, format: ImageFormat): Dims | null {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength)
  if (format === "png" && b.length >= 24) {
    // IHDR 固定在 PNG 签名 + 4 字节长度 + 4 字节类型之后
    return { width: dv.getUint32(16), height: dv.getUint32(20) }
  }
  if (format === "gif" && b.length >= 10) {
    return { width: dv.getUint16(6, true), height: dv.getUint16(8, true) }
  }
  if (format === "jpeg") return jpegDims(b)
  return null
}

/** 扫描 SOFn 段(marker C0-CF,排除 C4/C8/CC)取宽高 */
function jpegDims(b: Uint8Array): Dims | null {
  let i = 2
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i++
      continue
    }
    const marker = b[i + 1]!
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      i += 2
      continue
    }
    if (marker === 0xff) return null
    const segLen = (b[i + 2]! << 8) | b[i + 3]!
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (isSof) return { height: (b[i + 5]! << 8) | b[i + 6]!, width: (b[i + 7]! << 8) | b[i + 8]! }
    i += 2 + segLen
  }
  return null
}

// 探测不到真实 cell 尺寸时的默认值(与 pi TUI 默认一致)
const DEFAULT_CELL: CellSize = { w: 9, h: 18 }

/** 换算后的展示尺寸(列×行) */
type GridSize = { columns: number; rows: number }

/** 按真实 cell 尺寸把图像像素换算成行列,宽度上限 min(终端列数, 80),与 pi 的 calculateImageCellSize 同逻辑 */
function imageCellSize(dims: Dims | null, cell: CellSize): GridSize | null {
  if (!dims) return null
  const maxWidth = Math.min(process.stdout.columns || 80, 80)
  const width = Math.max(1, dims.width)
  const height = Math.max(1, dims.height)
  // 不放大:小图标保持自然尺寸(pi 会拉满 80 列,TUI 场景合适,CLI 会糊)
  const scale = Math.min(1, (maxWidth * cell.w) / width)
  const columns = Math.max(1, Math.min(maxWidth, Math.ceil((width * scale) / cell.w)))
  const rows = Math.max(1, Math.ceil((height * scale) / cell.h))
  return { columns, rows }
}

/** 借 macOS 自带的 sips 把不支持的格式(heic/tiff/webp/...)转成 png,顺便限最大边长避免巨图 */
async function toPngViaSips(path: string): Promise<Uint8Array> {
  const tmp = join(tmpdir(), `peek-${Date.now()}-${Math.random().toString(36).slice(2)}.png`)
  const r = Bun.spawnSync(["sips", "-s", "format", "png", "-Z", "1600", path, "--out", tmp], {
    stdout: "ignore",
    stderr: "pipe",
  })
  if (r.exitCode !== 0) {
    throw new Error(`peek: 无法转换为 png: ${new TextDecoder().decode(r.stderr)}`)
  }
  const bytes = new Uint8Array(await Bun.file(tmp).arrayBuffer())
  await unlink(tmp)
  return bytes
}

function emitIterm(bytes: Uint8Array, cols: number | null): void {
  const b64 = Buffer.from(bytes).toString("base64")
  const params = [`inline=1`, `size=${bytes.length}`]
  if (cols) params.push(`width=${cols}`)
  params.push(`height=auto`)
  // OSC 1337 内联图片,iTerm2 协议;只给列数,高度 auto 保持纵横比
  process.stdout.write(`\x1b]1337;File=${params.join(";")}:${b64}\x07\n`)
}

// 与 pi 同款随机大 id,避开其他应用的 image id 空间
function allocateKittyId(): number {
  return Math.floor(Math.random() * 4294967294) + 1
}

let kittyCleaned = false

/**
 * Kitty 图形协议,序列构造对齐 pi 的 encodeKitty:
 * a=T 传输且显示参数(c/r/i)直接挂在首块,单块(≤4096)不带 m,不发 a=p
 * (Ghostty 不遵守 a=T 只传不显,单独 a=p 会双重显示)。
 */
function emitKitty(png: Uint8Array, size: GridSize | null): void {
  // 进程内首张图前清掉历史残留的 image/placement,保证稳定复现
  if (!kittyCleaned) {
    kittyCleaned = true
    process.stdout.write(`\x1b_Ga=d,d=A,q=2\x1b\\`)
  }
  const b64 = Buffer.from(png).toString("base64")
  const params = ["a=T", "f=100", "q=2"]
  if (size) {
    params.push(`c=${size.columns}`)
    params.push(`r=${size.rows}`)
  }
  params.push(`i=${allocateKittyId()}`)

  if (b64.length <= 4096) {
    process.stdout.write(`\x1b_G${params.join(",")};${b64}\x1b\\`)
  } else {
    const CHUNK = 4096
    for (let off = 0; off < b64.length; off += CHUNK) {
      const last = off + CHUNK >= b64.length
      const head = off === 0 ? `${params.join(",")},m=1` : `m=${last ? 0 : 1}`
      process.stdout.write(`\x1b_G${head};${b64.slice(off, off + CHUNK)}\x1b\\`)
    }
  }
  process.stdout.write("\n")
}

export async function renderImage(
  path: string,
  format: ImageFormat | undefined,
  proto: ImageProto,
  { deleteAfter = false, cell = DEFAULT_CELL }: { deleteAfter?: boolean; cell?: CellSize } = {},
): Promise<void> {
  const needConvert = proto === "kitty" ? format !== "png" : !format || !itermFormats.has(format)
  const bytes = needConvert ? await toPngViaSips(path) : new Uint8Array(await Bun.file(path).arrayBuffer())
  if (deleteAfter) {
    // 字节已入内存,尽早清理临时文件(pdf 渲染产物)
    await unlink(path).catch(() => {})
    await rmdir(join(path, "..")).catch(() => {})
  }

  const dims = parseDims(bytes, needConvert ? "png" : format!)
  const size = imageCellSize(dims, cell)
  if (proto === "iterm") emitIterm(bytes, size ? size.columns : null)
  else emitKitty(bytes, size)
}
