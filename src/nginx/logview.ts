import { anyChar, before, composeP, endOfInput, fmap, many, orP, search } from "@diqye/myparser"

const log_path = "out/access.log"

// 223.109.255.232 - - [14/Dec/2025:15:23:43 +0000] "GET /dispbbs.asp HTTP/1.1" 301 169 "http://pic.sogou.com" "Sogou Pic Spider/3.0(+http://www.sogou.com/docs/help/webmasters.htm#07)" "-"

function parse(log_text:string) {
    const line_f = fmap(
        composeP(
            search('"'),
            search('"'),
            search('" '),
            search("] ")
        ),
        xs=>[xs[0],xs[2]] as const
    )
    const f = many(before(line_f,orP(fmap(search("\n"),()=>void 0),endOfInput)))

    const r = f(log_text)
    if(r.status != "SUCCESS") {
        console.error(r)
        return 
    }
    const set = new Set(r.value.map(xs=>xs[0]))
    for(const a of set) {
        const found = r.value.find(t2=>t2[0] == a)
        if(found == null) continue
        console.log(a,found[1].slice(5).slice(0,-8))
    }
}

const log_text = await Bun.file(log_path).text()
parse(log_text)