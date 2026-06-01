import {Button, Form, Input, message} from "antd";
import {UserOutlined, LockOutlined} from "@ant-design/icons";
import {useLocation, useNavigate} from "react-router-dom";
import {useEffect, useState} from "react";
import {login} from "@/service/authService.ts";
import {getAccessToken, setAccessToken} from "@/service/token.ts";
import {RequestError} from "@/service/request.ts";
import {DisplayHeading, GlassSurface} from "@/components/shell";

/** 仅允许站内相对路径，避免 //evil 开放重定向 */
function safeReturnPath(to: string): string {
    if (!to.startsWith("/") || to.startsWith("//")) return "/";
    return to;
}

type LoginForm = {email: string; password: string};

export default function LoginPage() {
    const [form] = Form.useForm<LoginForm>();
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const from = safeReturnPath((location.state as {from?: string} | null)?.from ?? "/");

    useEffect(() => {
        if (getAccessToken()) {
            navigate(from, {replace: true});
        }
    }, [from, navigate]);

    const onFinish = async (values: LoginForm) => {
        setSubmitting(true);
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
        <div className="app-backdrop login-page">
            <div className="login-page__card">
                <GlassSurface variant="strong" padding="lg">
                    <div className="login-page__card-inner">
                        <DisplayHeading level={2} align="center" subtitle="使用已注册的邮箱与密码登录">
                            欢迎回来
                        </DisplayHeading>

                        <Form<LoginForm>
                            form={form}
                            layout="vertical"
                            onFinish={onFinish}
                            requiredMark="optional"
                            style={{marginTop: 28}}
                        >
                            <Form.Item
                                label="邮箱"
                                name="email"
                                rules={[{required: true, message: "请输入邮箱"}]}
                            >
                                <Input
                                    prefix={<UserOutlined style={{opacity: 0.45}} />}
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    size="large"
                                />
                            </Form.Item>

                            <Form.Item
                                label="密码"
                                name="password"
                                rules={[{required: true, message: "请输入密码"}]}
                            >
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
                    </div>
                </GlassSurface>
            </div>
        </div>
    );
}
