/**
 * 运算字符串 1*(2+3/(5-4))
 * 支持 + - *  / 括号
 * 全程只能在网页上写，不能用IDE，不能调试,不能console
 * 只能提交看测试结果是对还是错
 */
function parseAll(token: string): number {
    function parseNum(s: string): [number, string] | null {
        let index = 0
        while (true) {
            const char = s.charAt(index)
            if (char >= '0' && char <= '9') {
                index++
                continue
            }
            break
        }
        if (index == 0) return null
        return [parseInt(s.slice(0, index)), s.slice(index)]
    }

    function parseMutiplySemi(s:string): [(n:number)=>number,string] | null {
        const char = s.charAt(0)
        if(char != "*") return null
        const num = parseOr(parseNum,parseBrackets)(s.slice(1))
        if(num == null) return null
        return [n=>n * num[0],num[1]]
    }
    function parseDivideSemi(s:string): [(n:number)=>number,string] | null {
        const char = s.charAt(0)
        if(char != "/") return null
        const num = parseOr(parseNum,parseBrackets)(s.slice(1))
        if(num == null) return null
        return [n=>n / num[0],num[1]]
    }
    function parsePlusSemi(s:string): [(n:number)=>number,string] | null {
        const char = s.charAt(0)
        if(char != "+") return null
        const num = [parseLevel1,parseNum,parseBrackets].reduce(parseOr)(s.slice(1))
        if(num == null) return null
        return [n=>n + num[0],num[1]]
    }
    function parseSubSemi(s:string): [(n:number)=>number,string] | null {
        const char = s.charAt(0)
        if(char != "-") return null
        const num = [parseLevel1,parseNum,parseBrackets].reduce(parseOr)(s.slice(1))
        if(num == null) return null
        return [n=>n - num[0],num[1]]
    }
    type ParseF<a> = (s:string) => [a,string] | null
    function parseOr<a>(pf1:ParseF<a>,pf2:ParseF<a>): ParseF<a>  {
        return s =>{
            const a = pf1(s)
            if(a != null) return a
            return pf2(s)
        }
    }
    function parseManyOne<a>(pf: ParseF<a>) : ParseF<a[]> {
        return s => {
            const one = pf(s)
            if(one == null) return null
            let list = [one[0]] as a []
            s = one[1]
            while(true) {
                const item = pf(s)
                if(item == null) break
                s = item[1]
                list.push(item[0])
            }
            return [list,s]
        }
    }
    function parseLevel1(s:string) : [number,string] | null {
        const first = [parseNum,parseBrackets].reduce(parseOr)(s)
        if(first == null) return null
        let val = first[0]
        const f = parseManyOne(parseOr(parseMutiplySemi,parseDivideSemi))
        const list = f(first[1])
        if(list == null) return null
        return [
            list[0].reduce((val,op)=>op(val),val),
            list[1]
        ]
    }
    function parseLevel2(s:string) : [number,string] | null {
        const first = [parseLevel1,parseNum,parseBrackets].reduce(parseOr)(s)
        if(first == null) return null
        let val = first[0]
        const f = parseManyOne(parseOr(parsePlusSemi,parseSubSemi))
        const list = f(first[1])
        if(list == null) return null
        return [
            list[0].reduce((val,op)=>op(val),val),
            list[1]
        ]
    }

    const parse = [parseLevel2,parseLevel1,parseNum,parseBrackets].reduce(parseOr)
    function parseBrackets(s: string): [number, string] | null {
        if(s.charAt(0) != "(") return null
        const num = parse(s.slice(1))
        if(num == null) return null
        if(num[1].charAt(0) != ")") return null
        return [num[0],num[1].slice(1)]
    }
    const r = parse(token)
    if(r == null) {
        console.log("token:",token)
        throw "impossible"
    }
    if(r[1] != "") {
        console.log("result",r)
        throw "impossible"
    }
    return r[0]
}

console.log(parseAll("1*(2+3/(5-4))"))