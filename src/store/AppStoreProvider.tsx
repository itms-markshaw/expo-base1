/**
 * App Store Provider
 * Simple provider component for Zustand store compatibility
 */

import React from 'react';

interface AppStoreProviderProps {
  children: React.ReactNode;
}

export default function AppStoreProvider({ children }: AppStoreProviderProps) {
  return <>{children}</>;
}
