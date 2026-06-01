import {Card, Typography} from 'antd'
import {useEffect, useRef} from "react";
import {Button, VirtualList} from '@d2c/components'
import {DLinkedList} from '@d2c/utils'
const itemHeight = 30
const totalNum = 500
const totalHeight = itemHeight * totalNum
export default function Typora() {
    const listRef = useRef<HTMLDivElement | null>(null)
    const rafId = useRef<number | null>(null);
    const data = new Array(totalNum).fill(1)

    const items = data.map((num, index) => {
        return {data: '这是第' + index + '条数据', id: index + ''}
    })

    useEffect(() => {
        const el = listRef.current;
        if (!el) return;
    }, [])
    return (
        <div style={{height: "100%"}}>
            <Button>111</Button>
            <div style={{height:200}}>111</div>
            <VirtualList items={items} height={300} itemHeight={110} overscan={1} renderItem={(item,index)=>{
                return (<div>{item.data}{index}</div>)
            }}
            ></VirtualList>
        </div>

    )
}