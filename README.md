# bun-bins

Bun 写的日常 CLI 合集。

```sh
bun install && bun link
```

`bun link` 会把下表命令软链到全局 `$PATH`，改完代码即时生效，无需重新构建。

## 命令总表

| 命令 | 用途 |
|------|------|
| `peek` | 在终端里查看任意文件：文本直出、图片/PDF 可视化、二进制元信息 |
| `download_douyin` | 下载抖音视频 |
| `download_qishui` | 下载汽水音乐 |
| `simple_upload` | 上传/管理腾讯 COS |
| `svg2react` | SVG 转 React 组件 |
| `json2ts` | JSON 转 TypeScript 类型 |
| `text_and_emoji` | 文本与 emoji 互转（可加密） |
| `fetch_meta` | 抓取网站标题、LOGO、描述 |

## peek

像 read 工具一样在终端查看任意文件：

- 文本/代码原样输出；目录列出条目
- 图片(png/jpeg/gif/webp/heic/tiff/avif/ico)按 kitty/iTerm2 图形协议内联显示，序列与 cell 尺寸探测(`CSI 16 t`)对齐 pi TUI 的实现，heic 等格式自动经 `sips` 转 png
- PDF 用 pdftoppm 按页渲染(`--head=N`/`--last=N` 选页，多页带页码标签)，退到 qlmanage 首页缩略图
- 其它二进制显示路径/类型/大小/`file` 描述/头部 hex
- 管道或不支持图像的终端自动降级为元信息

```sh
peek file.png
peek --head=3 doc.pdf        # 前 3 页
peek --last=2 doc.pdf        # 后 2 页
peek --proto=kitty file.png  # 强制图像协议
peek a.txt b.pdf /bin/ls     # 多文件带标题头分隔
```

详见 [peek/README.md](peek/README.md)。

## simple_upload

上传/管理腾讯 COS，依赖环境变量 `$zmexing_cdn_secretId` `$zmexing_cdn_secretkey`。

```sh
simple_upload [options] filepath
  -f        文件存在时强制覆盖
  --hash    文件 hash 作为文件名并设置十年缓存
  -p dir    前缀路径，拼接规则 FE/bun/$prefix/$filename
  -d key    删除指定对象
  -l key    列出指定前缀下内容(最多100条)
  -m key    与 -l 配合，分页起点
```

## svg2react

SVG 转 React function component：格式化、去冗余、filter id 唯一化、`width/height` 归一为 `viewBox`。

```sh
cat light.svg | svg2react
```

## json2ts

JSON 转 TypeScript 类型，读 stdin。

```sh
curl -s ipinfo.io | json2ts
```

## text_and_emoji

文本/二进制与 emoji 序列互转，支持密码。

```sh
echo "hello" | text_and_emoji              # 编码
echo "😌_iso...😌" | text_and_emoji -d      # 解码
```

## fetch_meta

抓取网站标题、LOGO、描述。

```sh
bun run src/tool/fetch_meta.ts --url=https://www.dogdog.work
```

## download_douyin / download_qishui

```sh
download_douyin --url https://v.douyin.com/xxxx
download_qishui --url https://xxxx
```

## src/manage — COS 小 key 下发服务

`cos_server.ts` + `config/cos_server.json`，用于按短 key 下发 COS 对象，便于管理；`cos_client.zig` 为对应客户端。
