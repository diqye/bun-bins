import {expect, test} from "bun:test"
import { omitEm, imageGenerate, speechAudioList } from "./tts"
import { generateDialogue } from "./llm"
import { renderEnglish } from "./render"

test(omitEm.name,()=>{
    expect(omitEm("Look! This is our new <em>classroom</em>."))
    .toBe("Look! This is our new classroom.")

    expect(omitEm("小学四年级第一单元 <em>classroom</em>"))
    .toBe("小学四年级第一单元 classroom")

    // console.log(omitEm("It's on the wall. And there are many <em>desks</em> and <em>chairs</em>."))
})

test.skip(generateDialogue.name,async () => {
    let llm_json = await generateDialogue("小学四年级单词 alll year round (全年)")
    console.log("llm_json",llm_json)
},{timeout: 1000 * 60 * 10})

test.skip(imageGenerate.name,async () => {
    let url = await imageGenerate("日本动漫风格，两个二次元小美女，左边女孩穿粉色连衣裙，右边女孩穿蓝色背带裙，站在开满鲜花的公园里，背景有四季花卉（樱花、荷花、枫叶、梅花）的元素，表现出全年都有花的场景")
    console.log("url",url)
},1000 * 60 * 10)

test.skip(speechAudioList.name,async () => {
    let list = await speechAudioList("test-asserts1",[])
    console.log("list",list)
},1000 * 60 * 10)


test.skip("render",async ()=>{
},{timeout: 1000 * 60 * 10})

