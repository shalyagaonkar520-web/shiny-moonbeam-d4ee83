import React from 'react';

export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
  // Time lock and maintenance restriction removed - store is always open
  return <>{children}</>;
}
