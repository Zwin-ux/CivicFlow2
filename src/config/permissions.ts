import { UserRole } from '../models/user';

/**
 * Define permissions for each resource and action
 */
export enum Resource {
  APPLICATION = 'application',
  DOCUMENT = 'document',
  USER = 'user',
  AUDIT_LOG = 'audit_log',
  REPORT = 'report',
  PROGRAM_RULE = 'program_rule',
}

export enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  REVIEW = 'review',
  EXPORT = 'export',
}

/**
 * Permission matrix defining which roles can perform which actions on which resources
 */
type PermissionMatrix = {
  [key in Resource]: {
    [key in Action]?: UserRole[];
  };
};

export const permissions: PermissionMatrix = {
  [Resource.APPLICATION]: {
    [Action.CREATE]: ['Applicant', 'Reviewer', 'Approver', 'Administrator'],
    [Action.READ]: ['Applicant', 'Reviewer', 'Approver', 'Administrator', 'Auditor'],
    [Action.UPDATE]: ['Applicant', 'Reviewer', 'Approver', 'Administrator'],
    [Action.DELETE]: ['Administrator'],
    [Action.REVIEW]: ['Reviewer', 'Approver', 'Administrator'],
    [Action.APPROVE]: ['Approver', 'Administrator'],
  },
  [Resource.DOCUMENT]: {
    [Action.CREATE]: ['Applicant', 'Reviewer', 'Approver', 'Administrator'],
    [Action.READ]: ['Applicant', 'Reviewer', 'Approver', 'Administrator', 'Auditor'],
    [Action.UPDATE]: ['Applicant', 'Reviewer', 'Approver', 'Administrator'],
    [Action.DELETE]: ['Applicant', 'Administrator'],
  },
  [Resource.USER]: {
    [Action.CREATE]: ['Administrator'],
    [Action.READ]: ['Administrator', 'Auditor'],
    [Action.UPDATE]: ['Administrator'],
    [Action.DELETE]: ['Administrator'],
  },
  [Resource.AUDIT_LOG]: {
    [Action.READ]: ['Auditor', 'Administrator'],
    [Action.EXPORT]: ['Auditor', 'Administrator'],
  },
  [Resource.REPORT]: {
    [Action.READ]: ['Reviewer', 'Approver', 'Administrator', 'Auditor'],
    [Action.CREATE]: ['Reviewer', 'Approver', 'Administrator', 'Auditor'],
    [Action.EXPORT]: ['Reviewer', 'Approver', 'Administrator', 'Auditor'],
  },
  [Resource.PROGRAM_RULE]: {
    [Action.CREATE]: ['Administrator'],
    [Action.READ]: ['Reviewer', 'Approver', 'Administrator', 'Auditor'],
    [Action.UPDATE]: ['Administrator'],
    [Action.DELETE]: ['Administrator'],
  },
};

/**
 * Check if a role has permission to perform an action on a resource
 */
export const hasPermission = (
  role: UserRole,
  resource: Resource,
  action: Action
): boolean => {
  const resourcePermissions = permissions[resource];
  if (!resourcePermissions) {
    return false;
  }

  const allowedRoles = resourcePermissions[action];
  if (!allowedRoles) {
    return false;
  }

  return allowedRoles.includes(role);
};

/**
 * Get all permissions for a specific role
 */
export const getRolePermissions = (role: UserRole): Array<{ resource: Resource; action: Action }> => {
  const rolePermissions: Array<{ resource: Resource; action: Action }> = [];

  Object.entries(permissions).forEach(([resource, actions]) => {
    Object.entries(actions).forEach(([action, roles]) => {
      if (roles.includes(role)) {
        rolePermissions.push({
          resource: resource as Resource,
          action: action as Action,
        });
      }
    });
  });

  return rolePermissions;
};

/**
 * Role hierarchy for inheritance (higher roles inherit permissions from lower roles)
 */
export const roleHierarchy: Record<UserRole, number> = {
  Applicant: 1,
  Reviewer: 2,
  Auditor: 2,
  Approver: 3,
  Administrator: 4,
};

/**
 * Check if a role is higher or equal in hierarchy
 */
export const isRoleHigherOrEqual = (role: UserRole, comparedTo: UserRole): boolean => {
  return roleHierarchy[role] >= roleHierarchy[comparedTo];
};
