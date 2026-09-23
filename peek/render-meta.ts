import type { Detected } from "./detect"

function humanSize(bytes: number): string {
  const units = ["B", "KiB", "MiB", "GiB", "TiB"]
  let n = bytes
  let u = 0
  while (n >= 1024 && u < units.length - 1) {
    n /= 1024
    u++
  }
  return u === 0 ? `${n} ${units[u]}` : `${n.toFixed(1)} ${units[u]}`
}

function hexdump(b: Uint8Array): string {
  const rows: string[] = []
  for (let off = 0; off < Math.min(b.length, 32); off += 16) {
    const hex = [...b.slice(off, off + 16)].map((x) => x.toString(16).padStart(2, "0")).join(" ")
    rows.push(`${off.toString(16).padStart(8, "0")}  ${hex}`)
  }
  return rows.join("\n")
}

export async function renderMeta(path: string, detected: Detected): Promise<void> {
  const f = Bun.file(path)
  const head = new Uint8Array(await f.slice(0, 32).arrayBuffer())

  const kind = detected.imageFormat ?? detected.kind
  process.stdout.write(`路径  ${path}\n类型  ${kind}\n大小  ${humanSize(f.size)}\n`)

  const file = Bun.spawnSync(["file", "-b", path], { stdout: "pipe", stderr: "ignore" })
  const desc = new TextDecoder().decode(file.stdout).trim().split("\n")[0]!
  if (desc) process.stdout.write(`描述  ${desc}\n`)

  process.stdout.write(`${hexdump(head)}\n`)
}
