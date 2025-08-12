
/**
 * 腾讯COS服务，f分散理CDN资源
 */

import type { BunRequest, RouterTypes } from "bun"
import COS from "cos-nodejs-sdk-v5";

async function parseConfig(req: BunRequest) {
    let config_json = await Bun.file("config/cos_server.json").json() as {
        secret_id: string,
        secret_key: string,
        bucket: string,
        region: string,
        origin: string,
        small_key_map: {
            [key in string]: string
        }
    }
    let key = req.headers.get("authorization")
    if (key == null) return "upload_key is required"
    let path = config_json.small_key_map[key]
    if (path == null) return "upload_key isn't existed"
    return {
        secret_id: config_json.secret_id,
        secret_key: config_json.secret_key,
        bucket: config_json.bucket,
        region: config_json.region,
        origin: config_json.origin,
        path
    }
}

async function upload(key:string,buff: Uint8Array,config: Awaited<ReturnType<typeof parseConfig>>) {
    if(typeof config == "string") throw "unreachable"
    let cos = new COS({
        SecretId:  config.secret_id,
        SecretKey: config.secret_key,
    })
    let data = await cos.getBucket({
        Bucket: config.bucket,
        Prefix: key,
        Region: config.region,
        MaxKeys: 1,
    })
    if (data.Contents.length != 0) {
        return Response.json({
            code: 202,
            message: "文件已存在 " + config.origin + "/" + key
        })
    } else {
        await cos.putObject({
            Body: Buffer.from(buff),
            Bucket: config.bucket,
            Region: config.region,
            Key: key,
            // 进制缓存
            CacheControl: "public, max-age=315360000",
            // Expires: new Date(0).toUTCString(),
        });
        return Response.json({
            code: 200,
            data: config.origin + "/" + key
        })
    }
}
// function routeWithConfig<R extends string>(routes:{
//     [key in keyof R]: RouterTypes.RouteValue<R>
// }): typeof routes{
//     let new_routes = {} as any
//     for(let key in routes) {
//         let route_val = routes[key]
//         if(typeof route_val != "function") {
//             new_routes[key] = route_val ?? false
//         }
//         new_routes[key] = (req:Bun.BunRequest,server:Bun.Server) => {
//             assert(typeof route_val == "function")
//             return route_val?.(req,server)
//         }
//     }
//     return new_routes
// }



let server = Bun.serve({
    port: 3088,
    // development: true,    
    routes: {
        "/file/*": {
            PUT: async req => {
                let config = await parseConfig(req)
                let url = new URL(req.url)
                if (typeof config == "string") {
                    return Response.json({
                        code: 500,
                        message: config
                    })
                }
                let cos_key = "FE/" + config.path + url.pathname
                let blob = await req.blob()
                try {
                    return await upload(cos_key,await blob.bytes(),config)
                } catch (e:any) {
                    return Response.json({code: 501,message: e.message})
                }

            }
        }
    },
    fetch: (req, server) => {
        // some code ...
        return Response.json("404", { status: 404 })
    }

})
console.log("COS Server is started with port", server.url.href)