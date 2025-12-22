import { stdin, stdout } from "bun"
import type { ListenInputProps } from "./const"
import { generateListen } from "./llm"
import { renderListen } from "./render"
import { imageGenerate, speech } from "./tts"

let reader = stdin.stream().getReader()
async function readLine() {
    const value = await reader.read()
    if(value.done) process.exit()
    return new TextDecoder("utf-8").decode(value.value)
}
stdout.write("级别(A2、B1):")
const level_map = {
    "A2": "A2基础级：",
    "B1": "B1进阶级："
}

const level_raw = await readLine()
const level = level_raw.trim()
const level_description = level_map[level as keyof typeof level_map]
if(level_description == null) {
    console.log("选项不存在")
    process.exit()
}
console.log(level_description)

stdout.write("编号(001):")
const code_raw = await readLine()
const code = code_raw.trim()
console.log(code)
stdout.write("主题:")
const title_raw = await readLine()
const title = title_raw.trim()
console.log(title)
// const argv = Bun.argv
// const title = argv.slice(2).join(" ")
// if(title == "") {
//     console.log("请给我一个核心主题:")
//     console.log("bun run src/english/listen_main.ts title")
//     process.exit()
// }

const dirname = "listen" + Date.now().toString()
const base_path = `../video-generator/build/public/`
const llm_data = await generateListen(level_description + title)
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

await reader.cancel()