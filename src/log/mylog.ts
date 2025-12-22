import {callerSourceOrigin,memoryUsage} from "bun:jsc"


Bun.randomUUIDv7("base64")
console.log(callerSourceOrigin(),memoryUsage())