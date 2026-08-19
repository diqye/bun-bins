import z from "zod";
import { fn2string } from "./kit";
import { explan_schema, generateExplan } from "./llm";


const result = await generateExplan(`
Summing up
The difference between auto-fill and auto-fit for sizing columns is only noticeable when the row is wide enough to fit more columns in it.

If you’re using auto-fit, the content will stretch to fill the entire row width. Whereas with auto-fill, the browser will allow empty columns to occupy space in the row like their non-empty neighbors — they will be allocated a fraction of the space even if they have no grid items in them, thus affecting the size/width of the latter.

Which behavior you want or prefer is completely up to you. I have yet to think of a use case where auto-fill would make more sense than auto-fit. Do you have any use cases? If you do, please feel free to share them in the comments below.
`)

const document = explan_schema.parse(result)
console.dir(document)