// ============================================================
// LA FAB API — TypeScript types for frontend consumption
// ============================================================

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "admin" | "client" | "supplier";
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface LoginResponse {
  ok: boolean;
  session: Session;
  user: User;
}

export interface Project {
  project_id: string;
  account_id: string;
  status: string;
  product_id: string;
  qty: number;
  spec: string | null;
  brief_analysis: Record<string, any> | null;
  brief_file_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  project_id: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  payment_type: "full" | "split";
  deposit_amount: number | null;
  balance_amount: number | null;
  payment_step: "pending" | "deposit_paid" | "fully_paid" | null;
  deposit_paid_at: string | null;
  paid_at: string | null;
  pdf_url: string;
  client_name: string;
  client_email: string;
  line_items: LineItem[];
  stripe_session_id: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

export interface Consultation {
  id: string;
  project_id: string;
  supplier_id: string;
  supplier_name: string;
  status: string;
  sent_at: string | null;
  replied_at: string | null;
  response: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, any> | null;
  created_at: string;
}

export interface Message {
  id: string;
  project_id: string;
  sender_id: string;
  content: string;
  attachments: string[] | null;
  created_at: string;
}

// ============================================================
// Planning — Shared milestones
// ============================================================

export type MilestoneStatus = "pending" | "accepted" | "refused" | "counter_proposed";

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  milestone_date: string;
  status: MilestoneStatus;
  proposed_by: string | null;
  counter_date: string | null;
  created_at: string;
  updated_at: string;
  messages: MilestoneMessage[];
}

export interface MilestoneMessage {
  id: string;
  milestone_id: string;
  author_id: string;
  author_role: string;
  content: string;
  created_at: string;
}

// ============================================================
// Generic wrappers
// ============================================================

export type ApiResponse<T> = { ok: boolean; error?: string } & T;

export interface PaginatedResponse<T> {
  ok: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
