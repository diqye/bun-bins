import { readdir } from "node:fs/promises"

export async function listDir(path: string): Promise<void> {
  const entries = await readdir(path, { withFileTypes: true })
  for (const e of entries) {
    process.stdout.write(e.isDirectory() ? `${e.name}/\n` : `${e.name}\n`)
  }
}
