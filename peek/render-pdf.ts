import { existsSync, readdirSync } from "node:fs"
import { mkdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"

export type PageRange = { head?: number; last?: number }
export type PdfPages = { pages: { path: string; page: number }[]; total: number | null }

function has(cmd: string): boolean {
  return Bun.spawnSync(["sh", "-c", `command -v ${cmd}`]).exitCode === 0
}

async function pdfPageCount(pdfPath: string): Promise<number | null> {
  if (!has("pdfinfo")) return null
  const r = Bun.spawnSync(["pdfinfo", pdfPath], { stdout: "pipe", stderr: "ignore" })
  const m = /Pages:\s+(\d+)/.exec(new TextDecoder().decode(r.stdout))
  return m ? Number(m[1]) : null
}

/**
 * PDF 指定页转 png,附带页号与总页数(供调用方打页码标签)。
 * range 缺省 = 首页;head=N 前 N 页;last=N 后 N 页。
 */
export async function pdfToImages(pdfPath: string, range: PageRange): Promise<PdfPages> {
  const outDir = join(tmpdir(), `peek-pdf-${Date.now()}`)
  await mkdir(outDir, { recursive: true })
  const total = await pdfPageCount(pdfPath)

  // poppler 整页渲染,清晰且支持任意页区间
  if (has("pdftoppm")) {
    let from = 1
    let to = range.head ?? 1
    if (range.last) {
      if (total === null) {
        process.stderr.write("peek: 缺少 pdfinfo,无法定位末页,退回首页\n")
      } else {
        from = Math.max(1, total - range.last + 1)
        to = total
      }
    }
    const out = join(outDir, "page")
    const r = Bun.spawnSync(
      ["pdftoppm", "-png", "-r", "110", "-f", String(from), "-l", String(to), pdfPath, out],
      { stdout: "ignore", stderr: "ignore" },
    )
    if (r.exitCode === 0) {
      // pdftoppm 输出 page-1.png / page-02.png...,按页号数值排序
      const pages = readdirSync(outDir)
        .filter((f) => /^page-\d+\.png$/.test(f))
        .sort((a, b) => Number(/(\d+)/.exec(a)![1]) - Number(/(\d+)/.exec(b)![1]))
        .map((f) => ({ path: join(outDir, f), page: Number(/(\d+)/.exec(f)![1]) }))
      if (pages.length > 0) return { pages, total }
    }
  }

  // macOS 自带 QuickLook,但只有首页缩略图
  if (has("qlmanage")) {
    if ((range.head !== undefined && range.head > 1) || range.last) {
      process.stderr.write("peek: 未装 poppler(pdftoppm),仅能渲染首页\n")
    }
    const r = Bun.spawnSync(["qlmanage", "-t", "-s", "1400", "-o", outDir, pdfPath], {
      stdout: "ignore",
      stderr: "ignore",
    })
    const png = join(outDir, `${basename(pdfPath)}.png`)
    if (r.exitCode === 0 && existsSync(png)) return { pages: [{ path: png, page: 1 }], total }
  }

  return { pages: [], total: null }
}
