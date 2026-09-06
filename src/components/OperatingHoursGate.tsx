import React from 'react';

export default function OperatingHoursGate({ children }: { children: React.ReactNode }) {
  // Time restriction removed - always render children
  return <>{children}</>;
}
