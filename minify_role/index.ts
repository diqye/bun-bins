#!/usr/bin/env bun
import {parseArgs} from "util"

try { await main() } catch (e:any) { console.log(e.message) }

async function main() {
    const parsed = parseArgs({
        args: Bun.argv.slice(2),
        options: {
            input: {
                type: "string",
                short: "i",
                default: ""
            }
        },
       allowPositionals: false,
       strict: true,
       tokens: false
    })

    const values = parsed.values
    if(values.input == "") {
        throw new Error("Input required")
    }
    const file = Bun.file(values.input)
    if(await file.exists() == false) {
        throw new Error("File " + values.input + " is not exist")
    }

    const data = await file.json()
    await modifyAudio(data)
    const new_path = values.input.replace(/\.json$/,".mp3.json")
    await Bun.write(new_path,JSON.stringify(data))
    console.log("Success",new_path)
}
type Role = {
    name: string;
    version: number;
    refs: {
        audio: string;
        text: string;
    }[];
}
async function modifyAudio(in_out_data:Role) {
    for(const ref of in_out_data.refs) {
        const buff = Buffer.from(
            ref.audio,
            "base64"
        )
        if(buff.subarray(0,4).toString('utf-8') != "RIFF") continue

        const process = Bun.spawn({
            cmd: [
                "ffmpeg","-y",
                "-i", "pipe:0",
                "-vn", "-c:a","libmp3lame", "-q:a", "2",
                "-f","mp3","pipe:1"
            ],
            stdin: new Blob([buff]),
            stdout: "pipe",
            stderr: "pipe"
        })

        const out = await new Response(process.stdout).blob()
        ref.audio = Buffer.from(await out.arrayBuffer()).toBase64()
        if(await process.exited != 0) {
            console.error(await new Response(process.stderr).text())
            throw new Error("ffmpeg error = " + await process.exited)
        }
    }
}
