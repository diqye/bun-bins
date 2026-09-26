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
    // 页面标题形如 《茉莉花》@汽水音乐，取歌名做文件名
    let name = (await page.title()).split("@")[0].trim() || String(Date.now())
    name = name.replace(/\//g, "-")
    await saveMedia(response, name)
    try {
        await browser.close()
    } catch(e:any) {
        console.error(e.message)
    }
    process.exit(0)
})
await page.goto(url_result.value);

async function saveMedia(response:Response, name: string) {
    const dirname = path.join(
        os.homedir(),
        "Movies",
        "qishui"
    )
    await mkdir(dirname,{recursive:true})
    const ext = (response.headers.get("content-type") ?? "").includes("video") ? "mp4" : "mp3"
    const file_path = path.join(dirname, `${name}.${ext}`)
    await Bun.write(file_path,response)
    console.log(file_path,"->","Success")
}
