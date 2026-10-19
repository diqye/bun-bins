#!/usr/bin/env bun

import path from "node:path"
import os from "node:os"
import { mkdir } from "node:fs/promises";
import { parseArgs } from "util";
import { anyChar, composeP, fmap, manyTill, search, space } from "@diqye/myparser";
import { chromium } from "playwright";

let version = "0.2.0"
let args = Bun.argv.slice(2)
let parsed = parseArgs({
    args,
    options: {
        url: {
            type: "string"
        },
        version: {
            type: "boolean",
            short: "v"
        },
        help: {
            type: "boolean",
            short: "h"
        }
    },
    allowPositionals: true
})

if (parsed.values.version) {
    console.log(version)
    process.exit(0)
}

if (parsed.values.help) {
    console.log("download_qishui --url https://xxxx.cx.xx/x")
    console.log("download_qishui  https://xxxx.cx.xx/x")
    console.log("\noptions:")
    console.log("--url             汽水音乐分享的url")
    console.log("--json            json 格式输出")
    console.log("--version    [-v] 打印版本号")
    console.log("--help       [-h] 帮助")
    process.exit(0)
}
const input = parsed.values.url ? parsed.values.url : parsed.positionals.join(" ")

//《赤壁赋》@汽水音乐 https://qishui.douyin.com/s/iHQohgc1/
const f = fmap(
    composeP(manyTill(anyChar, space), search("https://")),
    xs => "https://" + xs[0].join("")
)
const url_result = f(input)
if (url_result.status != "SUCCESS") {
    console.log("解析URL失败",url_result)
    process.exit()
}

// channel: "chrome" 直接驱动本机安装的 Chrome，无需下载 playwright 浏览器
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const page = await browser.newPage();
let isHanding = false
page.route("**/*",async route => {
    const request = route.request()
    // 汽水的音频/视频都走 douyinvod.com，页面播放器以 media 类型加载
    if(request.resourceType() !== "media" || /douyinvod\.com/.test(request.url()) == false) {
        route.continue()
        return
    }
    if(isHanding) {
        route.abort()
        return
    }
    isHanding = true
    route.abort()

    const response = await fetch(request.url(), {
        method: "GET",
        headers: {
            "accept": "*/*",
            "range": "bytes=0-",
            "sec-fetch-dest": "audio",
            "sec-fetch-mode": "no-cors",
            "sec-fetch-site": "cross-site",
            "Referer": "https://music.douyin.com/",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        }
    })
    // 歌手/歌名/歌词都在分享页 SSR 数据 _ROUTER_DATA 中，页面渲染后必然存在，无需等待
    const info = await page.evaluate(() => {
        const t = (window as any)._ROUTER_DATA?.loaderData?.track_page?.audioWithLyricsOption
        return t
            ? { artist: t.artistName as string | undefined, track: t.trackName as string | undefined, lyrics: t.lyrics ?? null }
            : null
    })
    // 页面标题形如 《茉莉花》@汽水音乐，作为歌名 fallback
    let name = info?.track?.trim() || (await page.title()).split("@")[0]!.trim() || String(Date.now())
    name = name.replace(/\//g, "-")
    const artist = info?.artist?.trim().replace(/\//g, "-") || "未知歌手"
    const dirname = path.join(os.homedir(), "Movies", "qishui", artist, name)
    await saveMedia(response, dirname, name)
    if (info?.lyrics) {
        await saveLyric(info.lyrics, dirname, name)
    }
    try {
        await browser.close()
    } catch(e:any) {
        console.error(e.message)
    }
    process.exit(0)
})
await page.goto(url_result.value).catch(()=>void 0);

async function saveMedia(response:Response, dirname: string, name: string) {
    await mkdir(dirname,{recursive:true})
    const buf = new Uint8Array(await response.arrayBuffer())
    // content-type 不可靠（同一资源 audio/mp4、video/mp4 都可能返回），按魔数判别实际格式
    const ext = sniffExt(buf)
    const file_path = path.join(dirname, `${name}.${ext}`)
    await Bun.write(file_path, buf)
    console.log(file_path,"->","Success")
}

function sniffExt(buf: Uint8Array): string {
    // "ID3" 或 MPEG 帧同步(0xFF Ex) 为 mp3；ftyp brand M4A 为纯音频 m4a；其余 MP4 容器归 mp4
    if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return "mp3"
    if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return "mp3"
    if (new TextDecoder().decode(buf.slice(8, 12)) === "M4A ") return "m4a"
    return "mp4"
}

async function saveLyric(lyrics: unknown, dirname: string, name: string) {
    const file_path = path.join(dirname, `${name}.json`)
    await Bun.write(file_path, JSON.stringify(lyrics, null, 2))
    console.log(file_path,"->","Success")
}
