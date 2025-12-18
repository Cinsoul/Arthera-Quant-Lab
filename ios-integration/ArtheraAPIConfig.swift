//
//  ArtheraAPIConfig.swift
//  Arthera
//
//  iOS API配置：连接到统一的API Gateway和iOS Connector
//  Created: Integration Phase
//

import Foundation

/// Arthera API配置管理
public class ArtheraAPIConfig {
    
    public static let shared = ArtheraAPIConfig()
    
    // MARK: - Environment Configuration
    
    public enum Environment {
        case development   // 本地开发
        case demo         // 投资者演示
        case production   // 生产环境
        
        var baseURL: String {
            switch self {
            case .development:
                return "http://localhost:8000"  // 本地API Gateway
            case .demo:
                return "https://demo.arthera.app"  // 演示服务器
            case .production:
                return "https://api.arthera.app"   // 生产服务器
            }
        }
        
        var iosConnectorURL: String {
            switch self {
            case .development:
                return "http://localhost:8002"  // 本地iOS Connector
            case .demo:
                return "https://ios-demo.arthera.app"
            case .production:
                return "https://ios-api.arthera.app"
            }
        }
        
        var websocketURL: String {
            switch self {
            case .development:
                return "ws://localhost:8002/ios/ws"
            case .demo:
                return "wss://ios-demo.arthera.app/ios/ws"
            case .production:
                return "wss://ios-api.arthera.app/ios/ws"
            }
        }
    }
    
    // MARK: - Current Configuration
    
    #if DEBUG
    public private(set) var currentEnvironment: Environment = .development
    #else
    public private(set) var currentEnvironment: Environment = .production
    #endif
    
    // MARK: - API Endpoints
    
    public struct Endpoints {
        
        // iOS Connector Endpoints (Direct Swift service integration)
        public static func deepSeekSignal(config: ArtheraAPIConfig) -> String {
            return "\(config.currentEnvironment.iosConnectorURL)/ios/signals/deepseek/generate"
        }
        
        public static func bayesianUpdate(config: ArtheraAPIConfig) -> String {
            return "\(config.currentEnvironment.iosConnectorURL)/ios/bayesian/update-posterior"
        }
        
        public static func portfolioOptimization(config: ArtheraAPIConfig) -> String {
            return "\(config.currentEnvironment.iosConnectorURL)/ios/portfolio/optimize"
        }
        
        public static func kellyPositionSizing(config: ArtheraAPIConfig) -> String {
            return "\(config.currentEnvironment.iosConnectorURL)/ios/position/kelly-size"
        }
        
        public static func backtestRun(config: ArtheraAPIConfig) -> String {
            return "\(config.currentEnvironment.iosConnectorURL)/ios/backtest/run"
        }
        
        // API Gateway Endpoints (General backend services)
        public static func marketData(config: ArtheraAPIConfig) -> String {
            return "\(config.currentEnvironment.baseURL)/market-data"
        }
        
        public static func strategies(config: ArtheraAPIConfig) -> String {
            return "\(config.currentEnvironment.baseURL)/strategies"
        }
        
        public static func signals(config: ArtheraAPIConfig) -> String {
            return "\(config.currentEnvironment.baseURL)/signals"
        }
        
        public static func portfolio(config: ArtheraAPIConfig) -> String {
            return "\(config.currentEnvironment.baseURL)/portfolio"
        }
        
        public static func orders(config: ArtheraAPIConfig) -> String {
            return "\(config.currentEnvironment.baseURL)/orders"
        }
        
        public static func dashboard(config: ArtheraAPIConfig) -> String {
            return "\(config.currentEnvironment.baseURL)/dashboard"
        }
        
        // Health Check
        public static func health(config: ArtheraAPIConfig) -> String {
            return "\(config.currentEnvironment.iosConnectorURL)/health"
        }
    }
    
    // MARK: - Configuration Methods
    
    public func switchEnvironment(to environment: Environment) {
        currentEnvironment = environment
        NotificationCenter.default.post(
            name: .artheraAPIConfigChanged,
            object: self,
            userInfo: ["environment": environment]
        )
    }
    
    public func getWebSocketURL() -> URL? {
        return URL(string: currentEnvironment.websocketURL)
    }
    
    public func isLocalDevelopment() -> Bool {
        return currentEnvironment == .development
    }
    
    // MARK: - Request Configuration
    
    public func defaultHeaders() -> [String: String] {
        return [
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Arthera-iOS/\(Bundle.main.appVersion)",
            "X-API-Version": "1.0.0"
        ]
    }
    
    public func requestTimeout() -> TimeInterval {
        switch currentEnvironment {
        case .development:
            return 30.0  // 开发环境允许更长超时
        case .demo, .production:
            return 15.0  // 生产环境较短超时
        }
    }
}

// MARK: - Bundle Extension

extension Bundle {
    var appVersion: String {
        return infoDictionary?["CFBundleShortVersionString"] as? String ?? "Unknown"
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let artheraAPIConfigChanged = Notification.Name("ArtheraAPIConfigChanged")
}

// MARK: - Demo Configuration Helper

/// 投资者演示配置助手
public struct DemoConfig {
    
    /// 切换到演示模式
    public static func enableDemoMode() {
        ArtheraAPIConfig.shared.switchEnvironment(to: .demo)
        
        // 设置演示模式特定参数
        UserDefaults.standard.set(true, forKey: "demo_mode_enabled")
        UserDefaults.standard.set(Date(), forKey: "demo_session_start")
    }
    
    /// 检查是否为演示模式
    public static func isDemoMode() -> Bool {
        return UserDefaults.standard.bool(forKey: "demo_mode_enabled") &&
               ArtheraAPIConfig.shared.currentEnvironment == .demo
    }
    
    /// 演示会话信息
    public static func demoSessionInfo() -> (isActive: Bool, duration: TimeInterval?) {
        let isDemo = isDemoMode()
        let startDate = UserDefaults.standard.object(forKey: "demo_session_start") as? Date
        let duration = startDate?.timeIntervalSinceNow.magnitude
        
        return (isDemo, duration)
    }
}

// MARK: - Network Monitoring

/// 网络连接监控（简化版）
public class NetworkMonitor: ObservableObject {
    
    public static let shared = NetworkMonitor()
    
    @Published public var isConnected: Bool = true
    @Published public var isBackendHealthy: Bool = false
    @Published public var lastHealthCheck: Date?
    
    private init() {
        Task {
            await checkBackendHealth()
        }
    }
    
    /// 检查后端健康状态
    @MainActor
    public func checkBackendHealth() async {
        do {
            let healthURL = ArtheraAPIConfig.Endpoints.health(config: ArtheraAPIConfig.shared)
            let url = URL(string: healthURL)!
            
            let (data, response) = try await URLSession.shared.data(from: url)
            
            if let httpResponse = response as? HTTPURLResponse,
               httpResponse.statusCode == 200 {
                isBackendHealthy = true
                lastHealthCheck = Date()
                
                // 解析健康检查响应
                if let healthInfo = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    print("✅ Backend health check passed: \(healthInfo)")
                }
            } else {
                isBackendHealthy = false
            }
        } catch {
            isBackendHealthy = false
            print("❌ Backend health check failed: \(error)")
        }
    }
    
    /// 定期健康检查
    public func startPeriodicHealthCheck(interval: TimeInterval = 30.0) {
        Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { _ in
            Task {
                await self.checkBackendHealth()
            }
        }
    }
}