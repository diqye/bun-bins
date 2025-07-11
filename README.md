# bun-bins

用bun写的日常CLI

使用`bun link`， 自动软链到全局`$PATH` 下 。

## 腾讯cos 上传工具

`simple_upload.ts`

```
simple_upload [Options] filepath

Examples:
    simple_upload --hash your/file/path
    simple_upload --prefix a/b/c your/file/path
Options:
--force      [-f] 如果文件存在覆盖上传
--hash            计算文件hash作为key，保留文件后缀名，览器缓存头十年
--prefix     [-p] 上传到哪个文件夹, 拼接规则/FE/bun/$prefix/$filename
--delete key [-d] 删除 示例：-d /FE/bun/xx/x/xx
--version    [-v] 打印版本号
--help       [-h] 帮助
```

## svg2react.ts

将`svg xml`转为`React function component`。

使用：
```shell
cat light.svg | svg2react
```
### 额外做的事情
1. 格式化
2. 去除冗余
3. filter id唯一化，避免相同id冲突。
4. 去除`width`和`height`转为`viewBox`,如果有。

## 下载汽水音乐
```
download_qishui --url https://xxxx.cx.xx/x

options:
--url             汽水音乐分享的url
--version    [-v] 打印版本号
--help       [-h] 帮助
```