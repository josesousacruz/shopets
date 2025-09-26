import React from 'react';
import { FileText, Download, Eye, Image } from 'lucide-react';

interface InvoiceFileViewerProps {
  invoiceFile?: File | string;
  className?: string;
  showLabel?: boolean;
}

export const InvoiceFileViewer: React.FC<InvoiceFileViewerProps> = ({
  invoiceFile,
  className = '',
  showLabel = true
}) => {
  if (!invoiceFile) {
    return null;
  }

  const getFileIcon = (file: File | string) => {
    const fileName = typeof file === 'string' ? file : file.name;
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-600" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <Image className="w-4 h-4 text-blue-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getFileName = (file: File | string) => {
    return typeof file === 'string' ? file : file.name;
  };

  const handleView = () => {
    if (typeof invoiceFile === 'string') {
      // Para arquivos já salvos (string), abrir em nova aba
      window.open(invoiceFile, '_blank');
    } else {
      // Para arquivos File, criar URL temporária
      const url = URL.createObjectURL(invoiceFile);
      window.open(url, '_blank');
      // Limpar URL após um tempo para evitar vazamentos de memória
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };

  const handleDownload = () => {
    if (typeof invoiceFile === 'string') {
      // Para arquivos já salvos (string), criar link de download
      const link = document.createElement('a');
      link.href = invoiceFile;
      link.download = invoiceFile.split('/').pop() || 'nota-fiscal';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Para arquivos File, criar URL temporária para download
      const url = URL.createObjectURL(invoiceFile);
      const link = document.createElement('a');
      link.href = url;
      link.download = invoiceFile.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span className="text-sm text-gray-600">NF:</span>
      )}
      
      <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-md border">
        {getFileIcon(invoiceFile)}
        <span className="text-sm text-gray-700 max-w-32 truncate">
          {getFileName(invoiceFile)}
        </span>
      </div>

      <div className="flex gap-1">
        <button
          onClick={handleView}
          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
          title="Visualizar arquivo"
        >
          <Eye className="w-4 h-4" />
        </button>
        
        <button
          onClick={handleDownload}
          className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
          title="Baixar arquivo"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default InvoiceFileViewer;