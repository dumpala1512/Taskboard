import React from 'react';
import { ErrorPageLayout } from '../components/layout/ErrorPageLayout';
import { Settings, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/router';

export default function Maintenance() {
  const router = useRouter();

  return (
    <ErrorPageLayout
      title="Maintenance Mode"
      statusCode="503"
      description="The application is currently undergoing scheduled maintenance. We'll be back shortly!"
      illustration={
        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center">
          <Settings className="w-12 h-12 text-blue-500 animate-[spin_3s_linear_infinite]" />
        </div>
      }
      primaryAction={{ 
        label: 'Refresh', 
        onClick: () => router.reload(),
        icon: <RefreshCw className="w-4 h-4 mr-2" />
      }}
    />
  );
}
