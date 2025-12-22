
// https://www.volcengine.com/docs/82379/1494384
let reader = Bun.stdin.stream().getReader()
let stdout = Bun.stdout
let llm_key = Bun.env["huoshan_llm_key"]
let api_url = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
let system_content =`
根据用户信息输出适合的回答，回答格式。
根据上下文，若可以推导出用户信息，则补充或修改用户信息。

输出格式：
============ 用户信息 ==========
{s}
============ 你的回答 ===========
{s}

## 用户信息
1. 任务相关的上下文
    - 目标/意图: 
    - 场景/用途: 
    - 背景知识水平: 
2. 用户的偏好
    - 表达方式: 
    - 风格:
    - 输出格式: 
3. 用户的限制条件
    - 时间/精力：
    - 工具/环境：
    - 资源：
4. 长期的上下文
    - 历史对话和兴趣：
    - 目标演进：
    - 个性化偏好：
5. 隐含的语气和情绪
    - 情绪信号：
    - 沟通意图：
`
let functions = {
    "fun_t": (props:{question_id:number,level:number}) => {
        return "根据题意，该问题不适合用概括公式。"
    },
    "fun_l": (props:{question_id:number,level:number}) => {
        // let prefix = "本题的正确解法为：l1 -> l2 -> l3 , l 代表level,也就是说综合三个结果整理出答案\n"
        let prefix = ""
        /*
        本义指像鲸鱼一样大口吞食,像大海一样能够容纳万物,
        形容大量地、不加选择地接收,
        文中指"我"大量地、不加选择地阅读。
        */
        if(props.level == 1) {
            return prefix + "l1 = 像鲸鱼一样大口吞食,像大海一样能够容纳万物"
        }

        if(props.level == 2) {
            return prefix + "l2 = 形容大量地、不加选择地接收"
        }
        if(props.level == 3) {
            return prefix + 'l3 = 文中指"我"大量地、不加选择地阅读'
        }
        return "level 只是 1 2 3 4"
    }
}

// 创建LLM交互instance
async function createLLM(stream=true){
    // 上下文      
    // system: 语文老师, 包含题目信息和答案
    // Function calling： 
    // 1. t: 提取 
    // 2. s: 赏析 
    // 3. g: 概括 
    // 4. l: 理解 
    let context = {
                
        model: "doubao-1-5-pro-32k-250115",
        stream, 
        parallel_tool_calls:true,
        stream_options: {
            include_usage: true
        },
        temperature: 1,
        messages: [{
            role: "system",
            content: system_content
        },{
            role: "user",
            content: "你好"
        }] as any [],
        tools:[/*{
            "type": "function",
            "function": {
               "name": "fun_t",
               "description": "提取公式，对问题进行有效提取。",
               "parameters": {
                    type: "object",
                    properties: {
                        question_id: {
                            type: "number",
                            description: "问题id"   
                        },
                        level: {
                            type: "number",
                            description: "1 直接提取; 2 指代提取/映射提取；3 关系提取（逻辑关系）; 4 比较提取;"
                        },
                    },
                    required: ["question_id","level"]
                },
            }
        },{
            "type": "function",
            "function": {
                "name": "fun_l",
                "description": "理解公式。",
                "parameters": {
                    type: "object",
                    properties: {
                        question_id: {
                            type: "number",
                            description: "问题id"   
                        },
                        level: {
                            type: "number",
                            description: "1 本意理解; 2 扩展/引申理解；3 文中义理解; 4 中心义理解;"
                        },
                    },
                    required: ["question_id","level"]
                }
            }
        }*/] 
    }

    async function fetchLLM(data:any){
        return fetch(api_url,{
            method: "POST",
            headers: {
                Authorization: "Bearer " + (llm_key ?? ""),
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        })
    }
    async function output(resp:Response) : Promise<{
        type:"content",
        content:string []
    } | {
        type: "other",
        json: any
    }> {
        // 如果是block的方式
        if(stream == false) {
            let resp_json = await resp.json() as any
            let content = resp_json?.choices?.[0]?.message?.content
            let delta = resp_json?.choices?.[0]?.message 
            if(resp_json.usage) {
                console.log(Bun.color("pink","ansi-16m"))
                stdout.write("total_tokens = " + resp_json.usage.total_tokens)
                stdout.write("\x1b[0m\n")
            }
            if(delta?.tool_calls) {
                return {
                    type: "other",
                    json: delta
                }
            }
            if(content != null && content.length > 0) {
                stdout.write(content)
                return {
                    type: "content",
                    content: [content]
                }
            }
            console.log(JSON.stringify(resp_json))
            throw "unreachable"
        }
        // 流的方式
        let reader = resp.body?.getReader()
        if(reader == null) throw "Reader is null"
        let assistant_content = [] as string []
        let tool_calls = []
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
                let delta = json?.choices?.[0]?.delta 
                if(delta.reason) {
                    stdout.write(delta.reason)
                    continue
                }
                if(delta?.tool_calls) {
                    tool_calls.push(delta)
                    continue
                }
                if(content == null) {
                    console.error(str)
                    throw "获取不到content"
                }
                stdout.write(content)
                assistant_content.push(content)

                
            }
        }
        if(tool_calls.length != 0) {
            return {
                type: "other",
                json: tool_calls.reduce((a,b)=>{
                    a.tool_calls[0].function.arguments += b.tool_calls[0].function.arguments 
                    return a
                })
            }
        }
        return {
            type: "content",
            content: assistant_content
        }
    }

    // 初始化llm
    async function init() {
        let resp = await fetchLLM(context)
        let content = await output(resp)
        if(content.type != "content") throw "第一次必须返回正常文本"
        let list = content.content
        context.messages.push({
            role: "assistant",
            content: list.join("")
        })
        stdout.write("\n")
    }
    async function userInput(text?:string) {
        if(text) {
            context.messages.push({
                role: "user",
                content: text
            })
        }
        let resp = await fetchLLM(context)
        let content = await output(resp)
        if(content.type == "content") {
            context.messages.push({
                role: "assistant",
                content: content.content.join("")
            })
            stdout.write("\n")
            return
        }
        context.messages.push(content.json)
        for(let tool_call of content.json?.tool_calls) {
     
            stdout.write(Bun.color("teal","ansi-16m") + "\nFunction calling: " + tool_call?.function?.name + "\n")
            let args =  tool_call?.function?.arguments
            console.log("Props: " + args)
            if(args.length == 0) {
                console.error(tool_call)
                return 
            }
            let fns = functions as any
            let result = fns[tool_call?.function?.name](JSON.parse(tool_call?.function?.arguments))
            console.log("Return: ", result)
            stdout.write("\x1b[0m")
            context.messages.push({
                role: "tool",
                content: result,
                tool_call_id: tool_call.id
            })
        }
        await userInput()
    }
    function getContext(){
        return context
    }
    await init()
    return {
        userInput,
        getContext
    }
}

let llm = await createLLM(true)

while(true) {
    stdout.write("User => ")
    let result = await reader.read()
    if(result.done) break
    let value = new TextDecoder().decode(result.value).trim()
    if(value == "quit") break
    if(value == "print") {
        console.log(JSON.stringify(llm.getContext()))
        continue
    }
    stdout.write("LLM => ")
    await llm.userInput(value)    
    stdout.write("\n")
 }
reader.cancel()