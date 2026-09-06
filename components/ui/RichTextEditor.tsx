import dynamic from 'next/dynamic';

export const RichTextEditor = dynamic(
  () => import('../editor/RichTextEditor'),
  { 
    ssr: false, 
    loading: () => (
      <div className="border rounded-lg p-4 bg-gray-50 flex items-center justify-center min-h-[150px] animate-pulse">
        <span className="text-gray-400">Loading editor...</span>
      </div>
    ) 
  }
);
