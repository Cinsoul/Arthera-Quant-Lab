/**
 * ReportExportService - 报告导出服务
 * 
 * 功能：
 * - PDF报告生成和导出
 * - Excel表格导出
 * - CSV数据导出
 * - JSON数据导出
 * - 报告模板管理
 * - 云存储上传
 * - 分享链接生成
 * - 自动化报告调度
 */

import { BacktestResult } from './StrategyExecutionService';
import { Portfolio, AdvancedRiskMetrics } from './PortfolioManagementService';
import { RiskMetrics } from './RiskAnalysisService';
import { OHLCV } from './HistoricalDataService';
import { getCacheManager } from './CacheManager';

// ============================================================================
// Types
// ============================================================================

export interface ReportConfig {
  title: string;
  subtitle?: string;
  author?: string;
  template: ReportTemplate;
  sections: ReportSection[];
  format: ExportFormat[];
  branding?: ReportBranding;
  metadata?: ReportMetadata;
}

export interface ReportTemplate {
  id: string;
  name: string;
  type: 'backtest' | 'portfolio' | 'risk' | 'comprehensive' | 'custom';
  layout: 'standard' | 'executive' | 'detailed' | 'presentation';
  theme: 'bloomberg' | 'professional' | 'minimal' | 'colorful';
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'summary' | 'performance' | 'risk' | 'holdings' | 'charts' | 'methodology' | 'disclaimer';
  content: any;
  pageBreak?: boolean;
  order: number;
}

export interface ReportBranding {
  logo?: string;
  companyName?: string;
  colors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
  font?: string;
}

export interface ReportMetadata {
  reportId: string;
  createdAt: Date;
  createdBy: string;
  version: string;
  tags: string[];
  classification: 'internal' | 'confidential' | 'public';
}

export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json' | 'html' | 'png';

export interface ExportOptions {
  format: ExportFormat;
  quality?: 'draft' | 'standard' | 'high' | 'print';
  compression?: boolean;
  password?: string;
  watermark?: string;
  includeCharts?: boolean;
  includeData?: boolean;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  fileSize?: number;
  downloadUrl?: string;
  shareUrl?: string;
  error?: string;
  metadata?: {
    format: ExportFormat;
    pages?: number;
    generationTime: number;
    fileHash?: string;
  };
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  preview: string;
  sections: string[];
  customizable: boolean;
}

export interface ScheduledReport {
  id: string;
  name: string;
  reportConfig: ReportConfig;
  schedule: ReportSchedule;
  recipients: string[];
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export interface ReportSchedule {
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom';
  frequency: number;
  time: string; // HH:MM format
  timezone: string;
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  daysOfMonth?: number[]; // 1-31
}

// ============================================================================
// Report Export Service
// ============================================================================

export class ReportExportService {
  private cache = getCacheManager();
  private templates: Map<string, ReportTemplate> = new Map();
  private scheduledReports: Map<string, ScheduledReport> = new Map();
  private listeners: Record<string, Set<(payload: any) => void>> = {};
  private initialized = false;

  constructor() {
    this.initializeDefaultTemplates();
    void this.initialize();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await this.loadScheduledReports();
    this.initialized = true;
  }

