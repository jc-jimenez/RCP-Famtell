import type { UserRole } from '@/types'

/**
 * Capacidades pequeñas y explícitas por rol de plataforma. Los 4 roles
 * (super_admin, consultant, director, collaborator) son fijos por diseño —
 * ver docs/PRD_RCPFAMTELL3PL.md sección 8. No se construye un catálogo de
 * roles/permisos editable en runtime.
 */
export type Capability =
  | 'manage_catalog'                 // CRUD del catálogo global de módulos/secciones/preguntas
  | 'manage_consultores'              // alta y gestión de cuentas de consultor
  | 'view_platform_metrics'           // métricas globales de la plataforma
  | 'manage_platform_credits'         // ver/ajustar créditos desde admin
  | 'send_manual_whatsapp'            // enviar WhatsApp manual desde un caso
  | 'create_share_links'              // crear enlaces del Portal del Cliente
  | 'access_collaborator_workspace'   // usar /mis-modulos

const ROLE_CAPABILITIES: Record<UserRole, Capability[]> = {
  super_admin: ['manage_catalog', 'manage_consultores', 'view_platform_metrics', 'manage_platform_credits'],
  consultant: ['send_manual_whatsapp', 'create_share_links'],
  director: [],
  collaborator: ['access_collaborator_workspace'],
}

export function hasCapability(role: UserRole | string | null | undefined, capability: Capability): boolean {
  if (!role) return false
  return ROLE_CAPABILITIES[role as UserRole]?.includes(capability) ?? false
}

/** Única fuente de verdad para identificar al Super Admin por email. */
export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return !!email && email === process.env.SUPER_ADMIN_EMAIL
}
