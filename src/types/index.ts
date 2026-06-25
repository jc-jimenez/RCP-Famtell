// ─── Roles ────────────────────────────────────────────────────────────────────
export type UserRole = 'super_admin' | 'consultant' | 'director' | 'collaborator'

// ─── Planes ───────────────────────────────────────────────────────────────────
export type PlanType = 'starter' | 'consultant' | 'agency' | 'white_label'

// ─── Módulos ──────────────────────────────────────────────────────────────────
export type ModuleCode = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7'
export type PremiumModuleCode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
export type ModuleStatus = 'locked' | 'active' | 'completed'

// ─── Agenda Oculta ────────────────────────────────────────────────────────────
export type AgendaSignalType = 'blue' | 'yellow' | 'red'

export interface AgendaSignal {
  id: string
  case_id: string
  module_code: ModuleCode
  signal_type: AgendaSignalType
  signal_text: string
  detected_at: string
}

// ─── Permisos ─────────────────────────────────────────────────────────────────
export type InstrumentPermission = 'none' | 'view' | 'respond'
// Ejemplo: { "1.1": "respond", "2.1": "view", "6.1": "none" }
export type PermissionsMap = Record<string, InstrumentPermission>

// ─── Chat / Nova ──────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// ─── Módulos del caso ─────────────────────────────────────────────────────────
export interface CaseModule {
  id: string
  case_id: string
  module_code: ModuleCode | PremiumModuleCode
  status: ModuleStatus
  credits_used: number
  unlocked_at: string | null
  completed_at: string | null
  session_id: string | null
}

// ─── Sesión de chat ───────────────────────────────────────────────────────────
export interface Session {
  id: string
  case_id: string
  module_code: ModuleCode | PremiumModuleCode
  user_id: string
  messages: ChatMessage[]
  last_message_at: string | null
  completed: boolean
  created_at: string
}

// ─── Contactos (Módulo 3) ─────────────────────────────────────────────────────
export interface Contact {
  id: string
  case_id: string
  name: string
  company: string | null
  role: string | null
  email: string | null
  phone: string | null
  relationship_type: 'client' | 'prospect' | 'supplier' | 'partner' | 'other'
  notes: string | null
  created_at: string
}

// ─── CRM Ligero (Módulo 8.1) ──────────────────────────────────────────────────
export type PipelineStage =
  | 'pending'
  | 'contacted'
  | 'proposal_sent'
  | 'negotiating'
  | 'closed_won'
  | 'closed_lost'

export interface CRMContact extends Contact {
  stage: PipelineStage
  potential_value_monthly: number
  close_probability: 'high' | 'medium' | 'low'
  last_activity_at: string | null
  next_action: string | null
  next_action_date: string | null
}

// ─── Documentos (Módulo 4) ────────────────────────────────────────────────────
export type DocumentType =
  | 'financial_statement'
  | 'bank_statement'
  | 'tax_return'
  | 'job_description'
  | 'other'

export interface Document {
  id: string
  case_id: string
  uploaded_by: string
  document_type: DocumentType
  file_name: string
  file_url: string
  extracted_data: Record<string, unknown> | null
  processed_at: string | null
  created_at: string
}

// ─── Check-in Semanal (Módulo 8.5) ───────────────────────────────────────────
export interface CheckIn {
  id: string
  case_id: string
  user_id: string
  week_number: number
  contacts_made: number
  new_clients: boolean
  new_clients_detail: string | null
  obstacles: string | null
  warehouse_occupancy: number
  progress_score: number
  ai_analysis: string | null
  submitted_at: string
}

// ─── KPIs (Módulo 8.4) ────────────────────────────────────────────────────────
export interface KPIRecord {
  id: string
  case_id: string
  week: number
  revenue_actual: number
  revenue_target: number
  active_clients: number
  active_clients_target: number
  new_clients: number
  reactivated_clients: number
  warehouse_occupancy: number
  fiscal_warehouse_occupancy: number
  commercial_contacts: number
  proposals_sent: number
  close_rate: number
  overdue_recovered: number
  recorded_at: string
}

// ─── Brief ────────────────────────────────────────────────────────────────────
export type BriefType = 'diagnostic' | 'closing'

export interface Brief {
  id: string
  case_id: string
  brief_type: BriefType
  version: number
  content_json: Record<string, unknown>
  pdf_url: string | null
  word_url: string | null
  generated_at: string
  generated_by: string
}

// ─── Notas del consultor ──────────────────────────────────────────────────────
export interface ConsultantNote {
  id: string
  case_id: string
  account_id: string
  content: string
  updated_at: string
  created_at: string
}

// ─── Notificaciones ───────────────────────────────────────────────────────────
export type NotificationChannel = 'email' | 'whatsapp'
export type NotificationType =
  | 'invitation'
  | 'reminder_48h'
  | 'module_completed'
  | 'brief_ready'
  | 'checkin_reminder'

export interface Notification {
  id: string
  case_id: string
  user_id: string
  channel: NotificationChannel
  notification_type: NotificationType
  status: 'sent' | 'failed' | 'pending'
  sent_at: string | null
  created_at: string
}

// ─── Módulos Premium ──────────────────────────────────────────────────────────
export interface PremiumModule {
  id: string
  case_id: string
  module_code: PremiumModuleCode
  activated_by: string
  activated_at: string
  credits_cost: number
}

// ─── Intención estratégica ────────────────────────────────────────────────────
export type StrategicIntent = 'growth' | 'restructure' | 'exit' | 'mixed'

// ─── Contexto de tenant (sesión activa) ───────────────────────────────────────
export interface TenantContext {
  userId: string
  email: string
  role: UserRole
  caseId: string | null
  accountId: string | null
  jobTitle: string | null
  permissions: PermissionsMap | null
}
