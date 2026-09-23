#!/usr/bin/env bun

import { gzipSync,gunzipSync } from "bun";
import { parseArgs } from "util";
import { deencrypt, encrypt } from "./crypto";

// 是否压缩
// ✔
let gzip_flag = String.fromCodePoint(0x2714)
// 是否加密
// ✓
let encrypted_flag = String.fromCodePoint(0x2713)

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
    password: {
        type: "string",
        short: "p",
        help: "设置密码"
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
let password = options.values.password ?? ""
// 如果是解码
if(options.values.decode) {
    let str = new TextDecoder().decode(in_buff)
    let password_needed = false
    str = str.trim()
    let list = Array.from(str)
     // 解密
    if(list?.[0] == encrypted_flag) {
        list = list.slice(1)
        password_needed = true
        if(password.length == 0) {
            console.log("请设置密码")
            process.exit(0)
        }
    }
    // 如果是gzip压缩过的数据
    if(list?.[0] == gzip_flag) {
        let buff = new Uint8Array(list.length -1)
        for(let [i,item] of list.slice(1).entries()) {
            buff[i] = convert_map.indexOf(item)
        }
        if(password_needed) try {
            buff = await deencrypt(buff,password)
        } catch {
            console.log("密码错误或数据被篡改")
            process.exit(0)
        }
        let buff_unzip = gunzipSync(buff)
        await out.write(buff_unzip)
    } else {
        let buff = new Uint8Array(list.length)
        for(let [i,item] of list.entries()) {
            buff[i] = convert_map.indexOf(item)
        }
        if(password_needed) try {
            buff = await deencrypt(buff,password)
        } catch {
            console.log("密码错误或数据被篡改")
            process.exit(0)
        }
        await out.write(buff)
    }
    process.exit()
}

let in_buff_compressed = gzipSync(in_buff)

if(in_buff_compressed.byteLength > in_buff.byteLength) {
    let writer = out.writer()
     // 加密逻辑
    if(password.length != 0) {
        in_buff = await encrypt(in_buff,password)
        writer.write(encrypted_flag)
    }
    for(let byte of in_buff){
        writer.write(convert_map[byte] ?? "")
    }
    writer.end()
} else {
    let writer = out.writer()
     // 加密逻辑
    if(password.length != 0) {
        in_buff_compressed = await encrypt(in_buff_compressed,password)
        writer.write(encrypted_flag)
    }
    writer.write(gzip_flag)
    for(let byte of in_buff_compressed){
        writer.write(convert_map[byte] ?? "")
    }
    writer.end()
}
Bun.stdout.write("\n")
