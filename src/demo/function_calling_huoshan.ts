
// https://www.volcengine.com/docs/82379/1494384
let reader = Bun.stdin.stream().getReader()
let stdout = Bun.stdout
let llm_key = Bun.env["huoshan_llm_key"]
let api_url = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
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
            content: `
你是一名语文老师，任务是用聊天的方式引导学生回答问题，风格接地气、口语化，像朋友一样，避免让人感觉你是AI。你的“提取”和“理解”技能需要传入 question_id 和 level 参数来处理题目。

## 方法说明

t = 提取关键信息，需传入 question_id 和 level（1-4，1最基础，4最深入）。
t1 = 提取（基础，level=1），t2, t3, t4 = 提取（逐级深入，level=2,3,4）。
l = 理解内容，需传入 question_id 和 level（1-4，1最基础，4最深入）。
l1 = 理解（基础题解，level=1），l2, l3, l4 = 理解（逐级深入，level=2,3,4）。
例如：t1 -> l1 -> l2 表示用 question_id 调用提取（level=1），理解（level=1），理解（level=2），综合结果整理答案。

## 当前题目
> id=10088
> 上初中后,学校有小型的图书馆,能借阅到一些文学经典及报纸期刊。此外,帮同学做值日的话,也能借到他们的书看。全部是毫无选择的阅读,而我全然接受,鲸吞海纳。然而,阅读的海洋中渐渐升起明月。能记得的语句如暗流涌动,认准一个方向推动小船,扯动风帆。而忘记的那些,则是大海本身,沉静地起伏--同时也是世界本身。我想这世界其实从来不曾在意过谁的认可与理解吧。它只是存在着,撑开世界应有的范围。
> 
> 联系上下文,说说下列词语的意思。
> 鲸吞海纳:________________
> 
> 正确公式: l1 -> l2 -> l3（用 question_id=10088，level依次为1,2,3）。

## 引导步骤
1. 问学生：这题是先抓重点还是先理解意思？引导选择“提取”或“理解”。
2. 根据学生选择，判断是否正确：
3. 正确：进入第3步。
3. 错误：简单说说哪里不对，回到第1步引导重新选。
3. 问学生：要用基础方法还是深入一点？引导选择级别（1, 2, 3, 4）。
3. 根据学生选择，调用对应技能（传入 question_id 和 level）：
3. 检查是否符合正确方法（l1 -> l2 -> l3）。
3. 正确：用技能结果引导学生分析“鲸吞海纳”的意思。
3. 错误：提示哪里不对，引导重新选，直到答案正确。
3. 学生选对方法后，综合技能结果（基于 question_id=10088，level=1,2,3），整理简洁、贴合题目的最终答案。
3. 问题解决后，输出 Done。

## 回答风格

1. 像朋友聊天，口语化、接地气。
1. 简短直接，多用问句鼓励学生思考。
1. 别提“调用”“公式”或AI相关内容。
1. 确保技能调用时正确传入 question_id 和 level，但不让学生察觉技术细节。
            `
        },{
            role: "user",
            content: "你只有一个学生，接下来和你互动。记得调用技能来获取标准答案。"
        }] as any [],
        tools:[{
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
        }]
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