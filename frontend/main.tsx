
import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import App from "./App.tsx";
import TestApp from "./TestApp.tsx";
import MinimalApp from "./MinimalApp.tsx";
import ServiceTestApp from "./ServiceTestApp.tsx";
import SimpleTestApp from "./SimpleTestApp.tsx";
import "./index.css";

console.log("Main.tsx loading...");

// Simple test component to verify React is working
function SimpleApp() {
  console.log("SimpleApp rendering...");
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a1628',
      color: 'white',
      padding: '40px',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '2rem' }}>🚀 Arthera Quant Lab</h1>
      <div style={{
        padding: '30px',
        border: '2px solid #0ea5e9',
        borderRadius: '12px',
        textAlign: 'center',
        backgroundColor: 'rgba(14, 165, 233, 0.1)'
      }}>
        <h2>系统状态</h2>
        <p style={{ fontSize: '18px', margin: '10px 0' }}>✅ React 已加载</p>
        <p style={{ fontSize: '18px', margin: '10px 0' }}>✅ Vite 开发服务器运行中</p>
        <p style={{ fontSize: '18px', margin: '10px 0' }}>✅ TypeScript 编译成功</p>
        <button 
          onClick={() => alert('React 交互正常工作!')}
          style={{
            padding: '12px 24px',
            backgroundColor: '#10b981',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '16px',
            cursor: 'pointer',
            marginTop: '20px'
          }}
        >
          测试交互
        </button>
      </div>
      
      <div style={{ marginTop: '40px', textAlign: 'center' }}>
        <p style={{ fontSize: '16px', opacity: 0.8 }}>
          如果您看到此页面，说明基础框架运行正常
        </p>
        <a 
          href="/?test=true" 
          style={{ 
            color: '#0ea5e9', 
            textDecoration: 'underline',
            fontSize: '16px' 
          }}
        >
          点击这里访问测试页面
        </a>
      </div>
    </div>
  );
}

// Basic error boundary
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  try {
    return <>{children}</>;
  } catch (error) {
    console.error("Error in app:", error);
    return (
      <div style={{ 
        minHeight: '100vh',
        background: '#1e1e1e', 
        color: '#ff6b6b', 
        padding: '20px',
        fontFamily: 'monospace',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>
          <h1>应用加载错误</h1>
          <pre>{String(error)}</pre>
        </div>
      </div>
    );
  }
}

// Use test app if URL has test parameter  
const useTestApp = window.location.search.includes('test=true') || window.location.pathname === '/test';
const useMinimalApp = window.location.search.includes('minimal=true') || window.location.pathname === '/minimal';
const useServiceTest = window.location.search.includes('service=true') || window.location.pathname === '/service';

console.log("Using test app:", useTestApp);
console.log("Using minimal app:", useMinimalApp);

const rootElement = document.getElementById("root");
console.log("Root element:", rootElement);

if (rootElement) {
  try {
    const root = createRoot(rootElement);
    console.log("Root created, rendering app...");
    
    // 根据URL参数决定使用哪个应用
    const shouldUseSimple = window.location.search.includes('simple=true');
    
    root.render(
      <StrictMode>
        <ErrorBoundary>
          {shouldUseSimple ? <SimpleTestApp /> :
           window.location.search.includes('test=true') ? <TestApp /> : 
           window.location.search.includes('service=true') ? <ServiceTestApp /> : 
           window.location.search.includes('minimal=true') ? <MinimalApp /> : <App />}
        </ErrorBoundary>
      </StrictMode>
    );
    console.log("App rendered successfully");
  } catch (error) {
    console.error("Error creating or rendering app:", error);
    
    // Fallback to basic HTML
    rootElement.innerHTML = `
      <div style="color: white; padding: 40px; background: #0a1628; min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: Arial, sans-serif;">
        <div style="text-align: center; max-width: 600px;">
          <h1 style="color: #ff6b6b; font-size: 2.5rem; margin-bottom: 2rem;">⚠️ 应用加载失败</h1>
          <div style="background: rgba(255, 107, 107, 0.1); border: 2px solid #ff6b6b; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
            <h2 style="color: #ff6b6b; margin-bottom: 20px;">错误详情</h2>
            <p style="font-family: monospace; background: #1e1e1e; padding: 15px; border-radius: 8px; text-align: left;">
              ${String(error)}
            </p>
          </div>
          <div style="background: rgba(14, 165, 233, 0.1); border: 2px solid #0ea5e9; border-radius: 12px; padding: 20px;">
            <h3 style="color: #0ea5e9; margin-bottom: 15px;">解决方案</h3>
            <ol style="text-align: left; line-height: 1.6;">
              <li>刷新页面 (Ctrl+F5 或 Cmd+Shift+R)</li>
              <li>检查浏览器控制台错误信息</li>
              <li>尝试访问: <a href="/?simple=true" style="color: #10b981;">简单测试模式</a></li>
              <li>清除浏览器缓存</li>
            </ol>
          </div>
        </div>
      </div>`;
  }
} else {
  console.error("Root element not found!");
  document.body.innerHTML = `<div style="color: white; padding: 20px; background: #1e1e1e; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
    <div style="text-align: center;">
      <h1 style="color: #ff6b6b;">DOM 元素错误</h1>
      <p>无法找到 root 元素</p>
    </div>
  </div>`;
}
  