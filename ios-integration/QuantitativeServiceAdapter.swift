//
//  QuantitativeServiceAdapter.swift
//  Arthera
//
//  Adapter服务：连接现有iOS Quantitative Services到新的统一后端
//  保持现有代码接口不变，内部切换到API Gateway/iOS Connector
//

import Foundation
import Combine

/// 量化服务适配器：无缝连接iOS服务到统一后端
@MainActor
public class QuantitativeServiceAdapter: ObservableObject {
    
    public static let shared = QuantitativeServiceAdapter()
    
    // MARK: - Dependencies
    
    private let apiConfig = ArtheraAPIConfig.shared
    private let networkMonitor = NetworkMonitor.shared
    
    // MARK: - Published State
    
    @Published public var isConnected: Bool = false
    @Published public var lastError: Error?
    @Published public var connectionStatus: ConnectionStatus = .disconnected
    
    public enum ConnectionStatus {
        case disconnected
        case connecting
        case connected
        case error(String)
        
        var description: String {
            switch self {
            case .disconnected: return "未连接"
            case .connecting: return "连接中"
            case .connected: return "已连接"
            case .error(let message): return "错误: \(message)"
            }
        }
    }
    
    // MARK: - HTTP Client
    
    private let session: URLSession
    
    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = apiConfig.requestTimeout()
        config.timeoutIntervalForResource = 60.0
        self.session = URLSession(configuration: config)
        
