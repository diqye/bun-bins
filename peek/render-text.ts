/** 原样输出字节,不做任何解码,保证"原文打印" */
export async function renderText(path: string): Promise<void> {
  const bytes = new Uint8Array(await Bun.file(path).arrayBuffer())
  process.stdout.write(bytes)
}
