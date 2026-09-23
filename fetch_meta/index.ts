#!/usr/bin/env bun

import {parseArgs} from "util"
import { fetchMeta } from "./fetch_meta_internal"
import path from "path"
let args = Bun.argv.slice(2)
let parseArgsProps = {
  args,
  options: {
    url: {
        type: "string",
        short: "u",
        help: "要抓取的url"
    },
    verbose: {
        type: "boolean",
        help: "显示详细信息"
    },
    logo: {
        type: "boolean",
        help: "是否下载logo到本地"
    },
    help: {
      type: "boolean",
      short: "h",
      help: "打印帮助"
    }
  },
  allowPositionals: false
} as const
let options = parseArgs(parseArgsProps)

if(options.values.help) {
    console.log("fetch_meta --url=xxxx")
    console.table(parseArgsProps.options)
    process.exit()
}

let url = options.values.url
if(url == null) {
    console.log("请提供URL: url=http://xxx.xx.com")
    process.exit()
}
let json = await fetchMeta(url,options.values.verbose)
console.log(json)
if(options.values.logo) {
    if(typeof json == "string") process.exit()
    let response = await fetch(json.logo)
    if(response.ok == false) {
        console.log("下载icon失败")
        process.exit()
    }

    let name = path.basename(json.logo)
    await Bun.file(name).write(response)
    console.log("Icon downloaded",name)

}
