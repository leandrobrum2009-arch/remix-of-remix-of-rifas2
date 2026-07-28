import { supabase } from "@/integrations/supabase/client";

export type AuditEvent = 
  | 'login' 
  | 'logout' 
  | 'admin_access' 
  | 'unauthorized_attempt' 
  | 'sensitive_action'
  | 'password_change'
  | 'session_refresh';

export interface AuditLogParams {
  event: AuditEvent;
  resource?: string;
  status: 'success' | 'failure';
  details?: Record<string, any>;
  userId?: string;
}

export const logAuthEvent = async ({ event, resource, status, details = {}, userId }: AuditLogParams) => {
  try {
    const userAgent = navigator.userAgent;
    
    // In a real app, we might get the IP from an edge function, 
    // but for client-side logging we omit it or use a public API if essential.
    
    const { error } = await supabase.from('auth_audit_logs').insert({
      user_id: userId,
      event,
      resource,
      status,
      details,
      user_agent: userAgent,
    });

    if (error) {
      console.error('Failed to save audit log:', error);
    }
  } catch (err) {
    console.error('Error in logAuthEvent:', err);
  }
};
