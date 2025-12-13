import { Component, ReactNode } from 'react';
import { getStrategyPerformanceMonitor } from '../services';

interface Props {
  children: ReactNode;
  fallback: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class SafeComponentWrapper extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Component error caught:', error, errorInfo);
    console.error('Component stack:', errorInfo.componentStack);
    
    // 调用可选的错误处理回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // 发送错误到全局错误处理系统
    window.dispatchEvent(new CustomEvent('component-error', {
      detail: { error, errorInfo }
    }));

    // 集成性能监控服务 (新增)
    try {
      const performanceMonitor = getStrategyPerformanceMonitor();
      performanceMonitor.logError('critical', 'React Component', error.message, {
        componentStack: errorInfo.componentStack,
        error: error.toString(),
        errorInfo
      });
    } catch (monitorError) {
      console.error('Failed to log error to performance monitor:', monitorError);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}