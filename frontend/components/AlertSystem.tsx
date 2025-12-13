import { useState, useEffect } from 'react';
import { Bell, BellOff, TrendingUp, TrendingDown, AlertTriangle, Info, CheckCircle, XCircle, Clock, Settings, Plus, Volume2, VolumeX } from 'lucide-react';
import { useAlertService, AlertTemplates } from '../hooks/useAlertService';
import { Alert, AlertPriority as ServiceAlertPriority, AlertStatus as ServiceAlertStatus, AlertTriggerEvent } from '../services/AlertService';

// Compatibility types for UI
export type AlertType = 'price' | 'strategy' | 'risk' | 'news';
export type AlertPriority = 'high' | 'medium' | 'low' | 'critical';
export type AlertStatus = 'active' | 'triggered' | 'dismissed' | 'paused' | 'expired';

interface AlertSystemProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NewAlertFormData {
  type: AlertType;
  symbol: string;
  condition: string;
  targetValue: number;
  priority: AlertPriority;
}

export function AlertSystem({ isOpen, onClose }: AlertSystemProps) {
  const {
    alerts,
    statistics,
    triggerHistory,
    isLoading,
    error,
    createAlert,
    updateAlert,
    deleteAlert,
    toggleAlert,
    createPriceAlert,
    createVolumeAlert,
    createIndicatorAlert,
    onAlertTriggered
  } = useAlertService();

  const [filter, setFilter] = useState<'all' | ServiceAlertStatus>('all');
  const [showNewAlertForm, setShowNewAlertForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newAlertForm, setNewAlertForm] = useState<NewAlertFormData>({
    type: 'price',
    symbol: '600519',
    condition: 'price_above',
    targetValue: 0,
    priority: 'medium'
  });

  // Listen for real-time alert triggers
  useEffect(() => {
    const unsubscribe = onAlertTriggered((event: AlertTriggerEvent) => {
      if (soundEnabled) {
        // Play notification sound
        console.log('🔔 Alert triggered!', event.alert.name);
        
        // Browser notification if available
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`${event.alert.symbol} 警报触发`, {
            body: event.message.split('\n')[0], // First line of message
            icon: '/favicon.ico'
          });
        }
      }
    });

    return unsubscribe;
  }, [soundEnabled, onAlertTriggered]);

  const filteredAlerts = (alerts || []).filter(alert => {
    if (filter === 'all') return true;
    return alert.status === filter;
  });

  // Helper to convert alert conditions to display format
  const getConditionDisplay = (alert: Alert): string => {
    if (!alert.conditions || alert.conditions.length === 0) return 'No conditions';
    const condition = alert.conditions[0];
    
    switch (condition.type) {
      case 'price_above':
        return `价格 > ¥${condition.targetPrice}`;
      case 'price_below':
        return `价格 < ¥${condition.targetPrice}`;
      case 'volume_spike':
        return `成交量 > ${condition.volumeMultiplier || 2}x平均`;
      case 'indicator_cross_above':
        return `${condition.indicator} > ${condition.targetValue}`;
      case 'indicator_cross_below':
        return `${condition.indicator} < ${condition.targetValue}`;
      default:
        return condition.type;
    }
  };

  // Helper to get current and target values
  const getCurrentTargetValues = (alert: Alert) => {
    // This would normally come from real-time market data
    // For now, return placeholder values based on alert type
    if (!alert.conditions || alert.conditions.length === 0) return null;
    const condition = alert.conditions[0];
    if (!condition) return null;
    
    return {
      current: condition.targetPrice || 0,
      target: condition.targetPrice || 0
    };
  };

  // Quick alert creation handlers
  const handleQuickPriceAlert = async (symbol: string, price: number, direction: 'above' | 'below') => {
    try {
      await createPriceAlert(symbol, price, direction, {
        priority: 'medium',
        notifications: ['browser', soundEnabled ? 'sound' : 'browser'].filter(Boolean) as any[]
      });
      setShowNewAlertForm(false);
    } catch (error) {
      console.error('Failed to create price alert:', error);
    }
  };

  const handleTemplateSelect = async (templateName: string, symbol: string) => {
    try {
      let template;
      switch (templateName) {
        case 'breakout':
          template = AlertTemplates.priceBreakout(symbol, 100, 90); // Default values
          break;
        case 'rsi':
          template = AlertTemplates.rsiOverboughtOversold(symbol);
          break;
        case 'volume':
          template = AlertTemplates.volumeAnomaly(symbol);
          break;
        case 'macd':
          template = AlertTemplates.macdCross(symbol);
          break;
        default:
          return;
      }

      await createAlert({
        ...template,
        isEnabled: true,
        triggerOnce: false,
        notifications: ['browser', soundEnabled ? 'sound' : 'browser'].filter(Boolean) as any[]
      } as any);
      
      setShowTemplates(false);
      setShowNewAlertForm(false);
    } catch (error) {
      console.error('Failed to create template alert:', error);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      await deleteAlert(alertId);
    } catch (error) {
      console.error('Failed to delete alert:', error);
    }
  };

  const handleToggleAlert = async (alertId: string, enabled: boolean) => {
    try {
      await toggleAlert(alertId, enabled);
    } catch (error) {
      console.error('Failed to toggle alert:', error);
    }
  };

  // Helper to get alert type from conditions
  const getAlertType = (alert: Alert): AlertType => {
    if (!alert.conditions || alert.conditions.length === 0) return 'price';
    const condition = alert.conditions[0];
    
    if (condition.type.includes('price')) return 'price';
    if (condition.type.includes('volume')) return 'price';
    if (condition.type.includes('indicator')) return 'strategy';
    return 'price';
  };

  const getAlertIcon = (alert: Alert) => {
    const type = getAlertType(alert);
    switch (type) {
      case 'price':
        return <TrendingUp className="w-4 h-4" />;
      case 'strategy':
        return <TrendingDown className="w-4 h-4" />;
      case 'risk':
        return <AlertTriangle className="w-4 h-4" />;
      case 'news':
        return <Info className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: ServiceAlertPriority) => {
    switch (priority) {
      case 'critical':
        return 'text-red-500 border-red-500';
      case 'high':
        return 'text-[#f97316] border-[#f97316]';
      case 'medium':
        return 'text-[#f59e0b] border-[#f59e0b]';
      case 'low':
        return 'text-[#0ea5e9] border-[#0ea5e9]';
    }
  };

  const getStatusBadge = (status: ServiceAlertStatus) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-0.5 bg-[#0ea5e9]/20 text-[#0ea5e9] rounded text-xs bloomberg-code">ACTIVE</span>;
      case 'triggered':
        return <span className="px-2 py-0.5 bg-[#f97316]/20 text-[#f97316] rounded text-xs bloomberg-code">TRIGGERED</span>;
      case 'paused':
        return <span className="px-2 py-0.5 bg-[#1a2942] text-gray-600 rounded text-xs bloomberg-code">PAUSED</span>;
      case 'expired':
        return <span className="px-2 py-0.5 bg-gray-600/20 text-gray-500 rounded text-xs bloomberg-code">EXPIRED</span>;
    }
  };

  const dismissAlert = async (id: string) => {
    await handleToggleAlert(id, false); // Pause the alert
  };

  const getTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    return `${Math.floor(hours / 24)}天前`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-[450px] bg-[#0d1b2e] border-l border-[#1a2942] shadow-2xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2942] bg-[#0a1628]">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#0ea5e9]" />
          <div>
            <h3 className="text-sm text-gray-200 bloomberg-code">ALERT SYSTEM</h3>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
              <span>{statistics.triggeredToday} triggered today</span>
              <span>•</span>
              <span>{statistics.activeAlerts} active</span>
              {isLoading && <span>• Loading...</span>}
              {error && <span className="text-red-400">• Error</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 hover:bg-[#1a2942] rounded transition-colors"
            title={soundEnabled ? 'Mute notifications' : 'Enable notifications'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-gray-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-gray-600" />
            )}
          </button>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="p-1.5 hover:bg-[#1a2942] rounded transition-colors"
            title="Quick templates"
          >
            <Settings className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#1a2942] rounded transition-colors"
          >
            <span className="text-gray-500">✕</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 border-b border-[#1a2942]">
        <div className="flex gap-1">
          {[
            { id: 'all', label: '全部' },
            { id: 'triggered', label: '已触发' },
            { id: 'active', label: '监控中' },
            { id: 'paused', label: '已暂停' },
            { id: 'expired', label: '已过期' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-2 py-1.5 rounded text-xs transition-colors ${
                filter === f.id
                  ? 'bg-[#0ea5e9] text-white'
                  : 'bg-[#1a2942]/50 text-gray-500 hover:text-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Templates Panel */}
      {showTemplates && (
        <div className="px-4 py-3 border-b border-[#1a2942] bg-[#0a1628]">
          <h4 className="text-xs text-gray-400 mb-2 bloomberg-code">QUICK TEMPLATES</h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleTemplateSelect('breakout', '600519')}
              className="p-2 bg-[#1a2942]/50 hover:bg-[#1a2942] rounded text-xs text-left transition-colors"
            >
              <div className="text-gray-200">价格突破</div>
              <div className="text-gray-500 text-[10px]">支撑阻力位监控</div>
            </button>
            <button
              onClick={() => handleTemplateSelect('rsi', '600519')}
              className="p-2 bg-[#1a2942]/50 hover:bg-[#1a2942] rounded text-xs text-left transition-colors"
            >
              <div className="text-gray-200">RSI警报</div>
              <div className="text-gray-500 text-[10px]">超买超卖信号</div>
            </button>
            <button
              onClick={() => handleTemplateSelect('volume', '600519')}
              className="p-2 bg-[#1a2942]/50 hover:bg-[#1a2942] rounded text-xs text-left transition-colors"
            >
              <div className="text-gray-200">成交量异常</div>
              <div className="text-gray-500 text-[10px]">放量突破监控</div>
            </button>
            <button
              onClick={() => handleTemplateSelect('macd', '600519')}
              className="p-2 bg-[#1a2942]/50 hover:bg-[#1a2942] rounded text-xs text-left transition-colors"
            >
              <div className="text-gray-200">MACD交叉</div>
              <div className="text-gray-500 text-[10px]">金叉死叉信号</div>
            </button>
          </div>
        </div>
      )}

      {/* Alerts List */}
      <div className="flex-1 overflow-y-auto">
        {filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <Bell className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">No alerts in this category</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`px-4 py-3 border-b border-[#1a2942]/50 hover:bg-[#1a2942]/30 transition-colors ${
                alert.status === 'triggered' ? 'bg-[#f97316]/5' : ''
              }`}
            >
              {/* Alert Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-2">
                  <div className={`mt-0.5 ${getPriorityColor(alert.priority)}`}>
                    {getAlertIcon(alert)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm text-gray-200">{alert.name}</h4>
                      {getStatusBadge(alert.status)}
                    </div>
                    <p className="text-xs text-gray-500">{alert.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleAlert(alert.id, !alert.isEnabled)}
                    className={`p-1 rounded transition-colors ${
                      alert.isEnabled 
                        ? 'text-green-400 hover:bg-green-400/20' 
                        : 'text-gray-500 hover:bg-gray-500/20'
                    }`}
                    title={alert.isEnabled ? 'Disable alert' : 'Enable alert'}
                  >
                    {alert.isEnabled ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Alert Details */}
              <div className="ml-6 space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-600">股票:</span>
                  <span className="bloomberg-code text-[#f59e0b]">{alert.symbol}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-600">条件:</span>
                  <code className="text-gray-400 bloomberg-mono">{getConditionDisplay(alert)}</code>
                </div>
                {(() => {
                  const values = getCurrentTargetValues(alert);
                  return values && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-600">当前:</span>
                      <span className={`bloomberg-mono ${
                        values.current > values.target ? 'text-[#10b981]' : 'text-[#f97316]'
                      }`}>
                        {values.current}
                      </span>
                      <span className="text-gray-600">/ 目标:</span>
                      <span className="bloomberg-mono text-gray-400">{values.target}</span>
                    </div>
                  );
                })()}
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Clock className="w-3 h-3" />
                  <span>{getTimeAgo(alert.lastTriggered || alert.createdAt)}</span>
                </div>
                {alert.triggerCount > 0 && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span>触发次数: {alert.triggerCount}</span>
                  </div>
                )}
              </div>

              {/* Alert Actions */}
              <div className="ml-6 mt-2 flex gap-2">
                {alert.status === 'triggered' && (
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="px-2 py-1 bg-[#1a2942] hover:bg-[#2a3f5f] text-gray-400 rounded text-xs transition-colors"
                  >
                    暂停
                  </button>
                )}
                <button
                  onClick={() => handleDeleteAlert(alert.id)}
                  className="px-2 py-1 bg-[#f97316]/20 hover:bg-[#f97316]/30 text-[#f97316] rounded text-xs transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Alert Form */}
      {showNewAlertForm && (
        <div className="px-4 py-3 border-t border-[#1a2942] bg-[#0a1628]">
          <h4 className="text-xs text-gray-400 mb-3 bloomberg-code">CREATE NEW ALERT</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">股票代码</label>
              <input
                type="text"
                value={newAlertForm.symbol}
                onChange={(e) => setNewAlertForm({...newAlertForm, symbol: e.target.value})}
                placeholder="600519"
                className="w-full px-2 py-1 bg-[#1a2942] border border-[#2a3f5f] rounded text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#0ea5e9]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">类型</label>
                <select
                  value={newAlertForm.condition}
                  onChange={(e) => setNewAlertForm({...newAlertForm, condition: e.target.value})}
                  className="w-full px-2 py-1 bg-[#1a2942] border border-[#2a3f5f] rounded text-xs text-gray-200 focus:outline-none focus:border-[#0ea5e9]"
                >
                  <option value="price_above">价格突破</option>
                  <option value="price_below">价格跌破</option>
                  <option value="volume_spike">成交量异常</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">目标值</label>
                <input
                  type="number"
                  value={newAlertForm.targetValue}
                  onChange={(e) => setNewAlertForm({...newAlertForm, targetValue: parseFloat(e.target.value)})}
                  placeholder="1700"
                  className="w-full px-2 py-1 bg-[#1a2942] border border-[#2a3f5f] rounded text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#0ea5e9]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">优先级</label>
              <select
                value={newAlertForm.priority}
                onChange={(e) => setNewAlertForm({...newAlertForm, priority: e.target.value as AlertPriority})}
                className="w-full px-2 py-1 bg-[#1a2942] border border-[#2a3f5f] rounded text-xs text-gray-200 focus:outline-none focus:border-[#0ea5e9]"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="critical">严重</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (newAlertForm.condition === 'volume_spike') {
                    await createVolumeAlert(newAlertForm.symbol, newAlertForm.targetValue || 3);
                  } else {
                    const direction = newAlertForm.condition === 'price_above' ? 'above' : 'below';
                    await handleQuickPriceAlert(newAlertForm.symbol, newAlertForm.targetValue, direction);
                  }
                }}
                disabled={!newAlertForm.symbol || !newAlertForm.targetValue}
                className="flex-1 py-2 bg-[#0ea5e9] hover:bg-[#0284c7] disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-xs transition-colors"
              >
                创建警报
              </button>
              <button
                onClick={() => setShowNewAlertForm(false)}
                className="px-3 py-2 bg-[#1a2942] hover:bg-[#2a3f5f] text-gray-400 rounded text-xs transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#1a2942] bg-[#0a1628]">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>总计: {statistics.totalAlerts}</span>
          <span>本周触发: {statistics.triggeredThisWeek}</span>
        </div>
        <button
          onClick={() => setShowNewAlertForm(!showNewAlertForm)}
          className="w-full py-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded text-sm transition-colors bloomberg-code"
        >
          <Plus className="w-3 h-3 inline-block mr-1" />
          NEW ALERT
        </button>
      </div>
    </div>
  );
}

// Alert Toggle Button with Real Data
export function AlertSystemToggle({ onClick }: { onClick: () => void }) {
  const { statistics } = useAlertService();
  const unreadCount = statistics.triggeredToday;
  
  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-2 px-3 py-1.5 bg-[#1a2942]/50 border border-[#2a3f5f] rounded text-xs text-gray-400 hover:text-gray-200 hover:border-[#0ea5e9]/50 transition-colors"
    >
      <Bell className="w-3.5 h-3.5" />
      <span className="bloomberg-code">ALERTS</span>
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-[#f97316] rounded-full text-[10px] text-white bloomberg-mono min-w-[18px] text-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
