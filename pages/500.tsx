import React from 'react';
import { ErrorPageLayout } from '../components/layout/ErrorPageLayout';
import { ServerCrash, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/router';

export default function Custom500() {
  const router = useRouter();

  return (
    <ErrorPageLayout
      title="Internal Server Error"
      statusCode="500"
      description="We're experiencing some technical difficulties. Please try again later."
      illustration={
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center">
          <ServerCrash className="w-12 h-12 text-red-500" />
        </div>
      }
      primaryAction={{ 
        label: 'Retry', 
        onClick: () => router.reload(),
        icon: <RefreshCw className="w-4 h-4 mr-2" />
      }}
      secondaryAction={{ label: 'Back Home', href: '/' }}
    />
  );
}