        setupConnectionMonitoring()
    }
    
    // MARK: - Connection Management
    
    private func setupConnectionMonitoring() {
        // 监听网络状态变化
        networkMonitor.$isBackendHealthy
            .receive(on: DispatchQueue.main)
            .sink { [weak self] isHealthy in
                self?.isConnected = isHealthy
                self?.connectionStatus = isHealthy ? .connected : .disconnected
            }
            .store(in: &cancellables)
        
        // 启动健康检查
        networkMonitor.startPeriodicHealthCheck()
    }
    
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - DeepSeek Signal Generation Adapter
    
    /// 适配DeepSeekSignalGenerator.generateSignal()
    /// 保持原有接口，内部调用新的iOS Connector
    public func generateDeepSeekSignal(
        symbol: String,
        marketData: [String: Any],
        analysisConfig: [String: Any]? = nil
    ) async throws -> DeepSeekQuantAnalysis {
        
        connectionStatus = .connecting
        
        do {
            let request = DeepSeekSignalRequest(
                symbol: symbol,
                market_data: marketData,
                analysis_config: analysisConfig,
                include_uncertainty: true
            )
            
            let endpoint = ArtheraAPIConfig.Endpoints.deepSeekSignal(config: apiConfig)
            let response: DeepSeekQuantAnalysis = try await performRequest(
                endpoint: endpoint,
                method: "POST",
                body: request
            )
            
            connectionStatus = .connected
            return response
            
        } catch {
            connectionStatus = .error(error.localizedDescription)
            lastError = error
            throw error
        }
    }
    
    // MARK: - Bayesian Uncertainty Adapter
    
    /// 适配BayesianUncertaintyService.updatePosterior()
    public func updateBayesianPosterior(
        symbol: String,
        priorMean: Double,
        priorVariance: Double,
        newObservation: Double? = nil,
        sector: String? = nil
    ) async throws -> BayesianPosterior {
        
        let request = BayesianUpdateRequest(
            symbol: symbol,
            prior_mean: priorMean,
            prior_variance: priorVariance,
            new_observation: newObservation,
            sector: sector
        )
        
        let endpoint = ArtheraAPIConfig.Endpoints.bayesianUpdate(config: apiConfig)
        return try await performRequest(endpoint: endpoint, method: "POST", body: request)
    }
    
    // MARK: - Portfolio Optimization Adapter
    
    /// 适配BayesianPortfolioOptimizer.optimizePortfolio()
    public func optimizePortfolio(
        assets: [String],
        expectedReturns: [Double],
        covarianceMatrix: [[Double]],
        riskAversion: Double = 1.0,
        constraints: [String: Any]? = nil
    ) async throws -> PortfolioOptimizationResult {
        
        let request = PortfolioOptimizationRequest(
            assets: assets,
            expected_returns: expectedReturns,
            covariance_matrix: covarianceMatrix,
            risk_aversion: riskAversion,
            constraints: constraints
        )
        
        let endpoint = ArtheraAPIConfig.Endpoints.portfolioOptimization(config: apiConfig)
        return try await performRequest(endpoint: endpoint, method: "POST", body: request)
    }
    
    // MARK: - Kelly Position Sizing Adapter
    
    /// 适配KellyPositionSizer.calculateOptimalSize()
    public func calculateKellyPosition(
        signal: [String: Any],
        portfolioValue: Double,
        maxPositionSize: Double = 0.1,
        kellyFraction: Double = 0.25
    ) async throws -> KellyPositionResult {
        
        let request = KellyPositionRequest(
            signal: signal,
            portfolio_value: portfolioValue,
            max_position_size: maxPositionSize,
            kelly_fraction: kellyFraction
        )
        
        let endpoint = ArtheraAPIConfig.Endpoints.kellyPositionSizing(config: apiConfig)
        return try await performRequest(endpoint: endpoint, method: "POST", body: request)
    }
    
    // MARK: - Backtest Adapter
    
    /// 适配PurgedKFoldBacktester.runBacktest()
    public func runBacktest(
        strategyConfig: [String: Any],
        startDate: String,
        endDate: String,
        symbols: [String],
        initialCapital: Double = 100000.0
    ) async throws -> BacktestResult {
        
        let request = BacktestRequest(
            strategy_config: strategyConfig,
            start_date: startDate,
            end_date: endDate,
            symbols: symbols,
            initial_capital: initialCapital
        )
        
        let endpoint = ArtheraAPIConfig.Endpoints.backtestRun(config: apiConfig)
        return try await performRequest(endpoint: endpoint, method: "POST", body: request)
    }
    
    // MARK: - Generic Request Handler
    
    private func performRequest<T: Codable, U: Codable>(
        endpoint: String,
        method: String,
        body: T? = nil
    ) async throws -> U {
        
        guard let url = URL(string: endpoint) else {
            throw QuantitativeServiceError.invalidURL(endpoint)
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        
        // 设置头部
        for (key, value) in apiConfig.defaultHeaders() {
            request.setValue(value, forHTTPHeaderField: key)
        }
        
        // 设置请求体
        if let body = body {
            do {
                let jsonData = try JSONEncoder().encode(body)
                request.httpBody = jsonData
            } catch {
                throw QuantitativeServiceError.encodingError(error)
            }
        }
        
        // 执行请求
        do {
            let (data, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw QuantitativeServiceError.invalidResponse
            }
            
            guard 200...299 ~= httpResponse.statusCode else {
                throw QuantitativeServiceError.httpError(httpResponse.statusCode, String(data: data, encoding: .utf8))
            }
            
            // 解析响应
            do {
                let decoder = JSONDecoder()
                decoder.dateDecodingStrategy = .iso8601
                decoder.keyDecodingStrategy = .convertFromSnakeCase
                return try decoder.decode(U.self, from: data)
            } catch {
                throw QuantitativeServiceError.decodingError(error)
            }
            
        } catch {
            if error is QuantitativeServiceError {
                throw error
            } else {
                throw QuantitativeServiceError.networkError(error)
            }
        }
    }
    
    // MARK: - WebSocket Support (for real-time updates)
    
    public func connectWebSocket() async {
        guard let wsURL = apiConfig.getWebSocketURL() else {
            print("❌ Invalid WebSocket URL")
            return
        }
        
        // WebSocket连接逻辑
        print("🔗 Connecting to WebSocket: \(wsURL)")
        // 这里可以集成WebSocket连接逻辑
    }
}

// MARK: - Error Types

public enum QuantitativeServiceError: Error, LocalizedError {
    case invalidURL(String)
    case networkError(Error)
    case httpError(Int, String?)
    case encodingError(Error)
    case decodingError(Error)
    case invalidResponse
    case serviceUnavailable
    
    public var errorDescription: String? {
        switch self {
        case .invalidURL(let url):
            return "无效的URL: \(url)"
        case .networkError(let error):
            return "网络错误: \(error.localizedDescription)"
        case .httpError(let code, let message):
            return "HTTP错误 \(code): \(message ?? "未知错误")"
        case .encodingError(let error):
            return "编码错误: \(error.localizedDescription)"
        case .decodingError(let error):
            return "解码错误: \(error.localizedDescription)"
        case .invalidResponse:
            return "无效的响应"
        case .serviceUnavailable:
            return "服务暂时不可用"
        }
    }
}

