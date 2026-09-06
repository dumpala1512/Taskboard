import React from 'react';
import { ErrorPageLayout } from '../components/layout/ErrorPageLayout';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/router';

export default function Custom400() {
  const router = useRouter();

  return (
    <ErrorPageLayout
      title="Bad Request"
      statusCode="400"
      description="The server could not understand the request due to invalid syntax."
      illustration={
        <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center">
          <AlertCircle className="w-12 h-12 text-amber-500" />
        </div>
      }
      primaryAction={{ 
        label: 'Go Back', 
        onClick: () => router.back(),
        icon: <ArrowLeft className="w-4 h-4 mr-2" />
      }}
    />
  );
}
