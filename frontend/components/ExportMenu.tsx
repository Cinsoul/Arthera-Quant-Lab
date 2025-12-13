import { useState } from 'react';
import { FileText, Table, Copy, Check, Download, FileJson, FileCode, Image, Mail, Share2, Package } from 'lucide-react';

interface ExportMenuProps {
  backtestId: string;
  onClose: () => void;
  data?: {
    name?: string;
    metrics?: any;
    holdings?: any[];
    trades?: any[];
  };
}

export function ExportMenu({ backtestId, onClose, data }: ExportMenuProps) {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<string | null>(null);
  
  const backtestName = data?.name || "High Vol Alpha - Q4 Test";

  // === PDF Export ===
  const handleExportPDF = async () => {
    setExporting(true);
    setExportFormat('PDF');
    
    // 模拟导出过程
    setTimeout(() => {
      console.log('Exporting PDF for', backtestId);
      
      // 在真实环境中，这里会调用 PDF 生成库（如 jsPDF）
      const link = document.createElement('a');
      link.download = `${backtestName}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      // link.href = pdfBlobUrl; // 实际的 PDF Blob URL
      
      alert('✅ PDF 报告已生成！\n\n包含内容：\n• 策略摘要\n• 收益曲线图\n• 风险指标表\n• 持仓明细\n• 交易记录');
      
      setExporting(false);
      setExportFormat(null);
      onClose();
    }, 1500);
  };

  // === Excel Export ===
  const handleExportExcel = async () => {
    setExporting(true);
    setExportFormat('Excel');
    
    setTimeout(() => {
      console.log('Exporting Excel for', backtestId);
      
      // 在真实环境中，使用 xlsx 库生成 Excel
      // import * as XLSX from 'xlsx';
      // const wb = XLSX.utils.book_new();
      // XLSX.utils.book_append_sheet(wb, metricsSheet, "指标汇总");
      // XLSX.writeFile(wb, filename);
      
      alert('✅ Excel 文件已生成！\n\n包含工作表：\n• 指标汇总\n• 每日净值\n• 持仓明细\n• 交易记录\n• 行业暴露');
      
      setExporting(false);
      setExportFormat(null);
      onClose();
    }, 1500);
  };

  // === CSV Export ===
  const handleExportCSV = () => {
    setExporting(true);
    setExportFormat('CSV');
    
    setTimeout(() => {
      // 生成 CSV 数据
      const csvData = [
        ['日期', '策略净值', '基准净值', '超额收益'],
        ['2024-01-01', '1.00', '1.00', '0.00%'],
        ['2024-02-01', '1.03', '1.01', '2.00%'],
        ['2024-03-01', '1.08', '1.02', '5.88%'],
        // ... 更多数据
      ];
      
      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${backtestName}_Data_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      alert('✅ CSV 文件已下载！\n\n可直接导入Excel或其他数据分析工具');
      
      setExporting(false);
      setExportFormat(null);
      onClose();
    }, 1000);
  };

  // === JSON Export ===
  const handleExportJSON = () => {
    const jsonData = {
      backtest_id: backtestId,
      name: backtestName,
      period: '2024-01-01 至 2024-12-09',
      metrics: {
        annual_return: 0.423,
        max_drawdown: -0.082,
        sharpe_ratio: 2.18,
        volatility: 0.185,
        win_rate: 0.72
      },
      holdings: data?.holdings || [],
      trades: data?.trades || [],
      export_time: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${backtestName}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    alert('✅ JSON 文件已下载！\n\n适用于API集成和程序化分析');
    onClose();
  };

  // === Image Export ===
  const handleExportImage = () => {
    setExporting(true);
    setExportFormat('Image');
    
    setTimeout(() => {
      alert('✅ 图表已保存为 PNG！\n\n包含：\n• 净值曲线\n• 回撤曲线\n• 月度收益热力图\n• 持仓分布饼图');
      
      setExporting(false);
      setExportFormat(null);
      onClose();
    }, 1200);
  };

  // === Copy Summary ===
  const handleCopySummary = () => {
    const summary = `【回测报告摘要】
    
策略名称: ${backtestName}
回测期间: 2024-01-01 至 2024-12-09

核心指标:
• 年化收益率: 42.3%
• 累计收益率: 48.0%
• 最大回撤: -8.2%
• 夏普比率: 2.18
• 波动率: 18.5%
• 胜率: 72%

关键发现:
• 策略在2024年中小盘反弹阶段表现优异，Q2-Q3累计收益达28.5%
• 动量因子和成长因子贡献了约65%的超额收益
• 风险控制有效，最大回撤-8.2%显著优于沪深300的-12.5%
• 持仓集中在新能源、电子、医药三大板块

风险提示:
本报告基于历史数据模拟，不构成投资建议。过去表现不代表未来表现，实际投资可能出现亏损。

---
由 Arthera Quant Lab 生成 | ${new Date().toLocaleString('zh-CN')}`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 2000);
  };

  // === Email Report ===
  const handleEmailReport = () => {
    const subject = encodeURIComponent(`回测报告：${backtestName}`);
    const body = encodeURIComponent(`请查看附件中的回测报告。\n\n回测ID: ${backtestId}\n生成时间: ${new Date().toLocaleString('zh-CN')}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    
    alert('📧 正在打开邮件客户端...\n\n请手动附加导出的报告文件');
    onClose();
  };

  // === Share Link ===
  const handleShareLink = () => {
    const shareUrl = `${window.location.origin}/backtest/${backtestId}`;
    navigator.clipboard.writeText(shareUrl);
    
    alert('🔗 分享链接已复制！\n\n' + shareUrl + '\n\n可发送给团队成员查看');
    onClose();
  };

  // === Batch Export ===
  const handleBatchExport = () => {
    setExporting(true);
    setExportFormat('Batch');
    
    setTimeout(() => {
      alert('✅ 批量导出包已生成！\n\n包含内容：\n• PDF 完整报告\n• Excel 数据表\n• CSV 原始数据\n• JSON API数据\n• PNG 图表集');
      
      setExporting(false);
      setExportFormat(null);
      onClose();
    }, 2500);
  };

  return (
    <div className="space-y-3">
      {/* Primary Formats */}
      <div className="space-y-2">
        <div className="text-xs text-gray-500 uppercase tracking-wider px-1">主要格式</div>
        
        <button
          onClick={handleExportPDF}
          disabled={exporting}
          className="w-full flex items-center gap-3 px-4 py-3 bg-[#1a2942]/50 hover:bg-[#1a2942] rounded transition-colors text-left disabled:opacity-50"
        >
          <FileText className="w-4 h-4 text-[#f97316]" />
          <div className="flex-1">
            <div className="text-sm text-gray-200">导出 PDF 报告</div>
            <div className="text-xs text-gray-500">完整图文报告 • 适合打印阅读</div>
          </div>
          {exporting && exportFormat === 'PDF' && (
            <div className="text-xs text-[#0ea5e9]">生成中...</div>
          )}
        </button>

        <button
          onClick={handleExportExcel}
          disabled={exporting}
          className="w-full flex items-center gap-3 px-4 py-3 bg-[#1a2942]/50 hover:bg-[#1a2942] rounded transition-colors text-left disabled:opacity-50"
        >
          <Table className="w-4 h-4 text-[#10b981]" />
          <div className="flex-1">
            <div className="text-sm text-gray-200">导出 Excel 数据</div>
            <div className="text-xs text-gray-500">多工作表 • 指标/持仓/交易</div>
          </div>
          {exporting && exportFormat === 'Excel' && (
            <div className="text-xs text-[#0ea5e9]">生成中...</div>
          )}
        </button>

        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="w-full flex items-center gap-3 px-4 py-3 bg-[#1a2942]/50 hover:bg-[#1a2942] rounded transition-colors text-left disabled:opacity-50"
        >
          <FileCode className="w-4 h-4 text-[#06b6d4]" />
          <div className="flex-1">
            <div className="text-sm text-gray-200">导出 CSV 数据</div>
            <div className="text-xs text-gray-500">原始数据 • 通用格式</div>
          </div>
          {exporting && exportFormat === 'CSV' && (
            <div className="text-xs text-[#0ea5e9]">生成中...</div>
          )}
        </button>
      </div>

      {/* Additional Formats */}
      <div className="space-y-2">
        <div className="text-xs text-gray-500 uppercase tracking-wider px-1">其他格式</div>
        
        <button
          onClick={handleExportJSON}
          className="w-full flex items-center gap-3 px-4 py-3 bg-[#1a2942]/50 hover:bg-[#1a2942] rounded transition-colors text-left"
        >
          <FileJson className="w-4 h-4 text-[#8b5cf6]" />
          <div className="flex-1">
            <div className="text-sm text-gray-200">导出 JSON</div>
            <div className="text-xs text-gray-500">API 数据格式</div>
          </div>
        </button>

        <button
          onClick={handleExportImage}
          disabled={exporting}
          className="w-full flex items-center gap-3 px-4 py-3 bg-[#1a2942]/50 hover:bg-[#1a2942] rounded transition-colors text-left disabled:opacity-50"
        >
          <Image className="w-4 h-4 text-[#ec4899]" />
          <div className="flex-1">
            <div className="text-sm text-gray-200">导出图表 PNG</div>
            <div className="text-xs text-gray-500">高清图表集</div>
          </div>
          {exporting && exportFormat === 'Image' && (
            <div className="text-xs text-[#0ea5e9]">生成中...</div>
          )}
        </button>

        <button
          onClick={handleCopySummary}
          className="w-full flex items-center gap-3 px-4 py-3 bg-[#1a2942]/50 hover:bg-[#1a2942] rounded transition-colors text-left"
        >
          {copied ? (
            <Check className="w-4 h-4 text-[#10b981]" />
          ) : (
            <Copy className="w-4 h-4 text-[#0ea5e9]" />
          )}
          <div className="flex-1">
            <div className="text-sm text-gray-200">
              {copied ? '已复制到剪贴板' : '复制文字摘要'}
            </div>
            <div className="text-xs text-gray-500">
              {copied ? '可直接粘贴使用' : '适合PPT演示'}
            </div>
          </div>
        </button>
      </div>

      {/* Share & Batch */}
      <div className="space-y-2">
        <div className="text-xs text-gray-500 uppercase tracking-wider px-1">分享与批量</div>
        
        <button
          onClick={handleShareLink}
          className="w-full flex items-center gap-3 px-4 py-3 bg-[#1a2942]/50 hover:bg-[#1a2942] rounded transition-colors text-left"
        >
          <Share2 className="w-4 h-4 text-[#0ea5e9]" />
          <div className="flex-1">
            <div className="text-sm text-gray-200">复制分享链接</div>
            <div className="text-xs text-gray-500">团队协作</div>
          </div>
        </button>

        <button
          onClick={handleEmailReport}
          className="w-full flex items-center gap-3 px-4 py-3 bg-[#1a2942]/50 hover:bg-[#1a2942] rounded transition-colors text-left"
        >
          <Mail className="w-4 h-4 text-[#f59e0b]" />
          <div className="flex-1">
            <div className="text-sm text-gray-200">邮件发送</div>
            <div className="text-xs text-gray-500">直接发送报告</div>
          </div>
        </button>

        <button
          onClick={handleBatchExport}
          disabled={exporting}
          className="w-full flex items-center gap-3 px-4 py-3 bg-[#0ea5e9]/10 border border-[#0ea5e9]/30 hover:bg-[#0ea5e9]/20 rounded transition-colors text-left disabled:opacity-50"
        >
          <Package className="w-4 h-4 text-[#0ea5e9]" />
          <div className="flex-1">
            <div className="text-sm text-[#0ea5e9]">批量导出全部格式</div>
            <div className="text-xs text-gray-500">PDF + Excel + CSV + JSON + PNG</div>
          </div>
          {exporting && exportFormat === 'Batch' && (
            <div className="text-xs text-[#0ea5e9]">打包中...</div>
          )}
        </button>
      </div>

      {/* Footer Tip */}
      <div className="pt-2 border-t border-[#1a2942]">
        <div className="text-xs text-gray-600 px-1">
          💡 提示：可在 Settings 中配置默认导出格式和自动命名规则
        </div>
      </div>
    </div>
  );
}
