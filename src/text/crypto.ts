import crypto from "crypto"
export function concatBuff(xs: Uint8Array[]) {
    let length = xs.reduce((a,b)=>a + b.byteLength,0)
    let data = new Uint8Array(length)
    let offset = 0
    for(let x of xs) {
        data.set(x,offset)
        offset += x.byteLength
    }
    return data
}
export async function encrypt(data: Uint8Array,password:string) : Promise<Uint8Array> {

    let key = await crypto.subtle.digest("SHA-1",new TextEncoder().encode(password))
    let key_uint8 = new Uint8Array(key)


    let iv = crypto.getRandomValues(new Uint8Array(3))
    let ciper = crypto.createCipheriv("aes-128-gcm",key_uint8.slice(0,16),iv,{
    
    })
    let encrypted = ciper.update(data)
    let encrypted_final = ciper.final()
    let tag = ciper.getAuthTag()
    let tag_buf = new Uint8Array(tag)

    let all = concatBuff([
        tag_buf,
        iv,
        encrypted,
        encrypted_final
    ])
    return all
}
export async function deencrypt(encrypted: Uint8Array,password:string) : Promise<Uint8Array<ArrayBuffer>> {
    let tag = encrypted.slice(0,16)
    let iv = encrypted.slice(16,16+3)
    let data = encrypted.slice(16+3)

    let key = await crypto.subtle.digest("SHA-1",new TextEncoder().encode(password))
    let key_uint8 = new Uint8Array(key)

    let deciper = crypto.createDecipheriv("aes-128-gcm",key_uint8.slice(0,16),iv)
    
    deciper.setAuthTag(tag)
    let buf = deciper.update(data)
    let buf_final = deciper.final()
    let all = concatBuff([buf,buf_final])
    return all
}