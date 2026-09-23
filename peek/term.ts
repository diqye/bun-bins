export type ImageProto = "iterm" | "kitty" | "none"

/**
 * 环境变量探测终端图像协议,规则对齐 pi TUI 的 detectCapabilitiesFromEnvironment。
 * 不做 DA1 查询(需超时读回显,体验差),猜错可用 --proto= 强制指定。
 */
export function detectImageProto(override?: string): ImageProto {
  if (override === "iterm" || override === "kitty" || override === "none") return override

  const termProgram = (process.env.TERM_PROGRAM ?? "").toLowerCase()
  const term = (process.env.TERM ?? "").toLowerCase()

  // tmux/screen 不透传图像协议
  if (process.env.TMUX || term.startsWith("tmux") || term.startsWith("screen")) return "none"

  if (process.env.KITTY_WINDOW_ID || termProgram === "kitty") return "kitty"
  if (termProgram === "ghostty" || term.includes("ghostty") || process.env.GHOSTTY_RESOURCES_DIR) return "kitty"
  if (process.env.WEZTERM_PANE || termProgram === "wezterm") return "kitty"
  if (process.env.WARP_SESSION_ID || process.env.WARP_TERMINAL_SESSION_UUID || termProgram === "warpterminal") {
    return "kitty"
  }
  if (process.env.ITERM_SESSION_ID || termProgram === "iterm.app") return "iterm"
  return "none"
}

export type CellSize = { w: number; h: number }

/**
 * 发 CSI 16 t 查询终端真实 cell 像素尺寸(pi 同款),用于图片纵横比换算。
 * 不支持该查询的终端 120ms 超时后返回 null,调用方用默认值 9×18。
 */
export function probeCellSize(): Promise<CellSize | null> {
  if (!process.stdout.isTTY || !process.stdin.isTTY) return Promise.resolve(null)
  const stdin = process.stdin
  return new Promise((resolve) => {
    let buf = ""
    const done = (result: CellSize | null) => {
      clearTimeout(timer)
      stdin.off("data", onData)
      try {
        stdin.setRawMode(false)
      } catch {}
      stdin.pause()
      resolve(result)
    }
    const onData = (d: Buffer) => {
      buf += d.toString("latin1")
      const m = /\x1b\[6;(\d+);(\d+)t/.exec(buf)
      if (m) done({ h: Number(m[1]), w: Number(m[2]) })
    }
    const timer = setTimeout(() => done(null), 120)
    stdin.setRawMode(true)
    stdin.resume()
    stdin.on("data", onData)
    process.stdout.write("\x1b[16t")
  })
}
