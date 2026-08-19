import { llm_key, minimax_key, type Dialogue, type DialogueAudio, type DialogueRole, type LLMData } from "./const";

export function omitEm(text:string) {
    return text.replaceAll("<em>","").replaceAll("</em>","")
}
export function processTextForVoice(text:string) {
    return text
    .replaceAll("……","什么什么")
    .replaceAll("...","什么什么")
    .replaceAll("…","怎么样怎么样")
    .replaceAll("~","")
    .replaceAll("～","")
}

export function getVoice(role:Role) {
    return role
    // return role.voice_id
}
type Role = Dialogue["dialogue"][number]["role"] 
type AudioType = Dialogue["dialogue"][number]["audio"] 
export async function speech(filename:string,text:string,role: Role,emotion?:string ):Promise<AudioType | null>{
    let voice_id = getVoice(role)
    let tts_text = omitEm(text)
    // 文档
    // https://platform.minimaxi.com/docs/api-reference/speech-t2a-http
    let response = await fetch("https://api.minimaxi.com/v1/t2a_v2", {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + minimax_key,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "model": "speech-2.6-hd",
            "text": tts_text,
            "stream": false,
            "voice_setting": {
                "voice_id": voice_id,
                "speed": 1,
                "vol": 1,
                "pitch": 0,
                emotion
            },
            "pronunciation_dict": {
                "tone": [
                    // "处理/(chu3)(li3)",
                    // "危险/dangerous"
                ]
            },
            // "audio_setting": {
            //     "sample_rate": 32000,
            //     "bitrate": 128000,
            //     "format": "mp3",
            //     "channel": 1
            // },
            "subtitle_enable": false
        })
    })
    if (response.ok == false) {
        console.log(response)
        return null
    }

    let json = await response.json() as any
    let audio_hex = json?.data?.audio
    if (audio_hex == null) {
        console.log(json)
        return null
    }

    let seconds = json?.extra_info?.audio_length / 1000

    await Bun.write(filename, Buffer.from(audio_hex, "hex"))
    return {
        url: filename,
        seconds
    }
}

type R = Promise<DialogueAudio[]>
export async function speechAudioList(dir_name:string,en_list:{en:string,role:Role}[]): R {
    let list: DialogueAudio[] = []
    for (const [key,item] of en_list.entries()) {
        let filename = dir_name + "/" + key + ".mp3"
        list.push(await speech(filename,item.en,item.role) ?? {
                url: "",
                seconds: 0
        })
        console.log("音频:",filename)
    }
    return list
}

/**
 * 
 * @param prompt 
 * @param size  1080x1440
 * @returns 
 */
export async function imageGenerate(prompt: string,size?:string) : Promise<string | null> {
     let response = await fetch("https://ark.cn-beijing.volces.com/api/v3/images/generations", {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + llm_key,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            /**
             * 模型输出结果与prompt的一致程度，即生成图像的自由度；值越大，模型自由度越小，与用户输入的提示词相关性越强。
             * 取值介于[1, 10]之间
             */
            guidance_scale: 2.5,
            // model: "doubao-seedream-4-0-250828",
            model: "doubao-seedream-3-0-t2i-250415",
            prompt,
            response_format: "url",
            seed: 88,
            watermark: false,
            size: size ?? "1080x1440"
        })
    })
    if(response.ok == false) {
        console.error("Generate image error",response)
        console.error(await response.text())
        return null
    }
    let data = await response.json() as any
    if(data?.data?.length != 0) {
        // console.log(data)
        return data.data[0].url
    }
    console.error("Generate image error 2",data)
    return null
}

// export async function jimengImage(prompt: string) : Promise<string | null> {
//      let response = await fetch("https://visual.volcengineapi.com?Action=CVSync2AsyncSubmitTask&Version=2022-08-31", {
//         method: "POST",
//         headers: {
//             "Authorization": llm_key ?? "",
//             "X-Date": 
//             "Content-Type": "application/json"
//         },
//         body: JSON.stringify({
//             /**
//              * 模型输出结果与prompt的一致程度，即生成图像的自由度；值越大，模型自由度越小，与用户输入的提示词相关性越强。
//              * 取值介于[1, 10]之间
//              */
//             guidance_scale: 2.5,
//             // model: "doubao-seedream-4-0-250828",
//             model: "doubao-seedream-3-0-t2i-250415",
//             prompt,
//             response_format: "url",
//             seed: 88,
//             watermark: false,
//             size: "1080x1440"
//         })
//     })
//     if(response.ok == false) {
//         console.error("Generate image error",response)
//         console.error(await response.text())
//         return null
//     }
//     let data = await response.json() as any
//     if(data?.data?.length != 0) {
//         console.log(data)
//         return data.data[0].url
//     }
//     console.error("Generate image error 2",data)
//     return null
// }