/**
 * Maps an internal authorization/scope role to a client-facing display label.
 *
 * Authorization logic, JWTs, and RBAC must always use the raw role string
 * (e.g. "Executive Lite", "Project Manager Lite").
 * UI copy and onboarding screens use this presentation mapping.
 */
export function getClientRoleDisplayName(role?: string | null): string {
  if (!role) return 'Staff'

  switch (role) {
    case 'Executive Lite':
      return 'Executive'
    case 'Project Manager Lite':
      return 'Project Manager'
    case 'Warehouse Associate':
      return 'Warehouse Associate'
    default:
      return role
  }
}
