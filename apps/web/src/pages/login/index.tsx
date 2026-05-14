import {Button, Card, Form, Input, Typography, theme, message} from "antd";
import {UserOutlined, LockOutlined} from "@ant-design/icons";
import {useLocation, useNavigate} from "react-router-dom";
import {useState} from "react";
import {login} from "@/service/authService.ts";
import {setAccessToken} from "@/service/token.ts";
import {RequestError} from "@/service/request.ts";

const {Title, Text} = Typography;

type LoginForm = { email: string; password: string };

export default function LoginPage() {
    const [form] = Form.useForm<LoginForm>();
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const {token} = theme.useToken();

    const from = (location.state as { from?: string } | null)?.from ?? "/";

    const onFinish = async (values: LoginForm) => {
        setSubmitting(true);
        console.log(values)
        try {
            const data = await login(values.email.trim(), values.password);
            setAccessToken(data.accessToken);
            message.success(`欢迎，${data.user.email}`);
            navigate(from, {replace: true});
        } catch (e) {
            const msg = e instanceof RequestError ? e.message : "登录失败，请稍后重试";
            form.setFields([{name: "password", errors: [msg]}]);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
                background: `linear-gradient(160deg, ${token.colorPrimaryBg} 0%, ${token.colorBgLayout} 45%, #fff 100%)`,
            }}
        >
            <Card
                style={{
                    width: "min(400px, 100%)",
                    boxShadow: token.boxShadowSecondary,
                }}
                styles={{body: {paddingBlock: 28, paddingInline: 28}}}
            >
                <Title level={3} style={{marginTop: 0, marginBottom: 8, textAlign: "center"}}>
                    登录
                </Title>
                <Text type="secondary" style={{display: "block", textAlign: "center", marginBottom: 24}}>
                    使用已注册的邮箱与密码登录
                </Text>

                <Form<LoginForm> form={form} layout="vertical" onFinish={onFinish} requiredMark="optional">
                    <Form.Item
                        label="邮箱"
                        name="email"
                        rules={[
                            {required: true, message: "请输入邮箱"},
                        ]}
                    >
                        <Input prefix={<UserOutlined style={{opacity: 0.45}} />} placeholder="you@example.com" autoComplete="email" size="large" />
                    </Form.Item>

                    <Form.Item label="密码" name="password" rules={[{required: true, message: "请输入密码"}]}>
                        <Input.Password
                            prefix={<LockOutlined style={{opacity: 0.45}} />}
                            placeholder="密码"
                            autoComplete="current-password"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item style={{marginBottom: 0}}>
                        <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
                            登录
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}
