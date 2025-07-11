#!/usr/bin/env bun

import COS from "cos-nodejs-sdk-v5";
import Buffer from "buffer"
import path from "path";
import { parseArgs } from "util";

let version = "0.0.2"
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
    hash: {
      type: "boolean"
    },
    prefix: {
      type: "string",
      short: "p"
    },
    delete: {
      type: "string",
      short: "d"
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
  console.log("simple_upload [Options] filepath")
  console.log("\nOptions:")
  console.log("--force      [-f] 如果文件存在覆盖上传")
  console.log("--hash            计算文件hash作为key，保留文件后缀名，览器缓存头十年")
  console.log("--prefix     [-p] 上传到哪个文件夹, 拼接规则/FE/bun/$prefix/$filename")
  console.log("--delete key [-d] 删除 示例：-d /FE/bun/xx/x/xx")
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
    hashFolder: "FE/bun/hash/",
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
  console.log("simple_upload --hash filepath")
  process.exit(0)
}
if(parsed.values.hash) {
  let buffer = await Bun.file(file_path).arrayBuffer()
  let big_int = Bun.hash(buffer)
  let key = path.join(config.hashFolder,big_int.toString(16) + path.extname(file_path))
  let data = await cos.getBucket({
    Bucket: config.bucket,
    Prefix: key,
    Region: config.region,
    MaxKeys: 1,
  })
  if(data.Contents.length != 0) {
    console.log("文件已经存在",config.origin + "/" + key)
  } else {
    await cos.putObject({
        Body: Buffer.Buffer.from(await Bun.file(file_path).bytes()),
        Bucket: config.bucket,
        Region: config.region,
        Key: key,
        // 进制缓存
        CacheControl: "public, max-age=315360000",
        // Expires: new Date(0).toUTCString(),
    });
    console.log("上传成功",config.origin + "/" + key)
  }
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





