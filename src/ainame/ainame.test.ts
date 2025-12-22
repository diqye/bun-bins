import {expect, test} from "bun:test"
import { detectFile } from "./ainame"


test(detectFile.name,async ()=>{
    expect(await detectFile("hello")).toBeNull()
    expect(await detectFile("package.json")).toBeObject()
})