import { ChatOpenAI } from '@langchain/openai';
import dotenv from 'dotenv';

dotenv.config();

// DeepSeek配置
export const deepseekConfig = {
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
  modelName: 'deepseek-chat', // 默认使用deepseek-chat模型
  temperature: 0.7,
};

// 创建DeepSeek聊天实例
const llm = new ChatOpenAI({
  model: "deepseek-chat",
  apiKey: process.env.DEEPSEEK_API_KEY,
  temperature: 0.7,
  configuration: {
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
  },
});
export default deepseekConfig;
