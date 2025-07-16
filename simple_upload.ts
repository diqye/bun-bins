#!/usr/bin/env bun

import COS from "cos-nodejs-sdk-v5";
import Buffer from "buffer"
import path from "path";
import { parseArgs } from "util";

let version = "1.0.0"
let secretId = process.env["zmexing_cdn_secretId"]
let secretKey = process.env["zmexing_cdn_secretkey"]
let args = Bun.argv.slice(2)

let parseArgsProps = {
  args,
  options: {
    force: {
      type: "boolean",
      short: "f",
      help: "如果文件存在,强制覆盖"
    },
    hash: {
      type: "boolean",
      help: "计算文件hash作为文件名,保留文件后缀名,设置览器缓存Header,十年过期"
    },
    prefix: {
      type: "string",
      short: "p",
      help: "文件前缀路径,拼接规则 FE/bun/$prefix/$filename"
    },
    delete: {
      type: "string",
      short: "d",
      help: "删除 示例：-d  FE/bun/xx/x/xx"
    },
    version: {
      type: "boolean",
      short: "v",
      help: "版本信息"
    },
    help: {
      type: "boolean",
      short: "h",
      help: "打印帮助"
    },
    list: {
      type: "string",
      short: "l",
      help: "列出指定key下面的内容，最多100条. -l FE/bun/"
    },
    marker: {
      type: "string",
      short: "m",
      help: "和--list一起使用，从哪个key开始列出"
    }
  },
  allowPositionals: true
} as const
let parsed = parseArgs(parseArgsProps)

if(parsed.values.version) {
  console.log(version)
  process.exit(0)
}

if(parsed.values.help) {
  console.log("simple_upload [Options] filepath")
  console.log("依赖环境变量： $zmexing_cdn_secretId $zmexing_cdn_secretkey")
  console.log("version-" + version)
  console.table(parseArgsProps.options)
  // console.log("--force       [-f] 如果文件存在覆盖上传")
  // console.log("--list   key  [-l] 列出该key下内容，100条 eg: -l FE/bun/simple")
  // console.log("--marker key  [-l] 和--list一起使用，从marker位置开下列出100个")
  // console.log("--hash             计算文件hash作为key，保留文件后缀名，览器缓存头十年")
  // console.log("--prefix      [-p] 上传到哪个文件夹, 拼接规则 FE/bun/$prefix/$filename")
  // console.log("--delete  key [-d] 删除 示例：-d  FE/bun/xx/x/xx")
  // console.log("--version     [-v] 打印版本号")
  // console.log("--help        [-h] 帮助")
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
if(parsed.values.list != null) {
  let result = await cos.getBucket({
    Bucket: config.bucket,
    Region: config.region,
    Prefix: parsed.values.list,
    MaxKeys: 100,
    Delimiter: "/",
    Marker: parsed.values.marker
  })

  console.table(result.CommonPrefixes.map(a=>{
    return {
      key: a.Prefix,
      url: "--",
      last_modified: "dir"
    }
  }).concat(result.Contents.map(a=>{
    return {
      key: a.Key,
      url: config.origin + "/" + a.Key,
      last_modified: new Date(a.LastModified).toLocaleString()
    }
  })))
  if(result.IsTruncated == "true") {
    console.log("数据被截断，最多限制为100条\n next marker is",result.NextMarker)
  }
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





