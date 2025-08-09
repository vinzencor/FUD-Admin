import { useCallback } from 'react';
import { logAuditEvent, AUDIT_ACTIONS, RESOURCE_TYPES } from '../services/auditLogService';

/**
 * Hook for logging audit events throughout the application
 */
export function useAuditLog() {
  const logEvent = useCallback(async (
    action: string,
    resourceType: string,
    details: any = {},
    resourceId?: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
  ) => {
    await logAuditEvent(action, resourceType, details, resourceId, severity);
  }, []);

  // Convenience methods for common actions
  const logUserAction = useCallback(async (action: string, userId: string, details: any = {}) => {
    await logEvent(action, RESOURCE_TYPES.USER, details, userId, 'medium');
  }, [logEvent]);

  const logAdminAction = useCallback(async (action: string, adminId: string, details: any = {}) => {
    await logEvent(action, RESOURCE_TYPES.ADMIN, details, adminId, 'high');
  }, [logEvent]);

  const logProductAction = useCallback(async (action: string, productId: string, details: any = {}) => {
    await logEvent(action, RESOURCE_TYPES.PRODUCT, details, productId, 'low');
  }, [logEvent]);

  const logOrderAction = useCallback(async (action: string, orderId: string, details: any = {}) => {
    await logEvent(action, RESOURCE_TYPES.ORDER, details, orderId, 'medium');
  }, [logEvent]);

  const logSecurityEvent = useCallback(async (action: string, details: any = {}) => {
    await logEvent(action, RESOURCE_TYPES.SECURITY, details, undefined, 'critical');
  }, [logEvent]);

  const logSystemEvent = useCallback(async (action: string, details: any = {}) => {
    await logEvent(action, RESOURCE_TYPES.SYSTEM, details, undefined, 'medium');
  }, [logEvent]);

  // Specific action loggers
  const logLogin = useCallback(async (userId: string, details: any = {}) => {
    await logUserAction(AUDIT_ACTIONS.USER_LOGIN, userId, {
      ...details,
      timestamp: new Date().toISOString()
    });
  }, [logUserAction]);

  const logLogout = useCallback(async (userId: string, details: any = {}) => {
    await logUserAction(AUDIT_ACTIONS.USER_LOGOUT, userId, {
      ...details,
      timestamp: new Date().toISOString()
    });
  }, [logUserAction]);

  const logUserCreated = useCallback(async (userId: string, userDetails: any = {}) => {
    await logUserAction(AUDIT_ACTIONS.USER_CREATED, userId, {
      user_name: userDetails.name,
      user_email: userDetails.email,
      user_role: userDetails.role,
      created_by: userDetails.created_by
    });
  }, [logUserAction]);

  const logUserUpdated = useCallback(async (userId: string, changes: any = {}) => {
    await logUserAction(AUDIT_ACTIONS.USER_UPDATED, userId, {
      changes,
      updated_fields: Object.keys(changes)
    });
  }, [logUserAction]);

  const logUserDeleted = useCallback(async (userId: string, userDetails: any = {}) => {
    await logUserAction(AUDIT_ACTIONS.USER_DELETED, userId, {
      user_name: userDetails.name,
      user_email: userDetails.email,
      deleted_by: userDetails.deleted_by,
      cascade_deleted: userDetails.cascade_deleted || []
    });
  }, [logUserAction]);

  const logRoleChanged = useCallback(async (userId: string, roleChange: any = {}) => {
    await logAdminAction(AUDIT_ACTIONS.USER_ROLE_CHANGED, userId, {
      old_role: roleChange.old_role,
      new_role: roleChange.new_role,
      changed_by: roleChange.changed_by
    });
  }, [logAdminAction]);

  const logAdminAssigned = useCallback(async (adminId: string, assignmentDetails: any = {}) => {
    await logAdminAction(AUDIT_ACTIONS.ADMIN_ASSIGNED, adminId, {
      assigned_location: assignmentDetails.location,
      assigned_by: assignmentDetails.assigned_by,
      permissions: assignmentDetails.permissions
    });
  }, [logAdminAction]);

  const logPasswordChanged = useCallback(async (userId: string, details: any = {}) => {
    await logUserAction(AUDIT_ACTIONS.PASSWORD_CHANGED, userId, {
      changed_by: details.changed_by,
      is_self_change: details.is_self_change,
      is_admin_reset: details.is_admin_reset
    });
  }, [logUserAction]);

  const logProductCreated = useCallback(async (productId: string, productDetails: any = {}) => {
    await logProductAction(AUDIT_ACTIONS.PRODUCT_CREATED, productId, {
      product_name: productDetails.name,
      seller_id: productDetails.seller_id,
      price: productDetails.price,
      category: productDetails.category
    });
  }, [logProductAction]);

  const logProductDeleted = useCallback(async (productId: string, productDetails: any = {}) => {
    await logProductAction(AUDIT_ACTIONS.PRODUCT_DELETED, productId, {
      product_name: productDetails.name,
      seller_id: productDetails.seller_id,
      deleted_by: productDetails.deleted_by
    });
  }, [logProductAction]);

  const logOrderCreated = useCallback(async (orderId: string, orderDetails: any = {}) => {
    await logOrderAction(AUDIT_ACTIONS.ORDER_CREATED, orderId, {
      buyer_id: orderDetails.buyer_id,
      seller_id: orderDetails.seller_id,
      product_id: orderDetails.product_id,
      amount: orderDetails.amount
    });
  }, [logOrderAction]);

  const logOrderStatusChanged = useCallback(async (orderId: string, statusChange: any = {}) => {
    await logOrderAction(AUDIT_ACTIONS.ORDER_UPDATED, orderId, {
      old_status: statusChange.old_status,
      new_status: statusChange.new_status,
      changed_by: statusChange.changed_by
    });
  }, [logOrderAction]);

  const logCoverImageUpdated = useCallback(async (imageId: string, details: any = {}) => {
    await logSystemEvent(AUDIT_ACTIONS.COVER_IMAGE_UPDATED, {
      image_id: imageId,
      image_name: details.name,
      updated_by: details.updated_by,
      previous_image: details.previous_image
    });
  }, [logSystemEvent]);

  const logDataExported = useCallback(async (exportDetails: any = {}) => {
    await logSystemEvent(AUDIT_ACTIONS.DATA_EXPORTED, {
      export_type: exportDetails.type,
      record_count: exportDetails.count,
      exported_by: exportDetails.exported_by,
      filters_applied: exportDetails.filters
    });
  }, [logSystemEvent]);

  const logUnauthorizedAccess = useCallback(async (details: any = {}) => {
    await logSecurityEvent(AUDIT_ACTIONS.UNAUTHORIZED_ACCESS, {
      attempted_resource: details.resource,
      attempted_action: details.action,
      user_id: details.user_id,
      ip_address: details.ip_address
    });
  }, [logSecurityEvent]);

  const logFailedLogin = useCallback(async (details: any = {}) => {
    await logSecurityEvent(AUDIT_ACTIONS.FAILED_LOGIN, {
      attempted_email: details.email,
      failure_reason: details.reason,
      ip_address: details.ip_address,
      attempt_count: details.attempt_count
    });
  }, [logSecurityEvent]);

  return {
    // Generic logging
    logEvent,
    
    // Category-specific logging
    logUserAction,
    logAdminAction,
    logProductAction,
    logOrderAction,
    logSecurityEvent,
    logSystemEvent,
    
    // Specific action loggers
    logLogin,
    logLogout,
    logUserCreated,
    logUserUpdated,
    logUserDeleted,
    logRoleChanged,
    logAdminAssigned,
    logPasswordChanged,
    logProductCreated,
    logProductDeleted,
    logOrderCreated,
    logOrderStatusChanged,
    logCoverImageUpdated,
    logDataExported,
    logUnauthorizedAccess,
    logFailedLogin
  };
}
