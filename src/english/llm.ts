import z, { json } from "zod"
import { api_url, llm_key, schema, type Dialogue, type HuoshanBlock, type LLMData } from "./const"
import { breakToEnd, parse, pipeO, search } from "@diqye/myparser"

const system_content = "你要生成一段简洁且地道的职场英语对话，对话场景需贴合职场实际，语言自然流畅，符合职场交流习惯，包含日常问候、观点表达、问题讨论与解决等元素 ，用词准确，整体对话逻辑清晰 。"
/*
你是抖音英语博主，通过对话传递英语有趣的内容。
## 对话原则:
1.  **Express your meaning precisely.**
    精准传递自己想表达的含义。（英语语境：用词、句式要贴合想传递的信息，避免歧义表达）
2.  **Special scenarios matter.**
    特殊场景至关重要。（英语语境：指口语俚语、正式文书、行业术语等特殊场景用法，是提升英语实用性的关键）
3.  **Favor reading input over passive memorization.**
    优先进行可理解性输入，而非机械背诵。（核心：英语输入的次数远多于孤立记单词，大量阅读/听力输入才是语言内化的关键）
4.  **Only one natural way to say it in a context.**
    特定语境下，表达同一件事应有且仅有一种自然的说法。（避免中式直译，优先学习母语者在该场景的惯用表达）
5.  **Overt mistakes are better than hidden misunderstandings.**
    显性错误优于隐性误解。（逻辑：开口说错能快速得到纠正，隐性的理解偏差会长期影响听说读写）
6.  **Pre - practice correction is better than in - use mistakes.**
    练习前纠错优于使用时出错。（递进逻辑：在造句、跟读阶段就修正错误，避免错误表达固化成习惯）
7.  **Incremental progress.**
    渐进式提升。（英语学习：不追求一次性速成，通过每天积累小目标持续提升语言能力）
8.  **Avoid short - term learning plateaus.**
    避免短期学习瓶颈。（核心：不满足于“背会几百个单词”的小成就，主动拓展听说读写全维度能力）
9.  **Reduce the amount of isolated knowledge to remember.**
    减少需记忆的孤立知识点。（英语学习：将单词、语法融入语境和场景记忆，避免死记硬背零散的语法规则）
10. **Focus on communication rather than rigid grammar rules.**
    聚焦沟通本身，而非刻板的语法规则。（强调：优先保证对方能理解你的表达，语法细节的打磨是次要优先级）
11. **Language input may be difficult; output practice must be consistent.**
    语言输入或许有难度，但输出练习必须坚持。（英语学习核心：输入积累可能会遇到瓶颈，但开口说、动手写的输出是真正掌握语言的必经之路）
12. **Context is a key resource for learning.**
    语境是学习的关键资源。（底层认知：脱离语境的单词和语法毫无意义，要像利用工具一样借助语境理解和运用英语）
13. **Together we serve the goal of fluent communication.**
    同心协力，以流利沟通为目标。（学习理念：不管是用英语交流、考试还是工作，所有学习行动的核心目标都是实现顺畅的语言沟通）
*/



