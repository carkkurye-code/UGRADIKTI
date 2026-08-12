import React from 'react';
import { CustomerAuthProvider, useCustomerAuth, UserRole, AuthState, CustomerAuthContextType } from './CustomerAuthContext';
import { PartnerAuthProvider, usePartnerAuth, PartnerAuthContextType, PartnerAuthState } from './PartnerAuthContext';
import { AssistantAuthProvider, useAssistantAuth, AssistantAuthContextType, AssistantAuthState } from './AssistantAuthContext';
import { AdminAuthProvider, useAdminAuth, AdminAuthContextType, AdminAuthState } from './AdminAuthContext';

// Export individual Contexts & Hooks
export { CustomerAuthProvider, useCustomerAuth } from './CustomerAuthContext';
export { PartnerAuthProvider, usePartnerAuth } from './PartnerAuthContext';
export { AssistantAuthProvider, useAssistantAuth } from './AssistantAuthContext';
export { AdminAuthProvider, useAdminAuth } from './AdminAuthContext';

export type { UserRole, AuthState, CustomerAuthContextType };
export type { PartnerAuthContextType, PartnerAuthState };
export type { AssistantAuthContextType, AssistantAuthState };
export type { AdminAuthContextType, AdminAuthState };

// Default backward-compatible useAuth points to CustomerAuthContext
export const useAuth = useCustomerAuth;

// Combined master AuthProvider that mounts all isolated Role Providers
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <CustomerAuthProvider>
      <PartnerAuthProvider>
        <AssistantAuthProvider>
          <AdminAuthProvider>
            {children}
          </AdminAuthProvider>
        </AssistantAuthProvider>
      </PartnerAuthProvider>
    </CustomerAuthProvider>
  );
};
