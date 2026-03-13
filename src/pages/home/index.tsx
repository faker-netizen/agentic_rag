import {Card, Typography} from 'antd'

const {Title, Paragraph} = Typography

export default function Home() {
    return (
        <Card>
            <Title level={2} style={{marginTop: 0}}>Home</Title>
            <Paragraph>这是首页。接下来可以把 Todo 列表接到 RTK Query。</Paragraph>
        </Card>
    )
}
