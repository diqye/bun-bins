import z from "zod";
import { speech } from "./tts";

const schema = () => z.object({
    cos: z.string().describe("desc")
})
console.log(schema.toString())
process.exit()
const role_id = "moss_audio_ad5baf92-735f-11f0-8263-fe5a2fe98ec8"
await speech("egao-english.mp3",`
    第八句加个in class，We must learn basic syntax of English for beginners in class，“我们必须在课堂上为初学者学习基础英语语法”，地点都安排上了，是不是像上课的场景啦？
`,
role_id)

// whisper_woman_1
// English_Whispering_girl_v3
// whisper_man
// Japanese_Whisper_Belle