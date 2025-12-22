import { file, fileURLToPath } from "bun"
import path from "path"

let wasm = file(path.join(__dirname,"vector.wasm"))
let buff = await wasm.bytes()
let byte = buff.byteLength / 1024
console.log("wasm size",Math.trunc(byte) + "K")

let memory : WebAssembly.Memory
let wasm_ins = await WebAssembly.instantiate(buff,{
    env: {
        print: (a:number,len:number) => {
            let text = memory.buffer.slice(a,a+len)
            console.log("zig:",new TextDecoder().decode(text))
        }
    }
})

memory = wasm_ins.instance.exports.memory as WebAssembly.Memory
let mytest= wasm_ins.instance.exports.mytest as any
let myjson= wasm_ins.instance.exports.myjson as any
let alloc = wasm_ins.instance.exports.alloc as (n:number) => number
let free = wasm_ins.instance.exports.free as (ptr:number,len:number) => void



console.log("memory",(memory.buffer.byteLength / 1024).toFixed(2) + "K")

let data = new TextEncoder().encode("这是一段JS数据")
let ptr = alloc(data.byteLength);
new Uint8Array(memory.buffer).set(data,ptr)
mytest(ptr,data.byteLength)
free(ptr,data.byteLength)

let json_ptr_offset = myjson()
let json_buff = new Uint8Array(memory.buffer,json_ptr_offset,100)
console.log("from myjson",new TextDecoder().decode(json_buff))
free(json_ptr_offset,100)