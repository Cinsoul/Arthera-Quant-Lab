-- Trading Engine Database Schema
-- 支持事件驱动、可审计的量化交易系统

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- 1. 策略管理 (Strategies)
-- ==============================================

CREATE TABLE strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    strategy_type VARCHAR(50) NOT NULL, -- 'momentum', 'mean_reversion', 'arbitrage', etc.
    version VARCHAR(20) DEFAULT '1.0.0',
    parameters JSONB NOT NULL DEFAULT '{}',
    risk_limits JSONB DEFAULT '{}', -- max_position, max_single_order, etc.
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100),
    
    CONSTRAINT unique_strategy_name_version UNIQUE(name, version)
);

-- 创建索引
CREATE INDEX idx_strategies_active ON strategies(is_active);
CREATE INDEX idx_strategies_type ON strategies(strategy_type);

-- ==============================================
-- 2. 信号输出 (Signals)
-- ==============================================

CREATE TABLE signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID NOT NULL REFERENCES strategies(id),
    symbol VARCHAR(20) NOT NULL,
    signal_time TIMESTAMPTZ NOT NULL,
    signal_type VARCHAR(50) NOT NULL, -- 'BUY', 'SELL', 'HOLD', 'TARGET_WEIGHT'
    signal_strength DECIMAL(10,6), -- -1.0 to 1.0 or target weight
    target_position DECIMAL(15,2), -- target shares/amount
    confidence DECIMAL(5,4), -- 0.0 to 1.0
    metadata JSONB DEFAULT '{}', -- factors, indicators, reasoning
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_signals_strategy_symbol ON signals(strategy_id, symbol);
CREATE INDEX idx_signals_time ON signals(signal_time);
CREATE INDEX idx_signals_processed ON signals(processed_at);

-- ==============================================
-- 3. 风控检查记录 (Risk Checks)
-- ==============================================

CREATE TABLE risk_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signal_id UUID REFERENCES signals(id),
    order_id UUID, -- 后面定义
    check_type VARCHAR(100) NOT NULL, -- 'position_limit', 'concentration', 'volatility', etc.
    status VARCHAR(20) NOT NULL, -- 'PASSED', 'REJECTED', 'WARNING'
    rejection_reason TEXT,
    check_value DECIMAL(15,6),
    limit_value DECIMAL(15,6),
    metadata JSONB DEFAULT '{}',
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_risk_checks_signal ON risk_checks(signal_id);
CREATE INDEX idx_risk_checks_status ON risk_checks(status);

-- ==============================================
-- 4. 订单管理 (Orders)
-- ==============================================

CREATE TYPE order_status AS ENUM (
    'NEW', 'VALIDATED', 'ACCEPTED', 'PARTIALLY_FILLED', 
    'FILLED', 'REJECTED', 'CANCELLED', 'EXPIRED'
);

CREATE TYPE order_side AS ENUM ('BUY', 'SELL');
CREATE TYPE order_type AS ENUM ('MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT');
CREATE TYPE time_in_force AS ENUM ('DAY', 'GTC', 'IOC', 'FOK');

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_order_id VARCHAR(50) UNIQUE NOT NULL,
    strategy_id UUID NOT NULL REFERENCES strategies(id),
    signal_id UUID REFERENCES signals(id),
    symbol VARCHAR(20) NOT NULL,
    side order_side NOT NULL,
    order_type order_type NOT NULL DEFAULT 'MARKET',
    quantity DECIMAL(15,2) NOT NULL CHECK (quantity > 0),
    price DECIMAL(15,6), -- NULL for market orders
    stop_price DECIMAL(15,6), -- for stop orders
    time_in_force time_in_force DEFAULT 'DAY',
    status order_status DEFAULT 'NEW',
    filled_quantity DECIMAL(15,2) DEFAULT 0,
    avg_fill_price DECIMAL(15,6),
    commission DECIMAL(15,6) DEFAULT 0,
    slippage DECIMAL(15,6) DEFAULT 0,
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    filled_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

