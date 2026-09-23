#!/usr/bin/env bun

import {optimize} from "svgo";

function getIndex(...args:number[]) {
    if(args[0] == null) return -1
    if(args[0] != -1) return args[0]
    return getIndex(...args.slice(1));
}
/** figma 导出的标注属性，无渲染作用，且转 camelCase 后不是合法 React prop */
function stripUselessAttrs(svg: string) {
    return svg
        // React 自动处理 foreignObject 内的 HTML 命名空间，div 上传 xmlns 会报类型错误
        .replaceAll(/\sxmlns="[^"]*"/g, "")
        .replaceAll(/\sdata-figma-[a-z0-9-]+="[^"]*"/g, "")
}

/** 内联 style 字符串转 React style 对象，连字符属性名转 camelCase（CSS 变量 --x 保持原样） */
function reactStyle(styleStr: string) {
    const entries = styleStr
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);
    const props = entries.map((entry) => {
        const i = entry.indexOf(":");
        const key = entry.slice(0, i).trim();
        const value = entry.slice(i + 1).trim();
        const reactKey = key.startsWith("--")
            ? `'${key}'`
            : key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
        return `${reactKey}: "${value}"`;
    });
    return `style={{ ${props.join(", ")} }}`;
}

function renderReactSvg(svg:string){
    let result1 = optimize(svg,{
        
    })
    let result = optimize(result1.data,{
        multipass: true,
        js2svg:{
            indent: 4,
            pretty: true
        },
        plugins: [{
            name: 'prefixIds',
            params: {
                delim: '',
                prefix: () => Bun.randomUUIDv7("hex").slice(0,8),
            }
        } as any]
    })
    let outputStr = stripUselessAttrs(result.data)
    let lines = outputStr
        .replaceAll(/style="([^"]*)"/g, (_, css) => reactStyle(css))
        .replaceAll(/\b[a-z0-9]+([-:][a-z0-9]+)+=/g,(a:any)=>{
        let xs = a.split(/[-:]/) 
        let [head,...rest] = xs
        return head + rest.map((word:string)=>{
            return word.slice(0,1).toUpperCase() + word.slice(1)
        }).join("")
    }).split("\n")
    let [head,...rest] = lines
    if(head == null) head = "";
    let w = /width="([0-9]+)/.exec(head )?.[1] || ""
    let h= /height="([0-9]+)/.exec(head )?.[1] || ""
    let viewBoxPropsStr = `viewBox="0 0 ${w} ${h}"`
    if(w == "" || h == "") {
        let startIndex = head.indexOf("viewBox")
        let headFromStart = head.slice(startIndex)
        let endIndex = getIndex(
            headFromStart.indexOf("\" "),
            headFromStart.indexOf("\">"),
        )
        if(endIndex != -1) {
            viewBoxPropsStr = headFromStart.slice(0,endIndex+1);
        }
    }
    let out = `<svg ${viewBoxPropsStr} {...props}>\n` + rest.map(line=>"    "+line).join("\n")
    return `import { SVGProps } from "react"
export function DiqyeSvg(props: SVGProps<SVGSVGElement>) {
    return ${out}
}
`
}

let reader = Bun.stdin.stream().getReader()
let svg = [] as string []
while(true) {
    let chunk = await reader.read()
    let text = new TextDecoder().decode(chunk.value);
    svg.push(text)
    if(text.trimEnd().endsWith("</svg>")) {
        break
    }
    if(chunk.done) break
}
reader.cancel();
let text = renderReactSvg(svg.join(""))
console.log(text);