
import z from "zod"

export const listen_schema = z.object({
    question: z.string().describe("标题"),
    imageA: z.string().describe("A选项图片"),
    imageB: z.string().describe("B选项图片"),
    audio: z.string().describe("听力音频"),
    audio_seconds: z.number(),
    title_subfix: z.string().describe("标题后缀")
})
export type ListenInputProps = z.input<typeof listen_schema>
/**
 * 1. 对于关键单词使用<em></em> tag 标注
 * 2. title,en和cn中均可能存在关键单词
 * 3. cn中关键单词是中文也就是和en中关键单词的翻译词汇
 */
export let schema = z.object({
    title: z.string(),
    title_desc: z.string(),
    description: z.string(),
    filename: z.string(),
    dialogue: z.array(z.object({
        role: z.union([
          z.literal("conversational_female_1_v1").describe("A youthful and conversational female voice, natural and authentic. Perfect for vlogs, social media content, and casual storytelling."),
          z.literal("English_Persuasive_Man").describe("An Adult Male English voice with a general American accent, characterized by a Persuasive style."),
          z.literal("English_captivating_female1").describe("A captivating adult female voice with a general American accent, ideal for news reporting and documentary narration."),
          z.literal("moss_audio_6dc281eb-713c-11f0-a447-9613c873494c").describe("A sweet old granny, mumbling slightly, sharing life lessons with you with great warmth."),
          z.literal("moss_audio_570551b1-735c-11f0-b236-0adeeecad052").describe("A self-assured man with a German accent. He comes across as cocky."),
          z.literal("moss_audio_ad5baf92-735f-11f0-8263-fe5a2fe98ec8").describe("A young girl with a sweet voice, who sounds like she's thinking aloud as she talks to a friend."),
          z.literal("English_Debator").describe("A tough, middle-aged male voice with a general American accent, perfect for debates and assertive arguments.")
        ]),
        en: z.string(),
        cn: z.string(),
        audio: z.object({
            url: z.string(),
            seconds: z.number()
        })
    })),
    // 图片提示词
    image_prompt: z.string(),
})

export let llm_key = Bun.env["huoshan_llm_key"]
export let api_url = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
export let minimax_key = process.env["MINIMAX_KEY"] ?? ""

export type Dialogue = z.input<typeof schema>
export type InputProps = Dialogue & {
  bg: string  
}
export type DialogueRole = Dialogue["dialogue"][0]["role"]
export type DialogueAudio = Dialogue["dialogue"][0]["audio"]
export type  LLMData = Dialogue & {
    dialogue: Omit<Dialogue["dialogue"][number],"audio">[],
}



export type HuoshanBlock = {
  choices: Choice[];
  created: number;
  id: string;
  model: string;
  service_tier: string;
  object: string;
  usage: Usage;
}
type Usage = {
  completion_tokens: number;
  prompt_tokens: number;
  total_tokens: number;
  prompt_tokens_details: Prompttokensdetails;
  completion_tokens_details: Completiontokensdetails;
}
type Completiontokensdetails = {
  reasoning_tokens: number;
}
type Prompttokensdetails = {
  cached_tokens: number;
}
type Choice = {
  finish_reason: string;
  index: number;
  logprobs: null;
  message: Message;
}
type Message = {
  content: string;
  role: string;
}

// minimax english voice id
// English_Graceful_Lady
// English_Insightful_Speaker
// English_radiant_girl
// English_Persuasive_Man
// moss_audio_6dc281eb-713c-11f0-a447-9613c873494c
// moss_audio_570551b1-735c-11f0-b236-0adeeecad052
// moss_audio_ad5baf92-735f-11f0-8263-fe5a2fe98ec8
// English_Lucky_Robot

// English_Whispering_girl asmr

export const english_voice_list = [
  "English_PlayfulGirl",
  "Japanese_Whisper_Belle",
  "moss_audio_6dc281eb-713c-11f0-a447-9613c873494c",
  "English_Whispering_girl_v3",
  "moss_audio_570551b1-735c-11f0-b236-0adeeecad052"
] as const
export const english_voice_robot = "English_Lucky_Robot"