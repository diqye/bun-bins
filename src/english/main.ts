import { stdout } from "bun"
import type { InputProps } from "./const"
import { generateDialogue } from "./llm"
import { renderEnglish } from "./render"
import { imageGenerate, omitEm, speechAudioList } from "./tts"

const argv = Bun.argv
const title = argv.slice(2).join(" ")
if(title == "") {
    console.log("请给我一个核心主题:")
    console.log("bun run src/english/main.ts title")
    process.exit()
}

const dirname = Date.now()
const base_path = `../video-generator/build/public/`
let llm_data = await generateDialogue(title)
if(llm_data == null) {
    process.exit()
}
console.log("Title:")
console.log(llm_data.title)
console.log("Title Description:")
console.log(llm_data.title_desc)
console.log("Description:")
console.log(llm_data.description)

console.log("\n图片:",llm_data.image_prompt)
let url = await imageGenerate(llm_data.image_prompt)
if(url == null) {
    console.log("图片生成失败")
    process.exit()
}
const image_path = base_path + dirname + "/bg.jpeg"

const response = await fetch(url)
await Bun.write(image_path,response)
console.log("图片:",image_path)

const audio_list = await speechAudioList(base_path + dirname,llm_data.dialogue)

const input_props : InputProps = {
    ...llm_data,
    bg: image_path.replace(base_path,""),
    dialogue: llm_data.dialogue.map((a,key)=>{
        let audio = audio_list[key]
        if(audio == null) {
            audio = {
                url: "",
                seconds: 0
            }
        }
        return {
            ...a,
            audio: {
                url: audio.url.replace(base_path,""),
                seconds: audio.seconds
            }
        }
    })
}

const json_path = base_path + dirname + "/info.json"
console.log("保存JSON",json_path)
await Bun.write(json_path,JSON.stringify(input_props,undefined,4))
console.log("渲染中...")
// let video_name = omitEm(input_props.title)
// .replaceAll(" ","_")
await renderEnglish(input_props)