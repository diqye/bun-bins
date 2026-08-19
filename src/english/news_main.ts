import { generateNews, news_schema } from "./llm";

const news = `President Donald Trump’s administration announced on Tuesday that it’s freezing child care funds to Minnesota and demanding an audit of some day care centers after a series of fraud schemes involving government programs in recent years.`
const result = await generateNews(news)
const a = news_schema.parse(result)
console.log(a.list.map(item=>{
    return {
        ...item,
        slice: news.slice(...item.slice)
    }
}))