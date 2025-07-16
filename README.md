# bun-bins

用bun写的日常CLI

使用`bun link`， 自动软链到全局`$PATH` 下 。


## src/json2ts.ts
> 将`json`转换为`typescript`

```sh
~/p/t/bun-bins (master|✚3) $ curl ipinfo.io | json2ts 
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100   335  100   335    0     0    761      0 --:--:-- --:--:-- --:--:--   763
type Diqye = {
  ip: string;
  hostname: string;
  city: string;
  region: string;
  country: string;
  loc: string;
  org: string;
  postal: string;
  timezone: string;
  readme: string;
}
```
```sh
~/p/t/bun-bins (master|✚3) $ curl ipinfo.io
{
  "ip": "124.127.135.194",
  "hostname": "194.135.127.124.broad.bj.bj.static.163data.com.cn",
  "city": "Beijing",
  "region": "Beijing",
  "country": "CN",
  "loc": "39.9075,116.3972",
  "org": "AS4847 China Networks Inter-Exchange",
  "postal": "100000",
  "timezone": "Asia/Shanghai",
  "readme": "https://ipinfo.io/missingauth"
}⏎ 
```

## simple_upload.ts

上传腾讯`cos` 
`simple_upload.ts`

```
simple_upload [Options] filepath
依赖环境变量： $zmexing_cdn_secretId $zmexing_cdn_secretkey
version-1.0.0
┌─────────┬─────────┬───────┬───────────────────────────────────────────────────────────────────┐
│         │ type    │ short │ help                                                              │
├─────────┼─────────┼───────┼───────────────────────────────────────────────────────────────────┤
│   force │ boolean │ f     │ 如果文件存在,强制覆盖                                             │
│    hash │ boolean │       │ 计算文件hash作为文件名,保留文件后缀名,设置览器缓存Header,十年过期 │
│  prefix │ string  │ p     │ 文件前缀路径,拼接规则 FE/bun/$prefix/$filename                    │
│  delete │ string  │ d     │ 删除 示例：-d  FE/bun/xx/x/xx                                     │
│ version │ boolean │ v     │ 版本信息                                                          │
│    help │ boolean │ h     │ 打印帮助                                                          │
│    list │ string  │ l     │ 列出指定key下面的内容，最多100条. -l FE/bun/                      │
│  marker │ string  │ m     │ 和--list一起使用，从哪个key开始列出                               │
└─────────┴─────────┴───────┴───────────────────────────────────────────────────────────────────┘
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