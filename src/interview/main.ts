/**
*  画布涂色
*
*  输入 canvas 是一个仅包含 '0' '1' '\n' 的字符串。
*  每行的字符数量一定相同，整个字符串末尾没有 '\n'。
*  长、宽都在 1 ~ 30 范围内。
*
*  例如：输入 "0000001000\n0000110110\n0000100010\n1110011110\n0001000000"
*
*  表示：
*
*  0000001000
*  0000110110
*  0000100010
*  1110011110
*  0001000000
*
*  现在 paint 函数从画布左上角开始涂色，尝试将 0 改成 1。
*  涂色会向上下左右 4 个方向不断蔓延，直到涂满。注意：涂色不会斜向蔓延。
*  如果画布左上角已经是 1 了，那就直接将输入值的返回。
*  
*  输出：
*  
*  1111111111
*  1111110111
*  1111100011
*  1111111111
*  0001111111
*  
* 解释：中间和左下角处被 1 完整包围的区域不会被涂色
*
* @link https://leetcode.cn/problems/flood-fill/
*/
function paint(canvas:string) {
    function paintInner(canvasBuff: string [][],[x,y]:[number,number]) {
        let v = canvasBuff[x]?.[y]
        if(v == null) {
            return canvasBuff
        }
        if(v == "1") {
            return canvasBuff
        }
        canvasBuff[x]![y] = "1"
        paintInner(canvasBuff,[x+1,y]) 
        paintInner(canvasBuff,[x,y+1])
        paintInner(canvasBuff,[x,y-1])
        paintInner(canvasBuff,[x-1,y])
        return canvasBuff
    }
    const buff = canvas.split("\n").map(str=>str.split(""))
    return paintInner(buff,[0,0])
}

let output= paint("0000001000\n0000110110\n0000100010\n1110011110\n0001000000")
console.log(output.map(xs=>xs.join("")).join("\n"))