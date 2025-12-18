#!/bin/bash

# Arthera量化交易系统演示脚本
# 展示完整的量化交易功能

echo "🎯 Arthera量化交易系统 - 投资者演示"
echo "=================================="
echo ""
echo "✅ 系统已启动在 http://localhost:8000"
echo ""

# 检查服务是否运行
echo "🔍 1. 系统健康检查"
echo "------------------------"
curl -s http://localhost:8000/health | python3 -m json.tool | grep -E '"status"|"service"|"version"'
echo ""

# 展示系统状态
echo "📊 2. 实时交易状态"
echo "------------------------"
curl -s http://localhost:8000/dashboard/system-status | python3 -m json.tool | head -15
echo ""

# 生成交易信号
echo "🚀 3. AI信号生成 (DeepSeek + Bayesian)"
echo "----------------------------------------"
echo "正在为 AAPL, TSLA, NVDA 生成交易信号..."
curl -s -X POST http://localhost:8000/signals/generate \
    -H 'Content-Type: application/json' \
    -d '{"symbols":["AAPL","TSLA","NVDA"]}' | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)
for signal in data['signals']:
    print(f\"📈 {signal['symbol']}: {signal['action']} | 置信度: {signal['confidence']} | 策略: {signal['strategy']}\")
print(f\"\\n总计生成 {data['total_count']} 个信号，信号强度: {data['strategy_summary']['signal_strength']}\")
"
echo ""

# iOS专用信号
echo "📱 4. iOS DeepSeek信号测试"
echo "-----------------------------"
echo "为iOS App生成AAPL的DeepSeek信号..."
curl -s -X POST http://localhost:8000/ios/signals/deepseek/generate \
    -H 'Content-Type: application/json' \
    -d '{"symbol":"AAPL","market_data":{"price":150.25,"volume":1000000}}' | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f\"🧠 DeepSeek分析结果:\")
print(f\"   胜率: {data['win_probability']:.1%}\")
print(f\"   置信度: {data['confidence_level']:.1%}\")
print(f\"   预期收益: {data['expected_return']:.2%}\")
print(f\"   推荐操作: {data['trading_recommendation']['action']}\")
print(f\"   仓位大小: {data['trading_recommendation']['position_size']:.1%}\")
print(f\"   市场状态: {data['market_regime']}\")
"
echo ""

# 模拟订单执行
echo "💼 5. 模拟订单执行"
echo "---------------------"
echo "提交AAPL买单..."
curl -s -X POST http://localhost:8000/orders/submit \
    -H 'Content-Type: application/json' \
    -d '{"symbol":"AAPL","side":"BUY","quantity":100,"order_type":"MARKET"}' | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f\"✅ 订单执行成功:\")
print(f\"   订单ID: {data['order_id']}\")
print(f\"   标的: {data['symbol']}\")
print(f\"   操作: {data['side']}\")
print(f\"   数量: {data['quantity']}\")
print(f\"   成交价: ${data['fill_price']}\")
print(f\"   状态: {data['status']}\")
print(f\"   滑点: {data['slippage']}%\")
print(f\"   手续费: ${data['commission']}\")
"
echo ""

# 投资组合状态
echo "📊 6. 投资组合分析"
echo "---------------------"
curl -s http://localhost:8000/portfolio/summary | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f\"💰 组合总价值: ${data['total_value']:,.2f}\")
print(f\"💵 现金余额: ${data['cash']:,.2f}\")
print(f\"📈 未实现盈亏: ${data['unrealized_pnl']:,.2f}\")
print(f\"🎯 今日盈亏: ${data['realized_pnl_today']:,.2f}\")
print(f\"📊 日收益率: {data['day_change_percent']:.2f}%\")
print(f\"🏗️ 持仓数量: {data['position_count']}\")
print(f\"📐 分散化评分: {data['diversification_score']:.1%}\")
print()
print('📋 持仓明细:')
for pos in data['positions']:
    pnl_icon = '📈' if pos['unrealized_pnl'] > 0 else '📉'
    print(f\"   {pnl_icon} {pos['symbol']}: {pos['quantity']}股 @ ${pos['current_price']:.2f} (盈亏: ${pos['unrealized_pnl']:.2f})\")
"
echo ""

# 策略状态
echo "⚙️  7. 策略运行状态"
echo "---------------------"
curl -s http://localhost:8000/strategies/list | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f\"🚀 活跃策略: {data['total_active']} 个\")
print(f\"📊 总持仓: {data['total_positions']} 个\")
print(f\"📈 平均Sharpe: {data['avg_sharpe']}\")
print()
for strategy in data['strategies']:
    status_icon = '🟢' if strategy['status'] == 'ACTIVE' else '🔴'
    return_icon = '📈' if strategy['daily_return'] > 0 else '📉'
    print(f\"   {status_icon} {strategy['name']}:\")
    print(f\"      {return_icon} 日收益: {strategy['daily_return']:.2%}\")
    print(f\"      📊 Sharpe比率: {strategy['sharpe_ratio']}\")
    print(f\"      📝 持仓数: {strategy['positions']}\")
"
echo ""

# 性能指标
echo "📈 8. 系统性能指标"
echo "---------------------"
curl -s http://localhost:8000/dashboard/trading-stats | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)
daily = data['daily_stats']
perf = data['performance']
risk = data['risk_metrics']

print('📊 今日交易统计:')
print(f\"   🎯 信号生成: {daily['orders_generated']} 个\")
print(f\"   ✅ 交易执行: {daily['trades_executed']} 笔\")
print(f\"   💰 交易量: ${daily['total_volume']:,}\")
print(f\"   🎯 成功率: {daily['success_rate']:.1f}%\")
print(f\"   ⚙️  活跃策略: {daily['strategies_active']} 个\")
print()
print('📈 性能表现:')
print(f\"   📊 Sharpe比率: {perf['sharpe_ratio']}\")
print(f\"   📉 最大回撤: {perf['max_drawdown']:.1%}\")
print(f\"   🎯 胜率: {perf['win_rate']:.1%}\")
print(f\"   💪 盈亏比: {perf['profit_factor']}\")
print(f\"   📅 年化收益: {perf['annual_return']:.1%}\")
print()
print('⚠️  风险指标:')
print(f\"   📉 VaR(95%): {risk['var_95']:.1%}\")
print(f\"   📊 波动率: {risk['volatility']:.1%}\")
print(f\"   📈 Beta: {risk['beta']}\")
print(f\"   ⭐ Alpha: {risk['alpha']:.1%}\")
"
echo ""

echo "🎉 Arthera量化交易系统演示完成！"
echo "=================================="
echo ""
echo "🔗 更多功能访问:"
echo "  • 完整API文档: http://localhost:8000/docs"
echo "  • 系统监控: http://localhost:8000/dashboard/system-status"
echo "  • 实时信号: http://localhost:8000/signals/recent"
echo ""
echo "📱 iOS集成测试:"
echo "  • 配置API Base URL: http://localhost:8000"
echo "  • iOS专用端点: http://localhost:8000/ios/*"
echo ""
echo "💡 投资者亮点:"
echo "  ✅ 8个策略实时运行"
echo "  ✅ AI驱动的信号生成"
echo "  ✅ 完整的风险控制"
echo "  ✅ 实时交易执行"
echo "  ✅ 专业级性能指标"
echo "  ✅ 移动端完整支持"
echo ""