  /**
   * 生成并导出报告
   */
  async generateReport(
    data: any,
    config: ReportConfig,
    options: ExportOptions
  ): Promise<ExportResult> {
    const startTime = Date.now();
    
    try {
      // 1. 验证数据和配置
      this.validateReportConfig(config);
      
      // 2. 根据格式调用相应的生成器
      let result: ExportResult;
      
      switch (options.format) {
        case 'pdf':
          result = await this.generatePDFReport(data, config, options);
          break;
        case 'excel':
          result = await this.generateExcelReport(data, config, options);
          break;
        case 'csv':
          result = await this.generateCSVReport(data, config, options);
          break;
        case 'json':
          result = await this.generateJSONReport(data, config, options);
          break;
        case 'html':
          result = await this.generateHTMLReport(data, config, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
      
      // 3. 添加元数据
      const generationTime = Date.now() - startTime;
      result.metadata = {
        ...result.metadata,
        format: options.format,
        generationTime
      };
      
      // 4. 缓存报告信息
      await this.cacheReportInfo(config, result);

      this.emitEvent('reportGenerated', { config, result });
      
      console.log(`[ReportExport] Report generated successfully in ${generationTime}ms`);
      return result;
      
    } catch (error) {
      console.error('[ReportExport] Report generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  addEventListener(event: string, handler: (payload: any) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event]!.add(handler);
    return () => this.listeners[event]?.delete(handler);
  }

  private emitEvent(event: string, payload: any) {
    this.listeners[event]?.forEach(listener => {
      try {
        listener(payload);
      } catch (error) {
        console.warn('[ReportExport] Listener error:', error);
      }
    });
  }

  /**
   * 生成PDF报告
   */
  private async generatePDFReport(
    data: any,
    config: ReportConfig,
    options: ExportOptions
  ): Promise<ExportResult> {
    // 模拟PDF生成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const fileName = `${config.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    const filePath = `/downloads/${fileName}`;
    
    return {
      success: true,
      filePath,
      fileSize: Math.floor(Math.random() * 5000000) + 1000000, // 1-5MB
      downloadUrl: `/api/download/${fileName}`,
      metadata: {
        format: 'pdf',
        pages: Math.floor(Math.random() * 50) + 10,
        generationTime: 0
      }
    };
  }

  /**
   * 生成Excel报告
   */
  private async generateExcelReport(
    data: any,
    config: ReportConfig,
    options: ExportOptions
  ): Promise<ExportResult> {
    // 模拟Excel生成
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const fileName = `${config.title.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
    const filePath = `/downloads/${fileName}`;
    
    return {
      success: true,
      filePath,
      fileSize: Math.floor(Math.random() * 3000000) + 500000, // 0.5-3MB
      downloadUrl: `/api/download/${fileName}`,
      metadata: {
        format: 'excel',
        generationTime: 0
      }
    };
  }

  /**
   * 生成CSV报告
   */
  private async generateCSVReport(
    data: any,
    config: ReportConfig,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      let csvContent = '';
      
      // 根据数据类型生成CSV
      if (Array.isArray(data)) {
        if (data.length > 0 && typeof data[0] === 'object') {
          // 对象数组转CSV
          const headers = Object.keys(data[0]);
          csvContent = headers.join(',') + '\n';
          csvContent += data.map(row => 
            headers.map(header => 
              JSON.stringify(row[header] || '')
            ).join(',')
          ).join('\n');
        }
      }
      
      const fileName = `${config.title.replace(/\s+/g, '_')}_${Date.now()}.csv`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // 创建下载链接
      const url = URL.createObjectURL(blob);
      
      return {
        success: true,
        filePath: fileName,
        fileSize: blob.size,
        downloadUrl: url,
        metadata: {
          format: 'csv',
          generationTime: 0
        }
      };
    } catch (error) {
      throw new Error(`CSV generation failed: ${error}`);
    }
  }

  /**
   * 生成JSON报告
   */
  private async generateJSONReport(
    data: any,
    config: ReportConfig,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const reportData = {
        metadata: config.metadata || {},
        config: {
          title: config.title,
          subtitle: config.subtitle,
          template: config.template,
          generatedAt: new Date().toISOString()
        },
        data: data,
        sections: config.sections
      };
      
      const jsonContent = JSON.stringify(reportData, null, 2);
      const fileName = `${config.title.replace(/\s+/g, '_')}_${Date.now()}.json`;
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      
      const url = URL.createObjectURL(blob);
      
      return {
        success: true,
        filePath: fileName,
        fileSize: blob.size,
        downloadUrl: url,
        metadata: {
          format: 'json',
          generationTime: 0
        }
      };
    } catch (error) {
      throw new Error(`JSON generation failed: ${error}`);
    }
  }

  /**
   * 生成HTML报告
   */
  private async generateHTMLReport(
    data: any,
    config: ReportConfig,
    options: ExportOptions
  ): Promise<ExportResult> {
    const htmlContent = this.generateHTMLContent(data, config);
    const fileName = `${config.title.replace(/\s+/g, '_')}_${Date.now()}.html`;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    
    const url = URL.createObjectURL(blob);
    
    return {
      success: true,
      filePath: fileName,
      fileSize: blob.size,
      downloadUrl: url,
      metadata: {
        format: 'html',
        generationTime: 0
      }
    };
  }

  /**
   * 生成HTML内容
   */
  private generateHTMLContent(data: any, config: ReportConfig): string {
    const css = `
      <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 40px; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #0ea5e9; padding-bottom: 20px; margin-bottom: 30px; }
        .title { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
        .subtitle { font-size: 18px; color: #666; }
        .section { margin: 30px 0; }
        .section-title { font-size: 20px; font-weight: bold; color: #0ea5e9; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; }
        .metric-label { font-weight: bold; color: #666; }
        .metric-value { font-size: 18px; color: #0ea5e9; }
        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; }
      </style>
    `;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${config.title}</title>
        ${css}
      </head>
      <body>
        <div class="header">
          <div class="title">${config.title}</div>
          ${config.subtitle ? `<div class="subtitle">${config.subtitle}</div>` : ''}
        </div>
        
        ${config.sections.map(section => `
          <div class="section">
            <div class="section-title">${section.title}</div>
            <div class="section-content">
              ${this.renderSectionContent(section)}
            </div>
          </div>
        `).join('')}
        
        <div class="footer">
          Generated by Arthera Quant Lab on ${new Date().toLocaleString('zh-CN')}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 渲染章节内容
   */
  private renderSectionContent(section: ReportSection): string {
    switch (section.type) {
      case 'summary':
        return this.renderSummarySection(section.content);
      case 'performance':
        return this.renderPerformanceSection(section.content);
      default:
        return '<div>Section content not implemented</div>';
    }
  }

  /**
   * 渲染摘要章节
   */
  private renderSummarySection(content: any): string {
    return `
      <div class="metric">
        <div class="metric-label">策略名称</div>
        <div class="metric-value">${content.strategyName || 'N/A'}</div>
      </div>
      <div class="metric">
        <div class="metric-label">年化收益</div>
        <div class="metric-value">${content.annualReturn || 'N/A'}</div>
      </div>
      <div class="metric">
        <div class="metric-label">最大回撤</div>
        <div class="metric-value">${content.maxDrawdown || 'N/A'}</div>
      </div>
      <div class="metric">
        <div class="metric-label">夏普比率</div>
        <div class="metric-value">${content.sharpeRatio || 'N/A'}</div>
      </div>
    `;
  }

  /**
   * 渲染表现章节
   */
  private renderPerformanceSection(content: any): string {
    if (Array.isArray(content) && content.length > 0) {
      const headers = Object.keys(content[0]);
      return `
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${content.map(row => `
              <tr>${headers.map(h => `<td>${row[h]}</td>`).join('')}</tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
    return '<div>No performance data available</div>';
  }

  /**
   * 下载文件
   */
  downloadFile(url: string, filename: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 清理URL对象
    if (url.startsWith('blob:')) {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  /**
   * 获取可用模板
   */
  getAvailableTemplates(): ReportTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * 获取模板
   */
  getTemplate(templateId: string): ReportTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * 添加自定义模板
   */
  addCustomTemplate(template: ReportTemplate): void {
    this.templates.set(template.id, template);
    this.cache.set('reports', `template-${template.id}`, template);
  }

  /**
   * 创建分享链接
   */
  async createShareLink(reportId: string, options: {
    expiresIn?: number; // hours
    password?: string;
    allowDownload?: boolean;
  } = {}): Promise<string> {
    // 模拟创建分享链接
    const shareId = Math.random().toString(36).substr(2, 9);
    const shareUrl = `${window.location.origin}/share/${shareId}`;
    
    // 缓存分享信息
    await this.cache.set('reports', `share-${shareId}`, {
      reportId,
      createdAt: Date.now(),
      expiresAt: options.expiresIn ? Date.now() + (options.expiresIn * 3600000) : null,
      options
    });
    
    return shareUrl;
  }

  /**
   * 调度报告生成
   */
  scheduleReport(schedule: ScheduledReport): string {
    const scheduleId = Math.random().toString(36).substr(2, 9);
    schedule.id = scheduleId;
    this.scheduledReports.set(scheduleId, schedule);
    
    // 保存到缓存
    this.cache.set('reports', `scheduled-${scheduleId}`, schedule);
    
    console.log(`[ReportExport] Scheduled report created: ${schedule.name}`);
    return scheduleId;
  }

  /**
   * 获取调度报告列表
   */
  getScheduledReports(): ScheduledReport[] {
    return Array.from(this.scheduledReports.values());
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * 初始化默认模板
   */
  private initializeDefaultTemplates(): void {
    const defaultTemplates: ReportTemplate[] = [
      {
        id: 'backtest-standard',
        name: '标准回测报告',
        type: 'backtest',
        layout: 'standard',
        theme: 'bloomberg'
      },
      {
        id: 'portfolio-executive',
        name: '组合执行摘要',
        type: 'portfolio',
        layout: 'executive',
        theme: 'professional'
      },
      {
        id: 'risk-detailed',
        name: '详细风险分析',
        type: 'risk',
        layout: 'detailed',
        theme: 'minimal'
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * 加载调度报告
   */
  private async loadScheduledReports(): Promise<void> {
    try {
      // 从缓存加载调度报告
      const keys = await this.cache.keys('reports', 'scheduled-');
      for (const key of keys) {
        const report = await this.cache.get('reports', key);
        if (report) {
          this.scheduledReports.set(report.id, report);
        }
      }
    } catch (error) {
      console.warn('[ReportExport] Failed to load scheduled reports:', error);
    }
  }

  /**
   * 验证报告配置
   */
  private validateReportConfig(config: ReportConfig): void {
    if (!config.title) {
      throw new Error('Report title is required');
    }
    if (!config.template) {
      throw new Error('Report template is required');
    }
    if (!config.sections || config.sections.length === 0) {
      throw new Error('Report must have at least one section');
    }
  }

  /**
   * 缓存报告信息
   */
  private async cacheReportInfo(config: ReportConfig, result: ExportResult): Promise<void> {
    try {
      const reportInfo = {
        title: config.title,
        subtitle: config.subtitle,
        template: config.template,
        generatedAt: new Date(),
        result: {
          success: result.success,
          filePath: result.filePath,
          fileSize: result.fileSize,
          format: result.metadata?.format
        }
      };
      
      await this.cache.set('reports', `report-${Date.now()}`, reportInfo);
    } catch (error) {
      console.warn('[ReportExport] Failed to cache report info:', error);
    }
  }
}

// ============================================================================
// Service Instance
// ============================================================================

let reportExportService: ReportExportService | null = null;

/**
 * 获取报告导出服务实例
 */
export function getReportExportService(): ReportExportService {
  if (!reportExportService) {
    reportExportService = new ReportExportService();
  }
  return reportExportService;
}

export default ReportExportService;