// 备用图片风格
// Moebius (Jean Giraud)风格，极繁主义，极致表现力，大师级视角，浪漫感，细节完美，大师杰作。
// 日式赛璐璐
// 国风绘画
// emoji风
// BJD风格
// 点阵像素
// 镜面不锈钢材质
// 硅胶材质
// 图片提示词参考
// https://bytedance.larkoffice.com/wiki/MRB5wAL5gigQmWkjxmccTKYknVe
type LLMReturn = Promise<LLMData | null>
export async function generateDialogue(title:string):LLMReturn {
    return askLLM(system_content,`
## schema
## 标注原则
1. 优先性：优先识别句子中的各类固定短语（动词短语、名词短语、介词短语等），再处理独立单词；
2. 完整性：固定短语必须作为**不可分割的整体**进行标注，其中文释义需对应短语的整体语义，禁止拆分短语为单个单词分别标注；
3. 准确性：若单个单词无独立对应释义（仅在短语中具备特定含义），则不单独标注该单词，仅标注其所在的完整短语；
4. 一致性：所有句子的标注逻辑保持统一，以短语为核心单位，确保释义与标注单位的匹配精准。

请基于上述原则，为我完成英文句子的短语释义标注工作。


export let schema = z.object({
    // 要突出实用性。比如 “职场必知！项目预算超支该咋谈”，让用户一看就知道视频对自己有帮助，吸引他们点击观看。
    // 适当<em></em>标注
    title: z.string(),
    // 辅助标题，适当用<em></em>标注
    title_desc: z.string(),
    // 中文,发在抖音上的视频描述，关联话题 #职场英语 #职场实用英语 自己根据对话再补充一个
    description: z.string(),
    // 视频文件名字，英文|下划线|数字组成，不含后缀名
    filename: z.string(),    
    // 对话语言要简洁易懂，避免复杂生僻词汇与句式，像 “utilize” 就不如 “use” 好理解。 
    dialogue: z.array(z.object({
        // 谁在说话
        role: z.union([
          z.literal("conversational_female_1_v1").describe("A youthful and conversational female voice, natural and authentic. Perfect for vlogs, social media content, and casual storytelling."),
          z.literal("English_Persuasive_Man").describe("An Adult Male English voice with a general American accent, characterized by a Persuasive style."),
          z.literal("English_captivating_female1").describe("A captivating adult female voice with a general American accent, ideal for news reporting and documentary narration."),
          z.literal("moss_audio_6dc281eb-713c-11f0-a447-9613c873494c").describe("A sweet old granny, mumbling slightly, sharing life lessons with you with great warmth."),
          z.literal("moss_audio_570551b1-735c-11f0-b236-0adeeecad052").describe("A self-assured man with a German accent. He comes across as cocky."),
          z.literal("moss_audio_ad5baf92-735f-11f0-8263-fe5a2fe98ec8").describe("A young girl with a sweet voice, who sounds like she's thinking aloud as she talks to a friend."),
          z.literal("English_Debator").describe("A tough, middle-aged male voice with a general American accent, perfect for debates and assertive arguments.")
        ]),
        // 英文,遵循标注原则，使用<em></em>标注
        en: z.string(),
        // 中文,遵循标注原则，同样用<em></em>标注
        cn: z.string(),
        // 当前对话下的图片提示词，聚焦于角色表情
        // 
        image_prompt: z.string(),
    })),
    // 标题时间段的北背景图片提示词
    image_prompt: z.string(),
})

请以${title}为核心，设计对话，用于学习。
输出格式:

我的数据:
${"```"}json
按照 schema 填充标准JSON
${"```"}
        `)
}

//   z.literal("English_PlayfulGirl").describe("A playful female youth voice with a general American accent, ideal for cartoons and children's entertainment."),
export async function generateListen(input:string) {
    const schema = z.object({
        image_a_prompt: z.string().describe("选项A的图片提示词,海绵宝宝风格"),
        image_b_prompt: z.string().describe("选项B的图片提示词,海绵宝宝风格"),
        tts_text: z.string().describe("英语听力文本,问题开头,问题和选项图片相关引导用户选择A或B。"),
        answer: z.union([z.literal("A"),z.literal("B")]).describe("问题答案，答案只能是A和B"),
        tts_role: z.union([
            z.literal("moss_audio_ad5baf92-735f-11f0-8263-fe5a2fe98ec8").describe("A young girl with a sweet voice, who sounds like she's thinking aloud as she talks to a friend."),
            z.literal("English_ManWithDeepVoice").describe("An adult male with a deep, commanding voice and a general American accent, projecting authority and strength."),
            z.literal("English_Graceful_Lady").describe("A graceful and elegant middle-aged female voice with a classic British accent, exuding sophistication."),
            z.literal("English_Persuasive_Man").describe("An Adult Male English voice with a general American accent, characterized by a Persuasive style."),
        ]).describe("根据听力文本选择合适的角色"),
        description: z.string().describe("中文,发在抖音上的视频描述，有故事感,只说祝福语,避免涉及tts中内容,自动关联适合话题"),
        filename: z.string().describe("视频文件名字，英文|下划线|数字组成，不含后缀名"), 
    })
    return askLLM<z.input<typeof schema>>(
        "你是一个辅助生成英语听力测试内容的工具:\n" +
        "A2（基础级）：可理解与日常生活紧密相关的高频词汇、简单句子，如问路。\n" +
        "B1（进阶级）：能跟上正常语速对话，理解涉及个人兴趣、工作等常见话题内容。",
        `
请围绕 [${input}] 生成听力测试相关数据

## schema
export const schema = z.object({
    image_a_prompt: z.string().describe("选项A的图片提示词,海绵宝宝风格"),
    image_b_prompt: z.string().describe("选项B的图片提示词,海绵宝宝风格"),
    tts_text: z.string().describe("英语听力文本,问题开头,问题和选项图片相关引导用户选择A或B。"),
    answer: z.union([z.literal("A"),z.literal("B")]).describe("问题答案，答案只能是A和B"),
    tts_role: z.union([
        z.literal("moss_audio_ad5baf92-735f-11f0-8263-fe5a2fe98ec8").describe("A young girl with a sweet voice, who sounds like she's thinking aloud as she talks to a friend."),
        z.literal("English_ManWithDeepVoice").describe("An adult male with a deep, commanding voice and a general American accent, projecting authority and strength."),
        z.literal("English_Graceful_Lady").describe("A graceful and elegant middle-aged female voice with a classic British accent, exuding sophistication."),
        z.literal("English_Persuasive_Man").describe("An Adult Male English voice with a general American accent, characterized by a Persuasive style."),
    ]).describe("根据听力文本选择合适的角色"),
    description: z.string().describe("中文,发在抖音上的视频描述，有故事感,只说祝福语,避免涉及tts中内容,自动关联适合话题"),
    filename: z.string().describe("视频文件名字，英文|下划线|数字组成，不含后缀名"), 
})

## output
${"```json"}
[json data]
${"```"}
        `
    )
}
async function askLLM<R>(system:string,user:string):Promise<R> {
    // 参数说明
    // https://www.volcengine.com/docs/82379/1494384?lang=zh
    let request_data = {
        model: "doubao-seed-1-6-251015",
        stream:false,
        // 取值范围为 [0, 2]。
        temperature: 0.8,
        thinking: {type:"disabled"},
        messages: [{
            role: "system",
            content: system,
        },{
            role: "user",
            content: user
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
        console.log(request_data)
        console.error(await response.text())
        throw "impossible"
    }
    let data = await response.json() as HuoshanBlock
    let dialoge = parseLLMJSON(data.choices[0]?.message.content ?? "")
    if(dialoge == null) throw "impossible"
    let json = JSON.parse(dialoge.json)
    return json
}

function parseLLMJSON(llm_text:string) {
    let f = pipeO(
        ["answer",search("```json")],
        ["json",search("\n```")],
        ["rest",breakToEnd]
    )

    let result = parse(f,llm_text)
    if(result.status != "SUCCESS") {
        console.error("解析失败:\n",llm_text)
        return null
    }
    return result.value
}
