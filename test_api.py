#!/usr/bin/env python3
"""
简单的API测试脚本
"""

import requests
import json
import time

def test_endpoint(url, params=None):
    """测试单个API端点"""
    try:
        response = requests.get(url, params=params, timeout=5)
        print(f"✅ {url} - Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, dict):
                key_count = len(data.keys())
                print(f"   📊 Response keys: {key_count}")
                if 'data_source' in data:
                    print(f"   🎯 Data source: {data['data_source']}")
            return True
        else:
            print(f"   ❌ Error: {response.status_code} - {response.text[:100]}")
            return False
    except Exception as e:
        print(f"❌ {url} - Error: {e}")
        return False

def main():
    """运行API测试"""
    base_url = "http://localhost:8001"
    
    # 等待服务器启动
    print("🚀 开始API测试...")
    
    # 测试健康检查
    test_endpoint(f"{base_url}/health")
    
    # 测试风险报告
    test_endpoint(f"{base_url}/dashboard/risk-report", {
        'capital': 100000,
        'market': 'mixed'
    })
    
    # 测试交易统计
    test_endpoint(f"{base_url}/dashboard/trading-stats", {
        'capital': 100000
    })
    
    # 测试策略回测
    test_endpoint(f"{base_url}/strategies/backtest/momentum", {
        'symbols': 'AAPL,GOOGL',
        'period': '6M'
    })
    
    # 测试技术指标
    test_endpoint(f"{base_url}/analysis/indicators/AAPL", {
        'period': 20,
        'points': 50
    })
    
    # 测试系统状态
    test_endpoint(f"{base_url}/dashboard/system-status")
    
    print("🎉 API测试完成!")

if __name__ == "__main__":
    main()