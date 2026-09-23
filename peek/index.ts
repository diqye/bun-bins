#!/usr/bin/env bun
import { statSync } from "node:fs"
import { detectFile, type Detected } from "./detect"
import { detectImageProto, probeCellSize, type CellSize, type ImageProto } from "./term"
import { renderText } from "./render-text"
import { listDir } from "./render-dir"
import { renderImage } from "./render-image"
import { pdfToImages, type PageRange } from "./render-pdf"
import { renderMeta } from "./render-meta"

const USAGE = `peek — 在终端里查看任意文件

用法: peek [--proto=iterm|kitty|none] [--head=N|--last=N] <文件或目录>...

  文本原样打印; 图片/PDF 按终端协议可视化; 其余显示元信息; 目录列出条目
  --proto  强制指定图像协议,跳过自动探测(管道/未知终端自动降级为元信息)
  --head=N PDF 前 N 页(默认 1); --last=N PDF 后 N 页
`

type Parsed = { files: string[]; proto?: ImageProto; pdfRange: PageRange } | null

// 管道下游提前关闭(如 peek x | head)时 EPIPE 走 stream 的 error 事件异步抛出，静默退出
process.stdout.on("error", (e) => {
  if ((e as NodeJS.ErrnoException).code === "EPIPE") process.exit(0)
  throw e
})

function parseArgs(argv: string[]): Parsed {
  const files: string[] = []
  let proto: ImageProto | undefined
  const pdfRange: PageRange = {}
  for (const arg of argv) {
    if (arg === "-h" || arg === "--help") return null
    if (arg.startsWith("--proto")) {
      const v = arg.split("=")[1]
      if (v === "iterm" || v === "kitty" || v === "none") proto = v
      else {
        process.stderr.write(`peek: 无效的 --proto: ${v ?? "(缺值)"}\n`)
        return null
      }
    } else if (arg.startsWith("--head=") || arg.startsWith("--last=")) {
      const [k, v] = arg.split("=")
      const n = Number(v)
      if (!Number.isInteger(n) || n < 1) {
        process.stderr.write(`peek: ${k} 需要正整数,得到: ${v}\n`)
        return null
      }
      if (k === "--head") pdfRange.head = n
      else pdfRange.last = n
    } else if (arg.startsWith("-")) {
      process.stderr.write(`peek: 未知参数 ${arg}\n`)
      return null
    } else {
      files.push(arg)
    }
  }
  if (pdfRange.head !== undefined && pdfRange.last !== undefined) {
    process.stderr.write("peek: --head 与 --last 只能二选一\n")
    return null
  }
  if (files.length === 0) return null
  return { files, proto, pdfRange }
}

function header(path: string): void {
  process.stdout.write(`\x1b[1m==> ${path} <==\x1b[0m\n`)
}

/** 只有 TTY + 支持图像协议的终端才可视化,避免把转义序列灌进管道 */
function canVisualize(detected: Detected, proto: ImageProto): boolean {
  if (!process.stdout.isTTY || proto === "none") return false
  return detected.kind === "image" || detected.kind === "pdf"
}

async function show(
  path: string,
  multiple: boolean,
  proto: ImageProto,
  pdfRange: PageRange,
  cell: CellSize,
): Promise<boolean> {
  const st = statSync(path, { throwIfNoEntry: false })
  if (!st) {
    process.stderr.write(`peek: ${path}: No such file or directory\n`)
    return false
  }
  if (st.isDirectory()) {
    if (multiple) header(path)
    await listDir(path)
    return true
  }

  const detected = await detectFile(path)
  if (detected.kind === "text") {
    if (multiple) header(path)
    await renderText(path)
    return true
  }

  if (canVisualize(detected, proto)) {
    header(path)
    if (detected.kind === "image") {
      await renderImage(path, detected.imageFormat, proto, { cell })
      return true
    }
    const { pages, total } = await pdfToImages(path, pdfRange)
    if (pages.length > 0) {
      for (const p of pages) {
        // 多页时打页码标签,避免图片连成一片分不清页
        if (pages.length > 1) {
          const of = total ? `/${total}` : ""
          process.stdout.write(`\x1b[2m── 第 ${p.page}${of} 页 ──\x1b[0m\n`)
        }
        await renderImage(p.path, "png", proto, { deleteAfter: true, cell })
      }
      return true
    }
  }

  header(path)
  await renderMeta(path, detected)
  return true
}

const args = parseArgs(process.argv.slice(2))
if (!args) {
  process.stderr.write(USAGE)
  process.exit(2)
}

const proto = detectImageProto(args.proto)
// 有可视化需求才探测真实 cell 尺寸(发 CSI 16 t 查询,不支持的终端超时回落 9×18)
const cell = (await probeCellSize()) ?? { w: 9, h: 18 }
const multiple = args.files.length > 1
let ok = true
try {
  for (const [i, path] of args.files.entries()) {
    if (i > 0) process.stdout.write("\n")
    if (!(await show(path, multiple, proto, args.pdfRange, cell))) ok = false
  }
} catch (e) {
  // 管道下游提前关闭(如 peek x | head),静默退出不算错
  if ((e as NodeJS.ErrnoException).code === "EPIPE") process.exit(ok ? 0 : 1)
  throw e
}
process.exitCode = ok ? 0 : 1
