import {Card, Typography} from 'antd'

const {Title, Paragraph} = Typography

export default function Home() {
    function decodeString(s: string): string {
        const arr = s.split('')
        const execStack:(string|number)[] = []
        let ans = ''
        for (let i = 0; i < s.length; i++) {
            console.log('----')
            const e = s[i]
            if (e === ']') {
                const str = execStack.pop()
                execStack.pop()
                const num=execStack.pop()
                const slice=new Array(num).fill(str).join('')
                console.log(slice)
                if(!execStack.length){
                    ans+=new Array(num).fill(str).join('')
                }else{
                    if (execStack[execStack.length - 1] === '[') {
                        execStack.push(slice)
                    } else {
                        execStack[execStack.length - 1] += slice
                    }
                }
                // console.log(execStack)
                continue
            }
            if (/\d/.test(e)) {
                let num = ''
                let j = i
                for (; j < s.length; j++) {
                    if (/\d/.test(s[j])) {
                        num += s[j]
                    } else {
                        break
                    }
                }
                i = j - 1
                execStack.push(Number(num))
                continue
            }
            if (e === '[') {
                execStack.push('[')
                continue
            }
            let j = i
            let str = ''
            for (; j < s.length; j++) {
                if (/^[A-Za-z]+$/.test(s[j])) {
                    str += s[j]
                } else {
                    break
                }
            }
            i = j - 1
            console.log(execStack)
            if (execStack.length) {
                if (execStack[execStack.length - 1] === '[') {
                    execStack.push(str)
                } else {
                    execStack[execStack.length - 1] += str
                }
            } else {
                ans += str
            }
        }

        return ans
    };
    console.log(decodeString("3[z]2[2[y]pq4[2[jk]e1[f]]]ef"))
    console.log('zzzyypqjkjkefjkjkefjkjkefjkjkefyypqjkjkefjkjkefjkjkefjkjkefef'=='zzzyypqjkjkefjkjkefjkjkefjkjkefyypqjkjkefjkjkefjkjkefjkjkefef')
    return (
        <div style={{padding: 16}}>
            <Card>
                <Title level={2} style={{marginTop: 0}}>Home</Title>
                <Paragraph>这是首页。接下来可以把 Todo 列表接到 RTK Query。</Paragraph>
            </Card>
        </div>
    )
}
