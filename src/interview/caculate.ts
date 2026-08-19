import { bind, equal, fail, fmap, many, numberF, orP, pipeO, pipeP, pure, type ParseF } from "@diqye/myparser"

/**
 * 计算数学表达式  10-4/2+(1+2)*3
 * 支持加减乘除和括号
 * 注意优先级
 * @param express 数学表达式
 */
function caculate(express:string) : number {

    // 处理括号
    const brack_f : ParseF<number> = fmap(
        {fn: () => pipeP(
            equal("("),
            parse_f,
            equal(")")
        )},
        xs => xs[1]
    ) 
    const leve0_f = orP(brack_f,numberF)
    const semi_muti_f = fmap(
        pipeP(equal("*"),leve0_f),
        xs => (n:number) => n * xs[1]
    )
    const semi_div_f = fmap(
        pipeP(equal("/"),leve0_f),
        xs => (n:number) => n / xs[1]
    )
    // 乘除优先级
    const level1_f = bind(
        pipeO(
            ["n",leve0_f],
            ["op",many(orP(semi_muti_f,semi_div_f))]
        ),
        obj => {
            if(obj.op.length == 0) fail("至少有一个乘除吧")
            return pure(obj.op.reduce((prev,curr)=>curr(prev),obj.n))
        }
    )
    const semi_plus_f = fmap(
        pipeP(equal("+"),level1_f),
        xs => (n:number) => n + xs[1]
    )
    const semi_sub_f = fmap(
        pipeP(equal("-"),level1_f),
        xs => (n:number) => n - xs[1]
    )
    // 加减优先级
    const level2_f = bind(
        pipeO(
            ["n",level1_f],
            ["op",many(orP(semi_plus_f,semi_sub_f))]
        ),
        obj => {
            if(obj.op.length == 0) fail("至少有一个吧")
            return pure(obj.op.reduce((prev,curr)=>curr(prev),obj.n))
        }
    )
    const parse_f = orP(level2_f,level1_f,numberF,brack_f)


    const result = parse_f(express)
    if(result.status != "SUCCESS") {
        throw result
    }
    if(result.slice != "") {
        throw result
    }
    return result.value
}
// 一共 72 行 ✅
console.log(caculate("(2+(3*(4+5)))"))