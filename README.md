# bun-bins

用bun写的cli工具

在当前目录使用`bun link`，自动在全局`$PATH` 下添加`cli` 。

## 腾讯cos 上传工具
`simple_upload.ts`
```
simple_upload [options] filepath

options:
--force      [-f] 如果文件存在覆盖上传
--hash            计算文件hash作为路径上传，设置浏览器缓存头十年
--prefix     [-p] 上传到哪个文件夹, 拼接规则/FE/bun/$prefix/$filename
--delete key      删除 示例：-d /FE/bun/xx/x/xx
--version    [-v] 打印版本号
--help       [-h] 帮助
```

## 下载汽水音乐
```
download_qishui --url https://xxxx.cx.xx/x

options:
--url             汽水音乐分享的url
--version    [-v] 打印版本号
--help       [-h] 帮助
```