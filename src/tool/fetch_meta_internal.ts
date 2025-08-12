export async function fetchMeta(url:string,verbose?:boolean):Promise<string | {
    url: string,
    name: string,
    logo:  string,
    description: string
}> {
    let res = await fetch(url,{
        method: "GET",
        verbose,
        headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
        }
    })
    if(res.ok == false) return "failed"
    let text_list = [] as string []
    let logo = ""
    let description = ""
    let rewriter = new HTMLRewriter()
    return new Promise(ok=>{
        rewriter.on("title",{
            text: text => {
                text_list.push(text.text)
            }
        }).on('meta[name="description"]',{
            element: el => {
                if(description != "") return
                description = el.getAttribute("content") ?? ""
            }
        }).on('meta[name="description"]',{
            element: el => {
                if(description != "") return
                description = el.getAttribute("content") ?? ""
            }
        }).on('link[rel="shortcut icon"]',{
            element: el => {
                if(logo != "") return
                logo = el.getAttribute("href") ?? ""
            }
        }).on('link[rel="icon"]',{
            element: el => {
                if(logo != "") return
                logo = el.getAttribute("href") ?? ""
            }
        }).on("body",{
            element: el => {
                ok({
                    url,
                    name: text_list.join(""),
                    logo: new URL(logo || "/favicon.ico",url).href,
                    description
                })
            }
        })
        rewriter.transform(res)
    })
    
}