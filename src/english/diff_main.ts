import z from "zod"
import { diff_output_schema, generateDiff } from "./llm"
import { processTextForVoice, speech } from "./tts"
import path from "path"
import { diff_input_props_schema, renderDiff } from "./render"

const argv = Bun.argv
const world = argv.slice(2).join(" ")
if(world == "") {
    console.log("请给我一个单词:")
    console.log("bun run src/english/main.ts title")
    process.exit()
}

const result_data = await generateDiff(world)
let   result = diff_output_schema.parse(result_data)
result.list.push({
    tts_content: "你有想要学习的单词吗，评论区告诉我吧",
    english: "你想要学习什么<em>单词</em>?",
    chinese: "??"
})
console.log("filename",result.filename)
console.log(result.list)

const dirname = "diff" + Date.now().toString()
const base_path = `../video-generator/build/public/`
const role_id = "moss_audio_ad5baf92-735f-11f0-8263-fe5a2fe98ec8"
// 避免异步并发语音合成
let audio_list = [] as {
    url: string;
    seconds: number;
}[]
for(const [key,item] of result.list.entries()) {
    const relative_path = path.join(dirname,key+"en.mp3")
    const text_for_voice = processTextForVoice(item.tts_content)
    const audio = await speech(path.join(base_path,relative_path),text_for_voice,role_id)
    if(audio == null) throw new Error("impossible")
    
    console.log(relative_path,"->","Success")
    audio_list.push({
        url: relative_path,
        seconds: audio.seconds
    })
}
const result_with_audio = result.list.map((tts,key)=>{
    return {
        ...tts,
        audio: audio_list[key]!
    }
})


const input_props = diff_input_props_schema.parse({list:result_with_audio})

const info_path = path.join(base_path,dirname,"info.json")
await Bun.write(info_path,JSON.stringify(input_props))
console.log(info_path,"Success")

await renderDiff(input_props, result_data.filename)
