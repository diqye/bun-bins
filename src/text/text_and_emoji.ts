#!/usr/bin/env bun

import { gzipSync,gunzipSync, stdout } from "bun";
import { parseArgs } from "util";

let args = Bun.argv.slice(2)
let parseArgsProps = {
  args,
  options: {
    output: {
        type: "string",
        short: "o",
        help: "指定输出文件，默认打印到stdout中"
    },
    decode: {
        type: "boolean",
        short: "d",
        help: "解码，默认为编码"
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
    console.log("从stdin中读取数据编码为表情符号/解码为原始数据")
    console.table(parseArgsProps.options)
    process.exit()
}
// --------------- 开始业务逻辑 ----------------
// 是否压缩标志
let gzip_flag = String.fromCodePoint(0x1F9FF)
let convert_map = []
// [1F600,1F64F]
for(let i=0x1f600;i < 0x1f640 + 1;i++) {
    convert_map.push(String.fromCodePoint(i))
}
for(let i=0x1F940;i < 0x1F9FF;i++) {
    convert_map.push(String.fromCodePoint(i))
}

let in_buff = await Bun.stdin.bytes()
let out = options.values.output ? Bun.file(options.values.output) : Bun.stdout

// 如果是解码
if(options.values.decode) {
    let str = new TextDecoder().decode(in_buff)
    str = str.trim()
    let list = Array.from(str)
    // 如果是gzip压缩过的数据
    if(list?.[0] == gzip_flag) {
        let buff = new Uint8Array(list.length -1)
        for(let [i,item] of list.slice(1).entries()) {
            buff[i] = convert_map.indexOf(item)
        }
        let buff_unzip = gunzipSync(buff)
        await out.write(buff_unzip)
    } else {
        let buff = new Uint8Array(list.length)
        for(let [i,item] of list.entries()) {
            buff[i] = convert_map.indexOf(item)
        }
        await out.write(buff)
    }
    process.exit()
}

let in_buff_compressed = gzipSync(in_buff)
if(in_buff_compressed.byteLength > in_buff.byteLength) {
    for(let byte of in_buff){
        out.write(convert_map[byte] ?? "")
    }
} else {
    let writer = out.writer()
    writer.write(gzip_flag)
    for(let byte of in_buff_compressed){
        writer.write(convert_map[byte] ?? "")
    }
    writer.end()
}
Bun.stdout.write("\n")
