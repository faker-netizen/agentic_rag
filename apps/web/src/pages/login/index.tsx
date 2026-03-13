import {Button, Card, Form, Input, message, Typography} from 'antd'
import {useLoginMutation} from "../../service/authApi.ts";
import {useLocation, useNavigate} from "react-router-dom";

const {Title} = Typography

type LoginForm = { username: string; password: string }

export default function Login() {

    const [form] = Form.useForm<LoginForm>()
    const [login, {isLoading}] = useLoginMutation()
    const navigate = useNavigate()
    const location = useLocation()

    const from = (location.state as { from?: string } | null)?.from ?? '/'
    const onFinish = async (values: LoginForm) => {
        try {
            // unwrap：成功返回 data；失败直接 throw（更好写）
            const data = await login(values).unwrap()
            message.success(`欢迎，${data.user.username}`)
            navigate(from, {replace: true})
        } catch (err: any) {
            // RTKQ 的 fetchBaseQuery 常见错误结构：{ status, data }
            const msg =
                err?.data?.message ||
                (err?.status === 401 ? '用户名或密码错误' : '登录失败，请稍后重试')
            message.error(msg)
        }
    }

    return (
        <div style={{minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16}}>
            <Card style={{width:400, margin: "auto"}}>
                <Title level={2} style={{marginTop: 0}}>Login</Title>
                <Form<LoginForm> layout="vertical" onFinish={onFinish}>
                    <Form.Item
                        label="Username"
                        name="username"
                        rules={[{required: true, message: '请输入用户名'}]}
                    >
                        <Input autoComplete="username"/>
                    </Form.Item>

                    <Form.Item
                        label="Password"
                        name="password"
                        rules={[{required: true, message: '请输入密码'}]}
                    >
                        <Input.Password autoComplete="current-password"/>
                    </Form.Item>

                    <Button type="primary" htmlType="submit" block>
                        Sign in
                    </Button>
                </Form>
            </Card>
        </div>
    )
}
