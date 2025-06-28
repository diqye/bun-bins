import { parseArgs } from "util"

let buff = Buffer.from("OGVmYzZiMmQzYjA2OWNhODk0NTRkMTBiOWVmMDAxODc0OWRkZjk0ZDM1NmI1M2E2MTRlY2MzZDhmNmI5MWI1OTc5ODg4ODNhM2YxMjhiZjRjM2YxMGJhMzMwMjU5YTg0Y2I4MDFlOGYwMDcyYmMyMGJhNDg3MjNlZTQ5MWRlZWQ=","base64")

await Bun.write("a.b",buff);