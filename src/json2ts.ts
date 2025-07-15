#! /usr/bin/env bun

import j2t from "json-to-ts"

let json = await Bun.stdin.text()
let str_list = j2t(JSON.parse(json),{useTypeAlias: true,rootName: "Diqye"})

str_list.forEach(str=>{
    console.log(str)
})