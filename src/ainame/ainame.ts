#! /usr/bin/env bun
import z from "zod"
/**
 * 解决起变量名苦难问题
 */

import { breakToEnd, orP, parse, pipeO, search } from "@diqye/myparser"
import { api_url, llm_key } from "../english/const"

export const schema = z.array(z.object({
    for: z.string().describe("给谁起的变量名"),
    function: z.tuple([
        z.string().describe("简洁版"),
        z.string().describe("正式版"),
        z.string().describe("严谨版")
    ]).describe("适用于函数的名字"),
    "var": z.tuple([
        z.string().describe("简洁版"),
        z.string().describe("正式版"),
        z.string().describe("严谨版")
    ]).describe("适用于变量的名字"),
    "type": z.tuple([
        z.string().describe("简洁版"),
        z.string().describe("正式版"),
        z.string().describe("严谨版")
    ]).describe("适用于类型的名字")
})).describe("可能是多个名字")

export async function detectFile(token:string) : Promise<Bun.BunFile | null> {
    let file = Bun.file(token)
    if(await file.exists() == false) return null
    return file
}
function parseJSON(llm_text:string) {
    let f = pipeO(
        ["answer",search("```json")],
        ["json",search("\n```")],
        ["rest",breakToEnd]
    )
    let result = parse(f,llm_text)
    if(result.status != "SUCCESS") {
        return {
            answer: "",
            json: llm_text,
            rest: ""
        }
        // console.error("解析失败:\n",llm_text)
        return null
    }
    return result.value
}
async function requestLLM(user_prompt:string) {
    let stdout = Bun.stdout
    // https://www.volcengine.com/docs/82379/1494384?lang=zh
    let request_data = {
        model: "doubao-seed-1-6-251015",
        stream:true,
        // 取值范围为 [0, 2]。
        temperature: 0.8,
        thinking: {type:"disabled"},
        messages: [{
            role: "system",
            content: "帮助程序员起变量名字",
        },{
            role: "user",
            content: `
                ## 我的需求
                ${user_prompt}

                ## 输出
                1. 函数：简介版，严禁版，超长版
                2. 变量：简介版，严禁版，超长版
                3. 类型：简介版，严禁版，超长版
                
                猜测用户可能要写函数、变量还是类型，然后起名字。
                如果猜不出来三个类别都起名字.
                用纯文本格式排版
            `
        }] satisfies {
            role: "system" | "user" | "assistant",
            content: string
        } []
    }
    let response = await fetch(api_url,{
         method: "POST",
            headers: {
                Authorization: "Bearer " + (llm_key ?? ""),
                "Content-Type": "application/json"
            },
            body: JSON.stringify(request_data)
    })
    if(response.ok == false) {
        console.error("error:",response)
        console.error(await response.text())
        return null
    }
    let reader = response.body?.getReader()
    if(reader == null) throw "Reader is null"
    while(true) {
        let result = await reader.read()
        if(result.done) break
        let str_m = new TextDecoder().decode(result.value)
        let last_partial = ""
        for(let str of str_m.split("\n")) {
             str = last_partial + str.trim()
            last_partial = ""
            if(str == "data: [DONE]") break
            if(str == "") continue
            let json:any
            try {
                json = JSON.parse(str.slice(6));
            } catch(e) {
                last_partial = str
                continue
                console.error(str.slice(6))
                throw "JSON parse error"
            }
            let usage = json?.usage
            if(usage) {
                console.log(Bun.color("pink","ansi-16m"))
                stdout.write("total_tokens = " + usage.total_tokens)
                stdout.write("\x1b[0m")
                continue
            }
            let content = json?.choices?.[0]?.delta?.content
            if(content == null) {
                console.error(str)
                throw "获取不到content"
            }
            stdout.write(content)
        }
    }
}

async function promptAIName(prompt:string) {
    await requestLLM("我要写一个功能请为我起名：" + prompt)
}
async function main() {
    const args =  Bun.argv.slice(2)
    if(args[0] == null) {
        console.log("请传入一个文件或给一个提示词")
        process.exit()
    }
    let file = await detectFile(args[0])
    // 走提示词
    if(file == null) {
        await promptAIName(args.join(" "))
        return
    }

    // 走文件
}

await main()