#!/usr/bin/env bun

import COS from "cos-nodejs-sdk-v5";
import Buffer from "buffer"
import path from "path";
import { parseArgs } from "util";

let version = "0.0.1"
let secretId = process.env["zmexing_cdn_secretId"]
let secretKey = process.env["zmexing_cdn_secretkey"]
let args = Bun.argv.slice(2)
let parsed = parseArgs({
  args,
  options: {
    force: {
      type: "boolean",
      short: "f"
    },
    prefix: {
      type: "string",
      short: "p"
    },
    // 删除不提供短命令
    delete: {
      type: "string",
      // short: "d"
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
  console.log("simple_upload [options] filepath")
  console.log("\noptions:")
  console.log("--force      [-f] 如果文件存在覆盖上传")
  console.log("--prefix     [-p] 上传到哪个文件夹, 拼接规则/FE/bun/$prefix/$filename")
  console.log("--delete key [  ] 删除 示例：-d /FE/bun/xx/x/xx")
  console.log("--version    [-v] 打印版本号")
  console.log("--help       [-h] 帮助")
  process.exit(0)
}

let cos = new COS({
  SecretId: secretId,
  SecretKey: secretKey,
})

let config = {
    bucket: "static-1318590712",
    region: "ap-beijing",
    origin: "https://static.zmexing.com", //该域名覆盖文件情况下不能及时生效，带缓存。
    /**
     *  FE/bun/simple 文件夹内，更新只缓存一分钟，其他是30天。
     */
    baseFolder: parsed.values.prefix ? path.join("FE/bun",parsed.values.prefix) : "FE/bun/simple/",
}

if(parsed.values.delete) {
  let deleted = await cos.deleteObject({
    Region: config.region,
    Bucket: config.bucket,
    Key: parsed.values.delete
  })
  console.log("删除成功",parsed.values.delete,deleted)
  process.exit(0)
}
let file_path = parsed.positionals[0]
if(file_path == null) {
  console.log("缺少 filepath")
  process.exit(0)
}
let file_name = path.basename(file_path);
let key = path.join(config.baseFolder,file_name)

let data = await cos.getBucket({
    Bucket: config.bucket,
    Prefix: key,
    Region: config.region,
    MaxKeys: 1,
})

if(data.Contents.length != 0) {
  console.log("检测到文件已经存在",config.origin + "/" + key)
  if(parsed.values.force) {
    console.log("强制上传")
  } else {
    process.exit(0)
  }
}

await cos.putObject({
    Body: Buffer.Buffer.from(await Bun.file(file_path).bytes()),
    Bucket: config.bucket,
    Region: config.region,
    Key: key,
    // 进制缓存
    CacheControl: "no-store",
    Expires: new Date(0).toUTCString(),
});

// console.log(result)
console.log("上传成功",config.origin + "/" + key)





