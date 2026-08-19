import { stdin, stdout } from "bun"
import type { ListenInputProps } from "./const"
import { generateListen } from "./llm"
import { renderListen } from "./render"
import { imageGenerate, speech } from "./tts"
import { confirm, editor, input, select } from "@inquirer/prompts"

process.on("uncaughtException",error=>{
    if (error?.name === 'ExitPromptError') {
        console.log("你已退出程序")
        return
    }
    throw error
})

const keybindingsTheme = {
    keybindings: ["vim","emacs"] as const
}
const level_map = {
    "A2": "A2基础级",
    "B1": "B1进阶级"
}

const level  = await select({
    choices: [{
        value: "A2",
        name: level_map["A2"]
    },{
        value: "B1",
        name: level_map["B1"]
    }] as const,
    message: "选择级别",
    theme: keybindingsTheme
})

const code = await input({
    message: "课程编码",
    validate: text => text != "" ? true : "你必须提供一个编码"
})
const topic = await input({
    message: "输入主题",
    validate: text => text != "" ? true : "你必须提供一个主题"
})
const isContinue = await confirm({
    message: "是否继续?"
})
if(!isContinue) process.exit(0)

const dirname = "listen" + Date.now().toString()
const base_path = `../video-generator/build/public/`
const llm_data = await generateListen(level,topic)
if(llm_data == null) {
    process.exit()
}
console.log("A:",llm_data.image_a_prompt)
console.log("B:",llm_data.image_b_prompt)
console.log("role:",llm_data.tts_role)
if(typeof llm_data.tts_role != "string") {
    console.log("Role is not a string")
    process.exit()
}
console.log("content:",llm_data.tts_text)
console.log("description:\n",llm_data.description)

console.log("answer:",llm_data.answer)


const  iamge_a_work_path = dirname + "/card_a.jpeg"
const  iamge_b_work_path = dirname + "/card_b.jpeg"
const image_a_path = base_path + iamge_a_work_path
const image_b_path = base_path + iamge_b_work_path
const url_a = await imageGenerate(llm_data.image_a_prompt,"800x480")
if(url_a == null) {
    console.error("图片A生成失败",llm_data.image_a_prompt)
    process.exit()
}
const response = await fetch(url_a)
await Bun.write(image_a_path,response)
console.log("iamge_a:",image_a_path)

const url_b = await imageGenerate(llm_data.image_b_prompt,"800x480")
if(url_b == null) {
    console.error("图片B生成失败",llm_data.image_b_prompt)
    process.exit()
}
const response_b = await fetch(url_b)
await Bun.write(image_b_path,response_b)
console.log("iamge_b:",image_b_path)

const audio_work_path = dirname + "/audio.mp3"
const audio_path = base_path +audio_work_path
const audio = await speech(audio_path,llm_data.tts_text,llm_data.tts_role as any)
if(audio == null) {
    console.error("音频生成失败")
    process.exit()
}
console.log("audio:",audio_path)
const input_props : ListenInputProps = {
    title_subfix: level + "-" + code,
    question: "Which picture is correct?",
    imageA: iamge_a_work_path,
    imageB: iamge_b_work_path,
    audio: audio_work_path,
    audio_seconds: audio?.seconds ?? 3
}

const json_path = base_path + dirname + "/info.json"
console.log("保存JSON",json_path)
await Bun.write(json_path,JSON.stringify(input_props,undefined,4))
console.log("渲染中...")
await renderListen(input_props,llm_data.filename)

