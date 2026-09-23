# peek

在终端里查看任意文件,像 read 工具一样:

- 文本/代码: 原样输出
- 图片(png/jpeg/gif/webp/heic/tiff/avif/ico...): iTerm2 内联图片协议或 Kitty 图形协议显示,heic 等不支持的格式经 sips 转 png
- PDF: pdftoppm 整页渲染(`--head=N`/`--last=N` 选页区间),退到 macOS qlmanage 首页缩略图,再作为图片显示
- 其它二进制: 路径/类型/大小/file 描述/头部 hex
- 目录: 列出条目

## 用法

    peek <文件|目录>...
    peek --head=3 file.pdf            # PDF 前 3 页(默认 1)
    peek --last=2 file.pdf            # PDF 后 2 页
    peek --proto=iterm|kitty|none <file>   # 强制指定协议

协议自动探测:`TERM_PROGRAM` 为 iTerm.app/WezTerm/mintty 或 `LC_TERMINAL` 含 iTerm → iterm;
`TERM` 为 xterm-kitty/ghostty → kitty。仅当 stdout 是 TTY 才输出图像,管道中自动降级为元信息。

## 结构

入口 `index.ts` 只做参数解析与分发,各渲染模块互不依赖:

- `detect.ts` 魔数识别文件类型
- `term.ts` 终端图像协议探测
- `render-text.ts` / `render-dir.ts` / `render-image.ts` / `render-pdf.ts` / `render-meta.ts` 各管一种渲染
