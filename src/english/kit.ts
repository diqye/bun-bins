import type z from "zod";

/**
 * 改函数将一个函数转换为代码 
 * @param fn 
 * @returns 
 */
export function fn2string(fn:()=>z.ZodType){
    return eval("`" + fn.toString() + "`")
    // return Buffer.from(fn.toString()).toString("utf-8")
}