-- 创建索引
CREATE INDEX idx_orders_strategy ON orders(strategy_id);
CREATE INDEX idx_orders_symbol ON orders(symbol);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_submitted ON orders(submitted_at);
CREATE INDEX idx_orders_signal ON orders(signal_id);

-- ==============================================
-- 5. 成交记录 (Fills/Trades)
-- ==============================================

CREATE TABLE fills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id),
    fill_id VARCHAR(50) UNIQUE NOT NULL, -- exchange fill ID
    symbol VARCHAR(20) NOT NULL,
    side order_side NOT NULL,
    quantity DECIMAL(15,2) NOT NULL CHECK (quantity > 0),
    price DECIMAL(15,6) NOT NULL CHECK (price > 0),
    commission DECIMAL(15,6) DEFAULT 0,
    slippage DECIMAL(15,6) DEFAULT 0,
    market_impact DECIMAL(15,6) DEFAULT 0, -- basis points
    liquidity_flag VARCHAR(10), -- 'MAKER', 'TAKER'
    fill_time TIMESTAMPTZ NOT NULL,
    trade_date DATE NOT NULL,
    settlement_date DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_fills_order ON fills(order_id);
CREATE INDEX idx_fills_symbol ON fills(symbol);
CREATE INDEX idx_fills_time ON fills(fill_time);
CREATE INDEX idx_fills_trade_date ON fills(trade_date);

-- ==============================================
-- 6. 持仓管理 (Positions)
-- ==============================================

CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID NOT NULL REFERENCES strategies(id),
    symbol VARCHAR(20) NOT NULL,
    quantity DECIMAL(15,2) NOT NULL DEFAULT 0,
    average_price DECIMAL(15,6),
    market_value DECIMAL(15,2),
    unrealized_pnl DECIMAL(15,2) DEFAULT 0,
    realized_pnl DECIMAL(15,2) DEFAULT 0,
    total_pnl DECIMAL(15,2) DEFAULT 0,
    last_price DECIMAL(15,6),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    as_of_date DATE DEFAULT CURRENT_DATE,
    
    CONSTRAINT unique_strategy_symbol_date UNIQUE(strategy_id, symbol, as_of_date)
);

CREATE INDEX idx_positions_strategy ON positions(strategy_id);
CREATE INDEX idx_positions_symbol ON positions(symbol);
CREATE INDEX idx_positions_date ON positions(as_of_date);

-- ==============================================
-- 7. 组合净值 (Portfolio NAV)
-- ==============================================

CREATE TABLE portfolio_nav (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID NOT NULL REFERENCES strategies(id),
    nav_date DATE NOT NULL,
    nav_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_value DECIMAL(15,2) NOT NULL,
    cash DECIMAL(15,2) NOT NULL DEFAULT 0,
    securities_value DECIMAL(15,2) NOT NULL DEFAULT 0,
    unrealized_pnl DECIMAL(15,2) DEFAULT 0,
    realized_pnl DECIMAL(15,2) DEFAULT 0,
    daily_return DECIMAL(10,6), -- percentage
    cumulative_return DECIMAL(10,6), -- percentage
    drawdown DECIMAL(10,6), -- current drawdown from peak
    max_drawdown DECIMAL(10,6), -- max historical drawdown
    sharpe_ratio DECIMAL(10,6),
    volatility DECIMAL(10,6), -- annualized
    turnover DECIMAL(10,6), -- daily turnover
    num_positions INTEGER DEFAULT 0,
    num_trades INTEGER DEFAULT 0,
    commission_paid DECIMAL(15,6) DEFAULT 0,
    
    CONSTRAINT unique_strategy_nav_date UNIQUE(strategy_id, nav_date)
);

CREATE INDEX idx_portfolio_nav_strategy ON portfolio_nav(strategy_id);
CREATE INDEX idx_portfolio_nav_date ON portfolio_nav(nav_date);

-- ==============================================
-- 8. 审计事件 (Audit Trail)
-- ==============================================

CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL, -- 'SIGNAL_GENERATED', 'ORDER_SUBMITTED', 'TRADE_EXECUTED', etc.
    entity_type VARCHAR(50) NOT NULL, -- 'STRATEGY', 'ORDER', 'FILL', 'POSITION'
    entity_id UUID NOT NULL,
    user_id VARCHAR(100),
    event_data JSONB NOT NULL,
    source_system VARCHAR(50),
    correlation_id UUID, -- 用于关联一系列相关事件
    event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_events_type ON audit_events(event_type);
CREATE INDEX idx_audit_events_entity ON audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_events_time ON audit_events(event_time);
CREATE INDEX idx_audit_events_correlation ON audit_events(correlation_id);

-- ==============================================
-- 9. 市场数据 (Market Data)
-- ==============================================

CREATE TABLE market_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(20) NOT NULL,
    data_type VARCHAR(20) NOT NULL, -- 'OHLCV', 'TICK', 'DEPTH'
    timeframe VARCHAR(10), -- '1m', '5m', '1h', '1d', etc.
    timestamp TIMESTAMPTZ NOT NULL,
    open_price DECIMAL(15,6),
    high_price DECIMAL(15,6),
    low_price DECIMAL(15,6),
    close_price DECIMAL(15,6),
    volume DECIMAL(20,2),
    vwap DECIMAL(15,6), -- volume weighted average price
    bid_price DECIMAL(15,6),
    ask_price DECIMAL(15,6),
    bid_size DECIMAL(15,2),
    ask_size DECIMAL(15,2),
    data JSONB, -- 额外数据
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_market_data UNIQUE(symbol, data_type, timeframe, timestamp)
);

CREATE INDEX idx_market_data_symbol_time ON market_data(symbol, timestamp);
CREATE INDEX idx_market_data_type ON market_data(data_type);

-- ==============================================
-- 10. 系统配置 (System Configuration)
-- ==============================================

CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入默认配置
INSERT INTO system_config (config_key, config_value, description) VALUES
('risk_limits.max_position_size', '{"default": 100000}', '最大持仓金额'),
('risk_limits.max_concentration', '{"default": 0.1}', '最大集中度'),
('trading_hours', '{"start": "09:30", "end": "16:00", "timezone": "Asia/Shanghai"}', '交易时间'),
('commission_rates', '{"stock": 0.0003, "futures": 0.0001}', '手续费率'),
('slippage_model', '{"type": "linear", "factor": 0.001}', '滑点模型');

-- ==============================================
-- 触发器：自动更新时间戳
-- ==============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表创建触发器
CREATE TRIGGER update_strategies_updated_at BEFORE UPDATE ON strategies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- 视图：便于查询的视图
-- ==============================================

-- 策略表现视图
CREATE VIEW strategy_performance AS
SELECT 
    s.id,
    s.name,
    s.strategy_type,
    pn.total_value,
    pn.cumulative_return,
    pn.sharpe_ratio,
    pn.max_drawdown,
    pn.volatility,
    pn.turnover,
    pn.num_trades,
    pn.nav_date,
    pn.nav_time
FROM strategies s
LEFT JOIN portfolio_nav pn ON s.id = pn.strategy_id
WHERE s.is_active = true;

-- 今日交易统计视图
CREATE VIEW daily_trading_stats AS
SELECT 
    DATE(o.submitted_at) as trade_date,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN o.status = 'FILLED' THEN 1 END) as filled_orders,
    COUNT(CASE WHEN o.status = 'REJECTED' THEN 1 END) as rejected_orders,
    SUM(CASE WHEN o.status = 'FILLED' THEN o.quantity * o.avg_fill_price ELSE 0 END) as total_volume,
    AVG(CASE WHEN o.status = 'FILLED' THEN o.slippage ELSE NULL END) as avg_slippage,
    SUM(CASE WHEN o.status = 'FILLED' THEN o.commission ELSE 0 END) as total_commission
FROM orders o
WHERE o.submitted_at >= CURRENT_DATE
GROUP BY DATE(o.submitted_at);

-- 成功：数据库初始化完成
SELECT 'Trading Engine Database Initialized Successfully!' as status;