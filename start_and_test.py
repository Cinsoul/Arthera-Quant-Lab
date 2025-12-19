#!/usr/bin/env python3
"""
启动服务器并测试API
"""

import subprocess
import time
import requests
import threading
import sys

def start_server():
    """在后台启动服务器"""
    print("🚀 启动服务器...")
    try:
        # 启动demo_server.py
        process = subprocess.Popen([
            sys.executable, "demo_server.py"
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return process
    except Exception as e:
        print(f"❌ 服务器启动失败: {e}")
        return None

def wait_for_server(max_wait=30):
    """等待服务器就绪"""
    print("⏳ 等待服务器就绪...")
    for i in range(max_wait):
        try:
            response = requests.get("http://localhost:8001/health", timeout=2)
            if response.status_code == 200:
                print(f"✅ 服务器就绪! (等待时间: {i+1}秒)")
                return True
        except:
            pass
        time.sleep(1)
    print("❌ 服务器启动超时")
    return False

def test_api():
    """测试API端点"""
    print("\n🧪 开始API测试...")
    
    endpoints = [
        ("/health", {}),
        ("/dashboard/risk-report", {'capital': 100000}),
        ("/dashboard/trading-stats", {'capital': 100000}),
        ("/strategies/backtest/momentum", {'symbols': 'AAPL,GOOGL'}),
        ("/analysis/indicators/AAPL", {'period': 20}),
        ("/dashboard/system-status", {})
    ]
    
    success_count = 0
    
    for endpoint, params in endpoints:
        try:
            url = f"http://localhost:8001{endpoint}"
            response = requests.get(url, params=params, timeout=5)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ {endpoint} - OK")
                if isinstance(data, dict) and 'data_source' in data:
                    print(f"   🎯 数据源: {data['data_source']}")
                success_count += 1
            else:
                print(f"❌ {endpoint} - Status: {response.status_code}")
        except Exception as e:
            print(f"❌ {endpoint} - 错误: {e}")
    
    print(f"\n📊 测试结果: {success_count}/{len(endpoints)} 个端点成功")
    return success_count == len(endpoints)

def main():
    """主函数"""
    print("🎯 启动Arthera量化交易系统测试...")
    
    # 启动服务器
    server_process = start_server()
    if not server_process:
        return
    
    try:
        # 等待服务器就绪
        if not wait_for_server():
            return
        
        # 运行API测试
        success = test_api()
        
        if success:
            print("\n🎉 所有测试通过! 系统正常运行")
            print("🌐 Web界面: http://localhost:8001")
            print("📊 API文档: http://localhost:8001/docs")
            print("\n按 Ctrl+C 停止服务器...")
            
            # 保持服务器运行
            try:
                server_process.wait()
            except KeyboardInterrupt:
                print("\n🛑 正在停止服务器...")
        else:
            print("\n❌ 部分测试失败")
            
    finally:
        # 清理进程
        if server_process:
            server_process.terminate()
            time.sleep(2)
            if server_process.poll() is None:
                server_process.kill()

if __name__ == "__main__":
    main()