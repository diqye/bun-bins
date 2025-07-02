#!/usr/bin/env bun

import path from "node:path"
import os from "node:os"
import { mkdir } from "node:fs/promises";
import { parseArgs } from "util";

let version = "0.0.1"
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

if(parsed.values.version) {
  console.log(version)
  process.exit(0)
}

if(parsed.values.help) {
  console.log("download_qishui --url https://xxxx.cx.xx/x")
  console.log("\noptions:")
  console.log("--url             汽水音乐分享的url")
  console.log("--version    [-v] 打印版本号")
  console.log("--help       [-h] 帮助")
  process.exit(0)
}
if(parsed.values.url == null) {
    console.log("缺少url参数")
    process.exit(0)
}
let response = await fetch(parsed.values.url ?? "");
let text_chunk = [] as string []
let rewriter = new HTMLRewriter().on("script[data-script-src=modern-inline]",{
    text(txt) {
        if(txt.text.startsWith("_ROUTER_DATA")) {
            text_chunk.push(txt.text.slice(txt.text.indexOf("{")))
        } else {
            text_chunk.push(txt.text)
        }
    }
})

await rewriter.transform(response).blob();
let data_str = text_chunk.join("")
let end_index = data_str.indexOf(";\n");
data_str = data_str.slice(0,end_index);
let music_data = JSON.parse(data_str)
downloadMp3(music_data)

function downloadMedia(url:string) {
    return fetch(url, {
    "headers": {
        "accept": "*/*",
        "accept-language": "en",
        "priority": "i",
        "range": "bytes=0-",
        "sec-ch-ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\", \"Google Chrome\";v=\"138\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"macOS\"",
        "sec-fetch-dest": "audio",
        "sec-fetch-mode": "no-cors",
        "sec-fetch-site": "cross-site",
        "sec-fetch-storage-access": "active"
    },
    "referrer": "https://music.douyin.com/",
    "body": null,
    "method": "GET",
    "mode": "cors",
    "credentials": "omit"
    });
}


// 《茉莉花》@汽水音乐 https://qishui.douyin.com/s/imF4sotY/

async function downloadMp3(data:any){
    let audio_obj = data.loaderData.track_page.audioWithLyricsOption
    let author = audio_obj.artistName
    let name = audio_obj.trackName
    let url = audio_obj.url

    let file_path = path.join(
        os.homedir(),
        "Movies",
        "qishui",
        author,
        name
    )
    let file_dir = path.dirname(file_path)
    await mkdir(file_dir,{recursive:true})
    let file = Bun.file(file_path+".json");
    let existed = await file.exists()
    if(existed) {
        console.log("文件已经存在",file_path)
        process.exit(0)
    } else {
        await file.write(Response.json(data))
        Bun.write(file_path+".mp3",await downloadMedia(url));
        console.log("下载成功",file_path)
    }


}