#! /usr/bin/env bun
import z from "zod"
import { api_url, llm_key } from "../english/const"
import { stdin } from "bun"
import inquirer from "inquirer"



let timmer: number = 0

type Message = {
    role: "system" | "user" | "assistant",
    content: string
}
function generateDefaultMessages(prompt:string) : Message[] {
    return [{
        role: "system",
        content: "你是一个变量名助手，用户使用的语言频率排名: Typescript Zig Haskell"
    },{
        role: "user",
        content: `
        ${prompt}

	根据上下文决定是变量还是函数，起一个变量名或函数名.
	回答简洁，直接起名字。 不要全部都起，只起你觉得最可能的语言最可能的类型的名字，只有一个名字
        `
    }]
}


async function requestLLM(messages: Message[]) {
    let stdout = Bun.stdout
    // https://www.volcengine.com/docs/82379/1494384?lang=zh
    let request_data = {
        model: "doubao-seed-1-6-251015",
        stream:true,
        // 取值范围为 [0, 2]。
        temperature: 0.8,
        thinking: {type:"disabled"},
        messages: messages
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
    let contentList = []
    stdout.write(Bun.color("oklch(88.5% 0.062 18.334)","ansi-16m") ?? "")
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
            contentList.push(content)
        }
    }
    stdout.write("\x1b[0m\n")
    
    const answer = await inquirer.prompt([{
        type: "input",
        name: "content",
        message: "ainame > "
    }]) 
    const value = answer.content.trim()
    if(value == "quit") {
        process.exit()
    }
    clearTimeout(timmer)
    timmer = setTimeout(()=>{
        process.exit()
    },1000 * 60 * 10) as any
    requestLLM([
        ...messages,
        {role:"assistant",content: contentList.join("")},
        {role:"user",content:value}
    ])
}

async function promptAIName(prompt:string) {
    await requestLLM(generateDefaultMessages(prompt))
}
async function main() {
    const args =  Bun.argv.slice(2)
    if(args[0] == null) {
        console.log("请给一个提示词")
        process.exit()
    }
    await promptAIName(args.join(" "))
}

await main()
