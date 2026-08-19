import z, { json } from "zod"
import { api_url, llm_key, schema, type Dialogue, type HuoshanBlock, type LLMData } from "./const"
import { breakToEnd, parse, pipeO, search } from "@diqye/myparser"
import { fn2string } from "./kit"

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

// z.literal("English_PlayfulGirl").describe("A playful female youth voice with a general American accent, ideal for cartoons and children's entertainment."),
// z.literal("moss_audio_ad5baf92-735f-11f0-8263-fe5a2fe98ec8").describe("A young girl with a sweet voice, who sounds like she's thinking aloud as she talks to a friend."),
// z.literal("English_ManWithDeepVoice").describe("An adult male with a deep, commanding voice and a general American accent, projecting authority and strength."),
// z.literal("English_Graceful_Lady").describe("A graceful and elegant middle-aged female voice with a classic British accent, exuding sophistication."),
// z.literal("English_Persuasive_Man").describe("An Adult Male English voice with a general American accent, characterized by a Persuasive style."),
export async function generateListen(level:string,topic:string) {
    const schema = z.object({
        image_a_prompt: z.string().describe("选项A的图片提示词,海绵宝宝风格"),
        image_b_prompt: z.string().describe("选项B的图片提示词,海绵宝宝风格"),
        tts_text: z.string().describe("英语听力文本,对于正确选项图片的描述,引导用户选择A图片或B图片。"),
        answer: z.union([z.literal("A"),z.literal("B")]).describe("问题答案，答案只能是A或B"),
        tts_role: z.union([
            z.literal("moss_audio_ad5baf92-735f-11f0-8263-fe5a2fe98ec8").describe("A young girl with a sweet voice, who sounds like she's thinking aloud as she talks to a friend."),
        ]).describe("根据听力文本选择合适的角色"),
        description: z.string().describe("中文,发在抖音上的视频描述，有故事感,只说祝福语,避免涉及tts中内容,自动关联适合话题"),
        filename: z.string().describe("视频文件名字，英文|下划线|数字组成，不含后缀名"), 
    })
    return askLLM<z.input<typeof schema>>(
        "A2基础级: 可理解与日常生活紧密相关的高频词汇、简单句子，如问路。\n" +
        "B1进阶级: 能跟上正常语速对话，理解涉及个人兴趣、工作等常见话题内容。",
        `
请围绕${level}等级 生成听力数据

今天的主题是: ${topic}

听力内容200字左右，两个选项相似不易作答。

## schema
export const schema = z.object({
    image_a_prompt: z.string().describe("选项A的图片提示词,动漫画风"),
    image_b_prompt: z.string().describe("选项B的图片提示词,动漫画风"),
    tts_text: z.string().describe("英语听力文本,对于正确选项图片的描述,引导用户选择A图片或B图片。"),
    answer: z.union([z.literal("A"),z.literal("B")]).describe("问题答案，答案只能是A或B"),
    tts_role: z.union([
        z.literal("moss_audio_ad5baf92-735f-11f0-8263-fe5a2fe98ec8").describe("A young girl with a sweet voice, who sounds like she's thinking aloud as she talks to a friend."),
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
        return {json:llm_text}
    }
    console.log(result.value.answer)
    return result.value
}


export const diff_output_schema_fn = ()=>z.object({
     filename: z.string().describe("File name, consisting of English letters, underscores, and numbers, without file extension"),
    list: z.object({
        english: z.string().describe("English text shown in screen of user, follow the annotation principles and use <em></em> tags for annotation"),
        chinese: z.string().describe("Chinese translate shown in screen of user, annotated with <em></em> tags in accordance with the annotations for the above English text"),
        tts_content: z.string()
        .describe("Chinese explanation plain text without tags. The explanation should be interesting, first talk about the changes, then naturally transition to the complete English sentence and Chinese"),
    })
    .array() .describe("Sentence-building list, starting from the initial word, ensure the integrity of the sentence each time some words is added, about 10 sentences")
})
export const diff_output_schema = diff_output_schema_fn()

const diff_system_propmpt = `
你是一名英文老师，你希望淡化英语的语法概念，通过连词成句的方式教导学生练习英语。
避免术语，采用生活化的普通语言来解释你想表达的东西。

## 标注原则
1. 优先性：优先识别句子中的各类固定短语（动词短语、名词短语、介词短语等），再处理独立单词；
2. 完整性：固定短语必须作为**不可分割的整体**进行标注，其中文释义需对应短语的整体语义，禁止拆分短语为单个单词分别标注；
3. 准确性：若单个单词无独立对应释义（仅在短语中具备特定含义），则不单独标注该单词，仅标注其所在的完整短语；
4. 一致性：所有句子的标注逻辑保持统一，以短语为核心单位，确保释义与标注单位的匹配精准。


## schema
${"```ts"}
${diff_output_schema_fn.toString()}
${"```"}

## Example
${"```json"}
[
  {
    english: "<em>visually</em>",
    chinese: "<em>视觉上</em>",
    tts_content: "现在我们有一个单词：visually，意思是“视觉上”。接下来我们要给它加个词，让它更完整~",
  },
  {
    english: "<em>visually appealing</em>",
    chinese: "<em>视觉上吸引人的</em>",
    tts_content: "我加了appealing，变成visually appealing，这是个常用短语，意思是“视觉上吸引人的”。",
  },
  {
    english: "<em>The visually</em> appealing <em>design</em>",
    chinese: "<em>这个视觉</em>上吸引人的<em>设计</em>",
    tts_content: "加了The和design 现在句子是The visually appealing design，意思是“这个视觉上吸引人的设计”。我们再给它加个动词，说说这个设计怎么样~",
  },
  {
    english: "The <em>visually</em> appealing design <em>catches attention</em>",
    chinese: "这个<em>视觉上</em>吸引人的设计<em>吸引注意力</em>",
    tts_content: "我加了个 catches attention，现在句子完整啦：The visually appealing design catches attention，中文是“这个视觉上吸引人的设计吸引注意力”。是不是很简单？",
  },
  ...more
]
${"```"}

`
const diff_user_prompt = (word:string) => `
每一句的讲解至少包含完整英文句子和中文翻译。

## 起始单词
${word}

## 输出格式

这里放你的简单思考过程

${"```json"}
这里放schema格式的JSON
${"```"}
`
export function generateDiff(word:string) {
    return askLLM<z.output<typeof diff_output_schema>>(diff_system_propmpt,diff_user_prompt(word))
}

export const explan_schema_fn = ()=>z.object({
    documentOverview: z.string().describe("一句话概括整个文档的核心诉求，语言通俗，外行能看懂"),
    segments: z.array(
        z.object({
            originalSentence: z.string().describe("待讲解的单句英文原文，无修改、无额外标红标识"),
            opening: z.string().describe("口语化开场过渡语，自然衔接上下文（如“咱们先看第一句”“接下来看第二句”）"),
            vocabularyExplanations: z.array(
                z.tuple([
                    z.string().describe("需要标红的词汇/短语（精准匹配原文中的对应内容，多单词短语需整体填写）"),
                    z.string().describe("该词汇的通俗讲解，避免专业术语，适配外行理解")
                ])
            ).describe("词汇级讲解数组，供程序后续自动标红使用，LLM无需添加标红标识"),
            sentenceExplanation: z.string().describe("整句讲解字符串，自然融合以下内容（口语化无冗余）：1. 纯英文原句（无标红标识）；2. 通顺的中文翻译；3. 外行能理解的核心意图解读（重点讲清句子实际诉求）")
        }).describe("正常句子")
    ).describe("按原句拆分的讲解片段数组，一个英文原句对应一个segment"),
})
export const explan_schema = explan_schema_fn()
export const explan_system = `
### 任务目标
将输入的英文技术文档内容逐句拆解，生成面向外行的口语化讲解内容，输出结构化JSON数据，兼顾词汇讲解、整句解读与使用灵活性，适配“逐句讲解展示”和“整体存档”两类使用场景。

### 输出结构 schema
输出的JSON需严格遵循以下schema定义，字段不得缺失、更名或新增，值的类型需完全匹配：
${"```ts"}
${fn2string(explan_schema_fn)}
${"```"}

### 核心执行规则
1. 分段原则：按英文原句自然拆分，一个句子为一个segments数组元素，避免跨句拼接；
2. 词汇讲解规则：
   - 优先拆解技术术语，不用专业词解释专业词；
   - 重复出现的词汇，后续讲解可简化表述；
   - vocabularyExplanations数组中填写的词汇/短语需与originalSentence中的内容完全精准匹配（多单词短语整体填写），供程序后续自动标红使用，LLM无需在原文中添加任何标红标识；
3. 整句讲解规则：
   - sentenceExplanation需自然融合“纯英文原句+中文翻译+核心意图解读”，无冗余内容；
   - 解读需结合技术文档上下文，让外行理解该句子的实际目的，而非仅翻译字面意思；
4. 语言风格：整体讲解内容需口语化、简洁化，杜绝啰嗦，符合“边讲边标红”的讲解节奏。

### 示例参考
#### 输入示例
Is it possible for Zig’s Io interface to queue up work that doesn’t need to be awaited/canceled?

#### 输出示例
{
  "documentOverview": "开发者询问Zig语言的Io接口能否处理无需等待或取消的后台任务",
  "segments": [
    {
      "originalSentence": "Is it possible for Zig’s Io interface to queue up work that doesn’t need to be awaited/canceled?",
      "opening": "咱们先来看第一句，核心是问Zig的Io接口能不能处理特定类型的任务：",
      "vocabularyExplanations": [
        ["Zig", "一种侧重高性能和安全性的系统编程语言，类似升级版C语言"],
        ["Io interface", "Zig里管理异步任务、事件循环的核心调度工具，相当于智能任务管理器"],
        ["queue up work", "把任务加入队列，让系统后台按顺序处理"],
        ["awaited/canceled", "异步编程操作，await是等任务做完再继续，cancel是中途终止任务"]
      ],
      "sentenceExplanation": "Is it possible for Zig’s Io interface to queue up work that doesn’t need to be awaited/canceled? 这句话翻译成中文是“Zig的Io接口能否排队处理无需等待/取消的任务？”，核心是提问者想知道，能不能让Zig的任务调度器，处理那些不用盯着等完成、也不用中途叫停的后台任务。"
    }
  ]
}
`
export function generateExplan(text:string) {
    return askLLM<z.output<typeof explan_schema>>(explan_system,text)
}


()=>{
    const schema = z.object({
        totalInFrames: z.number().describe("视频总时长，单位为固定30fps的帧"),
        fps: z.literal(30).describe("固定30fps"),
        width: z.number().describe("视频宽度"),
        height: z.number().describe("视频高度"),
        storyboardList: z.array(z.object({
            durationInFrames: z.number().describe("分镜周期"),
            muteVideo: z.boolean().describe("video设置为静音"),
            video: z.string().optional().describe("视频url,可选,不足分镜周期循环播放，超过周期截断"),
            image: z.string().optional().describe("图片url,可选"),
            audio: z.string().optional().describe("音频url,可选"),
        }).describe(`
            分镜列表
            优先显示video，若video为null则展示image
            同时播放video和audio的声音,若只播放video的声音，audio设置为null
        `)),
        subtitleList: z.array(z.object({
            text: z.string().describe("字幕文本"),
            startInFrames: z.number().describe("开始帧"),
            endInFrames: z.number().describe("结束帧")
        }))
    })
}


