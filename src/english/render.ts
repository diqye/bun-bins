import {renderMedia, selectComposition} from '@remotion/renderer';
import path from 'path';
import type { InputProps, ListenInputProps } from './const';
import { stdout } from 'bun';
import z from 'zod';
 
// The composition you want to render
const compositionId = 'english'
let bundleLocation = "/Users/diqye/projects/typescript/video-generator/build"
let fps = 24
 
export async function renderEnglish(inputProps: InputProps) {
    let total_seconds = inputProps.dialogue.reduce((previous,current)=>{
        return previous + current.audio.seconds + 0.5
    },2) + 3
    let total_frames = Math.trunc(total_seconds) * fps
    let outputLocation = `out/${inputProps.filename}.mp4`
    // Get the composition you want to render. Pass `inputProps` if you
    // want to customize the duration or other metadata.
    const composition = await selectComposition({
        serveUrl: bundleLocation,
        id: compositionId,
        inputProps
    });
    // Render the video. Pass the same `inputProps` again
    // if your video is parametrized with data.
    await renderMedia({
        logLevel: "error",
        composition: {
            ...composition,
            durationInFrames: total_frames
        },
        serveUrl: bundleLocation,
        codec: 'h264',
        outputLocation,
        metadata: {
            comment: "Author is vallino"
        },
        inputProps,
        onProgress: a => {
            stdout.write(`\r ${(a.progress * 100).toFixed(2)}% renderedFrames ${a.renderedFrames}`)
        }
    });

    console.log('\nRender done!',outputLocation);
}
 
export async function renderListen(inputProps: ListenInputProps,filename:string) {
    const fps = 30
    const audio_frames = Math.trunc(inputProps.audio_seconds * fps) 
    const total_frames = 2*fps + audio_frames + 3*fps
    let outputLocation = `out/${filename}.mp4`
    // Get the composition you want to render. Pass `inputProps` if you
    // want to customize the duration or other metadata.
    const composition = await selectComposition({
        serveUrl: bundleLocation,
        id: "listen-practice",
        inputProps
    });
    // Render the video. Pass the same `inputProps` again
    // if your video is parametrized with data.
    await renderMedia({
        logLevel: "error",
        composition: {
            ...composition,
            durationInFrames: total_frames
        },
        serveUrl: bundleLocation,
        codec: 'h264',
        outputLocation,
        metadata: {
            comment: "Author is vallino"
        },
        inputProps,
        onProgress: a => {
            stdout.write(`\r ${(a.progress * 100).toFixed(2)}% renderedFrames ${a.renderedFrames}`)
        }
    });

    console.log('\nRender done!',outputLocation);
}

export const diff_input_props_schema = z.object({
    list: z.object({
        english: z.string(),
        chinese: z.string(),
        tts_content: z.string(),
        audio: z.object({
            url: z.string(),
            seconds: z.number()
        })
    }).array()
})
export async function renderDiff(inputProps: z.output<typeof diff_input_props_schema>,filename:string) {
    const fps = 30
    const content_seconds = inputProps.list.reduce((prev,curr)=>prev + curr.audio.seconds,0)
    const total_frames = Math.trunc(content_seconds * fps) + 4*fps
    let outputLocation = `out/${filename}.mp4`
    // Get the composition you want to render. Pass `inputProps` if you
    // want to customize the duration or other metadata.
    const composition = await selectComposition({
        serveUrl: bundleLocation,
        id: "diff",
        inputProps
    });
    // Render the video. Pass the same `inputProps` again
    // if your video is parametrized with data.
    await renderMedia({
        logLevel: "error",
        composition: {
            ...composition,
            durationInFrames: total_frames
        },
        serveUrl: bundleLocation,
        codec: 'h264',
        outputLocation,
        metadata: {
            comment: "Author is vallino"
        },
        inputProps,
        onProgress: a => {
            stdout.write(`\r ${(a.progress * 100).toFixed(2)}% renderedFrames ${a.renderedFrames}`)
        }
    });

    console.log('\nRender done!',outputLocation);
}
 
 