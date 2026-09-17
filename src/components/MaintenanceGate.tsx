import React from 'react';

// Opening-hours gating lives in OperatingHoursGate, which already wraps the whole
// app in App.tsx. This stays a passthrough so there is only ever one gate.
export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
