#!/usr/bin/env python3
"""
测试所有服务连接和数据流
"""

import asyncio
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'utils'))

from service_health_monitor import health_monitor
import json
import requests
import yfinance as yf
import akshare as ak

async def test_all_services():
    """测试所有服务连接"""
    print("🔄 开始测试所有服务连接...")
    
    # 1. 测试增强健康检查
    print("\n📊 执行增强健康检查...")
    try:
        results = await health_monitor.comprehensive_health_check()
        print(f"✅ 增强健康检查完成:")
        print(f"  - 总体状态: {results['overall_status']}")
        print(f"  - 健康百分比: {results['health_percentage']}%")
        print(f"  - 健康服务: {results['healthy_services']}/{results['total_services']}")
        print(f"  - 平均响应时间: {results['average_response_time']}ms")
        
        # 显示各类别状态
        for category, data in results['categories'].items():
            print(f"  - {category}: {data['healthy']}/{data['total']} 健康")
            
    except Exception as e:
        print(f"❌ 增强健康检查失败: {e}")
    
    # 2. 测试数据源
    print("\n📈 测试数据源连接...")
    
    # Yahoo Finance测试
    try:
        ticker = yf.Ticker("AAPL")
        info = ticker.info
        if info and 'symbol' in info:
            print("✅ Yahoo Finance: 正常")
        else:
            print("❌ Yahoo Finance: 数据异常")
    except Exception as e:
        print(f"❌ Yahoo Finance: {e}")
    
    # AKShare测试
    try:
        data = ak.stock_zh_a_spot_em()
        if data is not None and not data.empty:
            print(f"✅ AKShare: 正常 ({len(data)}条数据)")
        else:
            print("❌ AKShare: 无数据")
    except Exception as e:
        print(f"❌ AKShare: {e}")
    
    # 3. 测试API端点
    print("\n🌐 测试公共API端点...")
    
    api_tests = [
        ("Binance API", "https://api.binance.com/api/v3/ping"),
        ("Kraken API", "https://api.kraken.com/0/public/Time"),
        ("Yahoo Finance API", "https://query1.finance.yahoo.com/v8/finance/chart/AAPL")
    ]
    
    for name, url in api_tests:
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                print(f"✅ {name}: 正常 ({response.status_code})")
            else:
                print(f"⚠️ {name}: HTTP {response.status_code}")
        except requests.exceptions.Timeout:
            print(f"❌ {name}: 超时")
        except Exception as e:
            print(f"❌ {name}: {e}")
    
    # 4. 测试ML模型加载
    print("\n🤖 测试ML模型...")
    try:
        models_dir = "/Users/mac/Desktop/Arthera/MLModelTrainingTool"
        if os.path.exists(models_dir):
            from pathlib import Path
            model_files = list(Path(models_dir).glob("*lightgbm*.pkl")) + \
                         list(Path(models_dir).glob("*lightgbm*.joblib")) + \
                         list(Path(models_dir).glob("*lightgbm*.txt"))
            print(f"✅ ML模型目录: 发现 {len(model_files)} 个模型文件")
            
            # 尝试加载一个模型
            if model_files:
                try:
                    import lightgbm as lgb
                    import joblib
                    
                    model_file = model_files[0]
                    if model_file.suffix == '.txt':
                        model = lgb.Booster(model_file=str(model_file))
                    else:
                        model = joblib.load(model_file)
                    
                    if model is not None:
                        print(f"✅ 模型加载测试: 成功 ({model_file.name})")
                    else:
                        print("❌ 模型加载测试: 失败")
                except Exception as e:
                    print(f"❌ 模型加载测试: {e}")
            else:
                print("⚠️ 没有找到模型文件")
        else:
            print("❌ ML模型目录不存在")
    except Exception as e:
        print(f"❌ ML模型测试失败: {e}")
    
    # 5. 测试配置文件
    print("\n📁 测试配置文件...")
    config_files = [
        "config/services_config.json",
        "config/pools.json",
        "requirements.txt"
    ]
    
    for config_file in config_files:
        if os.path.exists(config_file):
            try:
                if config_file.endswith('.json'):
                    with open(config_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    print(f"✅ {config_file}: 正常 (有效JSON)")
                else:
                    print(f"✅ {config_file}: 存在")
            except Exception as e:
                print(f"❌ {config_file}: 格式错误 - {e}")
        else:
            print(f"⚠️ {config_file}: 文件不存在")
    
    print("\n🎯 服务连接测试完成!")

def main():
    """主函数"""
    try:
        asyncio.run(test_all_services())
    except KeyboardInterrupt:
        print("\n⏹️ 测试被用户中断")
    except Exception as e:
        print(f"\n❌ 测试过程发生错误: {e}")

if __name__ == "__main__":
    main()