// MARK: - Request/Response Models (matching iOS Connector)

struct DeepSeekSignalRequest: Codable {
    let symbol: String
    let market_data: [String: Any]
    let analysis_config: [String: Any]?
    let include_uncertainty: Bool
    
    enum CodingKeys: String, CodingKey {
        case symbol, market_data, analysis_config, include_uncertainty
    }
    
    init(symbol: String, market_data: [String: Any], analysis_config: [String: Any]?, include_uncertainty: Bool) {
        self.symbol = symbol
        self.market_data = market_data
        self.analysis_config = analysis_config
        self.include_uncertainty = include_uncertainty
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(symbol, forKey: .symbol)
        try container.encode(include_uncertainty, forKey: .include_uncertainty)
        
        // Convert [String: Any] to JSON data for encoding
        if !market_data.isEmpty {
            let jsonData = try JSONSerialization.data(withJSONObject: market_data)
            let jsonString = String(data: jsonData, encoding: .utf8) ?? "{}"
            try container.encode(jsonString, forKey: .market_data)
        }
        
        if let analysisConfig = analysis_config {
            let jsonData = try JSONSerialization.data(withJSONObject: analysisConfig)
            let jsonString = String(data: jsonData, encoding: .utf8) ?? "{}"
            try container.encode(jsonString, forKey: .analysis_config)
        }
    }
}

struct BayesianUpdateRequest: Codable {
    let symbol: String
    let prior_mean: Double
    let prior_variance: Double
    let new_observation: Double?
    let sector: String?
}

struct PortfolioOptimizationRequest: Codable {
    let assets: [String]
    let expected_returns: [Double]
    let covariance_matrix: [[Double]]
    let risk_aversion: Double
    let constraints: [String: Any]?
    
    enum CodingKeys: String, CodingKey {
        case assets, expected_returns, covariance_matrix, risk_aversion, constraints
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(assets, forKey: .assets)
        try container.encode(expected_returns, forKey: .expected_returns)
        try container.encode(covariance_matrix, forKey: .covariance_matrix)
        try container.encode(risk_aversion, forKey: .risk_aversion)
        
        if let constraints = constraints {
            let jsonData = try JSONSerialization.data(withJSONObject: constraints)
            let jsonString = String(data: jsonData, encoding: .utf8) ?? "{}"
            try container.encode(jsonString, forKey: .constraints)
        }
    }
}

struct KellyPositionRequest: Codable {
    let signal: [String: Any]
    let portfolio_value: Double
    let max_position_size: Double
    let kelly_fraction: Double
    
    enum CodingKeys: String, CodingKey {
        case signal, portfolio_value, max_position_size, kelly_fraction
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(portfolio_value, forKey: .portfolio_value)
        try container.encode(max_position_size, forKey: .max_position_size)
        try container.encode(kelly_fraction, forKey: .kelly_fraction)
        
        let jsonData = try JSONSerialization.data(withJSONObject: signal)
        let jsonString = String(data: jsonData, encoding: .utf8) ?? "{}"
        try container.encode(jsonString, forKey: .signal)
    }
}

struct BacktestRequest: Codable {
    let strategy_config: [String: Any]
    let start_date: String
    let end_date: String
    let symbols: [String]
    let initial_capital: Double
    
    enum CodingKeys: String, CodingKey {
        case strategy_config, start_date, end_date, symbols, initial_capital
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(start_date, forKey: .start_date)
        try container.encode(end_date, forKey: .end_date)
        try container.encode(symbols, forKey: .symbols)
        try container.encode(initial_capital, forKey: .initial_capital)
        
        let jsonData = try JSONSerialization.data(withJSONObject: strategy_config)
        let jsonString = String(data: jsonData, encoding: .utf8) ?? "{}"
        try container.encode(jsonString, forKey: .strategy_config)
    }
}

// MARK: - Response Types (using existing Arthera models)

// These should match the existing Swift models in the Arthera app
typealias DeepSeekQuantAnalysis = [String: Any] // Placeholder - use actual type
typealias BayesianPosterior = [String: Any]     // Placeholder - use actual type  
typealias PortfolioOptimizationResult = [String: Any] // Placeholder - use actual type
typealias KellyPositionResult = [String: Any]   // Placeholder - use actual type
typealias BacktestResult = [String: Any]        // Placeholder - use actual type