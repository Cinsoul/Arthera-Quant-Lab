import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, TrendingUp, Shield, BarChart3, Brain } from 'lucide-react';
import { deepSeekSignalService } from '../services';

interface AICopilotProps {
  onClose: () => void;
  context: {
    view: string;
    backtestId: string | null;
  };
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const examplePrompts = [
  {
    icon: TrendingUp,
    text: '帮我总结这次回测的主要风险点',
    color: 'text-[#0ea5e9]',
  },
  {
    icon: Shield,
    text: '如果我把最大单票仓位从 4% 降到 3%，风险大概变化多少？',
    color: 'text-[#10b981]',
  },
  {
    icon: BarChart3,
    text: '分析一下当前组合的行业暴露是否合理',
    color: 'text-[#8b5cf6]',
  },
  {
    icon: Brain,
    text: '基于AI分析给出下周的市场预测和操作建议',
    color: 'text-[#f59e0b]',
  },
];

export function AICopilot({ onClose, context }: AICopilotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '您好！我是 Arthera AI Copilot。我可以帮您分析回测结果、解释策略表现、评估风险指标，以及回答关于量化策略的问题。',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // 尝试使用DeepSeek AI生成响应
      const response = await generateEnhancedAIResponse(input, context);
      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('[AICopilot] AI response failed:', error);
      // 降级到本地响应
      const fallbackResponse = generateAIResponse(input, context);
      const assistantMessage: Message = {
        role: 'assistant',
        content: fallbackResponse + '\n\n_注：AI服务暂时不可用，以上为本地分析结果_',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleExampleClick = (text: string) => {
    setInput(text);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-[#0d1b2e] border-l border-[#1a2942] shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="p-5 border-b border-[#1a2942]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#0ea5e9] to-[#06b6d4] rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm text-gray-200">AI Copilot</div>
              <div className="text-xs text-gray-500">智能量化助手</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-[#1a2942] rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        {/* Context */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-pulse"></div>
          <span>当前上下文: {getContextLabel(context.view)}</span>
          {context.backtestId && <span>· 回测 {context.backtestId}</span>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === 'user'
                  ? 'bg-[#0ea5e9]'
                  : 'bg-gradient-to-br from-[#0ea5e9] to-[#06b6d4]'
              }`}
            >
              {message.role === 'user' ? (
                <span className="text-xs">You</span>
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </div>
            <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
              <div
                className={`inline-block px-4 py-3 rounded-lg text-sm ${
                  message.role === 'user'
                    ? 'bg-[#0ea5e9] text-white'
                    : 'bg-[#1a2942] text-gray-200'
                }`}
              >
                {message.content}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {message.timestamp.toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0ea5e9] to-[#06b6d4] flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="bg-[#1a2942] px-4 py-3 rounded-lg">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Example Prompts */}
      {messages.length === 1 && (
        <div className="px-5 pb-4 border-t border-[#1a2942]">
          <div className="text-xs text-gray-500 mb-3 pt-4">试试这些提示词：</div>
          <div className="space-y-2">
            {examplePrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleExampleClick(prompt.text)}
                className="w-full flex items-start gap-2 p-3 bg-[#1a2942]/50 hover:bg-[#1a2942] rounded text-left transition-colors group"
              >
                <prompt.icon className={`w-4 h-4 ${prompt.color} flex-shrink-0 mt-0.5`} />
                <span className="text-xs text-gray-400 group-hover:text-gray-300">
                  {prompt.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-5 border-t border-[#1a2942]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="输入您的问题..."
            className="flex-1 bg-[#1a2942] border border-[#2a3f5f] rounded px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#0ea5e9]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="px-4 py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="text-xs text-gray-600 mt-2">
          提示: AI 助手会基于当前页面上下文提供个性化建议
        </div>
      </div>
    </div>
  );
}

function getContextLabel(view: string): string {
  const labels: Record<string, string> = {
    dashboard: 'Dashboard 总览',
    'strategy-lab': '策略实验室',
    'backtest-detail': '回测详情',
    portfolio: '组合体检',
    reports: '报告中心',
  };
  return labels[view] || '未知页面';
}

function generateAIResponse(question: string, context: any): string {
  const lowerQuestion = question.toLowerCase();

  // Risk-related questions
  if (lowerQuestion.includes('风险') || lowerQuestion.includes('回撤')) {
    return `基于当前回测数据分析，主要风险点包括：

1. **行业集中度风险**: 电力设备、电子、医药生物三大行业合计占比 58.4%，虽单个行业未超 25% 上限，但整体集中度较高。建议在新能源板块波动加剧时考虑适度分散。

2. **最大回撤风险**: 策略最大回撤 -8.2% 发生在 2024 年 7 月，当时新能源板块整体调整。虽优于基准的 -12.5%，但仍需关注持仓集中度。

3. **流动性风险**: 当前组合平均日均成交额覆盖率 88%，整体流动性充足，但极端情况下全仓调整需 2-3 个交易日。

建议保持当前风控参数：单票上限 4%，行业上限 25%，并在市场波动加剧时考虑降低仓位。`;
  }

  // Position sizing questions
  if (lowerQuestion.includes('仓位') && (lowerQuestion.includes('3%') || lowerQuestion.includes('降到'))) {
    return `如果将单票最大仓位从 4% 降至 3%，预计影响如下：

**风险变化：**
- 组合波动率预计降低约 8-12%（从 18.5% 降至约 16.2-16.9%）
- 最大回撤可能改善 1.5-2 个百分点（从 -8.2% 优化至约 -6.5%）
- 尾部风险（VaR）降低约 15%

**收益影响：**
- 年化收益可能下降 3-5 个百分点（从 42.3% 降至约 37-39%）
- 夏普比率可能小幅提升（从 2.18 提升至约 2.25-2.30）
- 超额收益稳定性提高，但绝对收益会有所牺牲

**调整建议：**
如果您的风险偏好较低或市场波动加剧，建议降至 3%。如果追求更高收益且能承受当前波动，保持 4% 即可。当前配置下夏普比率 2.18 已属优秀水平。`;
  }

  // Sector exposure questions
  if (lowerQuestion.includes('行业') && (lowerQuestion.includes('暴露') || lowerQuestion.includes('合理'))) {
    return `当前组合行业暴露分析如下：

**集中度评估：**
- 电力设备 24.5%（接近上限 25%）✓
- 电子 18.3%（适中）✓
- 医药生物 15.6%（适中）✓
- 前三大行业合计 58.4%（偏高）⚠️

**合理性判断：**
1. **单行业维度**: 所有行业均在 25% 上限内，符合风控要求 ✓
2. **整体集中度**: 前三大行业占比近 60%，集中度偏高，但考虑到中小盘成长策略特性，属于可接受范围
3. **行业相关性**: 电力设备与汽车（新能源产业链）相关性较高，需关注系统性风险

**优化建议：**
- 如果市场风格保持成长偏好，当前配置合理
- 如果担心新能源板块调整，建议将电力设备权重降至 20%，增配医药、计算机等防御板块
- 可考虑加入 5-8% 的消费、金融等低相关性板块以分散风险`;
  }

  // Default response
  return `感谢您的提问。基于当前${getContextLabel(context.view)}的数据，我建议您：

1. 查看详细的回测指标，重点关注风险调整后收益（夏普比率、Sortino比率）
2. 分析持仓集中度和行业分布，确保符合风控要求
3. 对比不同市场阶段的表现，评估策略适应性

如果您有更具体的问题，比如关于某个指标的解释、策略优化建议、或者风险管理方案，请随时告诉我！`;
}

/**
 * 使用DeepSeek AI生成增强响应
 */
async function generateEnhancedAIResponse(question: string, context: any): Promise<string> {
  // 构建上下文相关的市场数据（模拟）
  const mockMarketData = {
    price: 45.67,
    changePercent: 2.34,
    volume: 1250000,
    ma20: 44.12,
    rsi: 65.2,
    macd: 0.45
  };

  try {
    // 检测问题类型并决定是否使用AI
    const useAI = shouldUseAIForQuestion(question);
    
    if (useAI) {
      // 调用DeepSeek服务
      const aiAnalysis = await deepSeekSignalService.generateSignal('MOCK', mockMarketData);
      
      // 将AI分析转换为用户友好的回答
      return formatAIAnalysisForUser(aiAnalysis, question, context);
    } else {
      // 对于简单问题，使用本地回答
      return generateAIResponse(question, context);
    }
  } catch (error) {
    console.error('[AICopilot] DeepSeek AI call failed:', error);
    throw error; // 让调用方处理降级
  }
}

/**
 * 判断是否需要使用AI分析
 */
function shouldUseAIForQuestion(question: string): boolean {
  const aiKeywords = [
    '预测', '分析', '建议', '市场', '趋势', '前景', '策略',
    'ai', 'AI', '人工智能', '机器学习', '深度', '智能'
  ];
  
  const lowerQuestion = question.toLowerCase();
  return aiKeywords.some(keyword => lowerQuestion.includes(keyword));
}

/**
 * 将AI分析结果格式化为用户友好的回答
 */
function formatAIAnalysisForUser(aiAnalysis: any, question: string, context: any): string {
  const { signal, confidence, reasoning, expectedReturn, timeHorizon, riskLevel } = aiAnalysis;
  
  let response = `🤖 **AI深度分析结果**\n\n`;
  
  // 信号解读
  if (signal === 'BUY') {
    response += `📈 **交易建议**: 看涨信号 (置信度: ${Math.round(confidence * 100)}%)\n`;
  } else if (signal === 'SELL') {
    response += `📉 **交易建议**: 看跌信号 (置信度: ${Math.round(confidence * 100)}%)\n`;
  } else {
    response += `⏸️ **交易建议**: 观望为主 (置信度: ${Math.round(confidence * 100)}%)\n`;
  }
  
  // 预期收益
  if (expectedReturn !== 0) {
    response += `💰 **预期收益**: ${expectedReturn > 0 ? '+' : ''}${(expectedReturn * 100).toFixed(2)}% (${timeHorizon})\n`;
  }
  
  // 风险评级
  response += `⚠️ **风险等级**: ${riskLevel === 'HIGH' ? '高风险 🔴' : riskLevel === 'MEDIUM' ? '中等风险 🟡' : '低风险 🟢'}\n\n`;
  
  // AI推理过程
  response += `🧠 **AI分析逻辑**:\n${reasoning}\n\n`;
  
  // 操作建议
  response += `📋 **具体建议**:\n`;
  if (signal === 'BUY') {
    response += `• 建议${confidence > 0.8 ? '积极' : confidence > 0.6 ? '适度' : '谨慎'}买入\n`;
    response += `• 控制仓位在${confidence > 0.8 ? '3-5%' : confidence > 0.6 ? '2-3%' : '1-2%'}之间\n`;
    response += `• 设置${Math.round((1 - 0.08) * 100)}%的止损位\n`;
  } else if (signal === 'SELL') {
    response += `• 建议${confidence > 0.8 ? '主动' : '分批'}减仓\n`;
    response += `• 关注技术支撑位的有效性\n`;
    response += `• 预留部分现金等待更好机会\n`;
  } else {
    response += `• 维持现有仓位不变\n`;
    response += `• 密切关注市场变化\n`;
    response += `• 等待更明确的交易信号\n`;
  }
  
  response += `\n_⚡ 由DeepSeek AI实时生成 | 数据更新时间: ${new Date().toLocaleString('zh-CN')}_`;
  
  return response;
}
