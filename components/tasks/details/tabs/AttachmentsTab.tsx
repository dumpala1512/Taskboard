import React, { useState } from 'react';
import { Paperclip, Download, Trash2, File, FileText, Image as ImageIcon, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const MOCK_ATTACHMENTS: any[] = [];

export function AttachmentsTab() {
  const [isDragging, setIsDragging] = useState(false);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-8 h-8 text-red-500" />;
      case 'image': return <ImageIcon className="w-8 h-8 text-blue-500" />;
      case 'code': return <File className="w-8 h-8 text-yellow-500" />;
      default: return <File className="w-8 h-8 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-lg font-semibold text-gray-900">
          <Paperclip className="w-5 h-5 text-gray-500" />
          <h3>Attachments</h3>
        </div>
        <Button size="sm" variant="outline">
          <UploadCloud className="w-4 h-4 mr-2" />
          Upload File
        </Button>
      </div>

      {/* Upload Dropzone */}
      <div 
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}
        `}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); }}
      >
        <UploadCloud className={`mx-auto h-12 w-12 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">Drag and drop files here</h3>
        <p className="mt-1 text-xs text-gray-500">PDF, DOCX, PNG, JPG up to 10MB</p>
        <div className="mt-4">
          <Button type="button" variant="outline" size="sm">
            Browse files
          </Button>
        </div>
      </div>

      {/* Attachments List */}
      {MOCK_ATTACHMENTS.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-500">
          No attachments added yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOCK_ATTACHMENTS.map((file) => (
            <div key={file.id} className="border border-gray-200 rounded-lg p-4 flex flex-col hover:border-gray-300 hover:shadow-sm transition-all group bg-white">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-gray-50 rounded-lg">
                  {getFileIcon(file.type)}
                </div>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md">
                    <Download className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                  {file.name}
                </p>
                <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                  <span>{file.size}</span>
                  <span>{file.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
