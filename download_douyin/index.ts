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
    console.log("download_douyin --url https://xxxx.cx.xx/x")
    console.log("download_douyin  https://xxxx.cx.xx/x")
    console.log("\noptions:")
    console.log("--url             抖音视频的分享URL")
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
    if(/douyinvod\.com/.test(request.url()) == false) {
        route.continue()
        return
    }
    if(isHanding) {
        route.abort()
        return
    }
    isHanding = true
    const headers = request.headers()

    route.abort()

    const response = await fetch(request.url(), {
        method: "GET",
        referrer: headers["referer"],
        headers: {
            "accept": "*/*",
            "accept-language": "en",
            "range": "bytes=0-",
            "sec-ch-ua": "\"Not(A:Brand\";v=\"99\", \"Google Chrome\";v=\"133\", \"Chromium\";v=\"133\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"macOS\"",
            "sec-fetch-dest": "video",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site",
            "Referer": "https://www.douyin.com/",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        }
    })
    await saveMedia(response)
    try {
        await browser.close()
        console.log('正常关闭浏览器')
    } catch(e:any) {
        // console.error(e.message)
    }
    process.exit(0)
})
await page.goto(url_result.value).catch(() => {});

async function saveMedia(response:Response) {
    const dirname = path.join(
        os.homedir(),
        "dogdog.work",
        "douyin"
    )
    await mkdir(dirname,{recursive:true})
    const filename = path.join(dirname,Date.now()+".mp4")
    await Bun.write(filename,response)
    console.log(filename,"->","Success")
}
