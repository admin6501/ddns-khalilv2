import React from 'react';

/**
 * Full-screen centered spinner used while auth state is loading.
 * Shared by ProtectedRoute / PublicRoute / AdminRoute in App.js.
 */
export default function RouteLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" data-testid="route-loader">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
