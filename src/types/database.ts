export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string;
          email: string;
          plan_id: string;
          credits_total: number;
          credits_used: number;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          plan_id: string;
          credits_total?: number;
          credits_used?: number;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          email?: string;
          plan_id?: string;
          credits_total?: number;
          credits_used?: number;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          status?: string;
          created_at?: string;
        };
      };
      cases: {
        Row: {
          id: string;
          account_id: string;
          company_name: string;
          industry: string | null;
          description: string | null;
          status: string;
          credits_pool: number;
          credits_used: number;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          account_id: string;
          company_name: string;
          industry?: string | null;
          description?: string | null;
          status?: string;
          credits_pool?: number;
          credits_used?: number;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          account_id?: string;
          company_name?: string;
          industry?: string | null;
          description?: string | null;
          status?: string;
          credits_pool?: number;
          credits_used?: number;
          created_at?: string;
          completed_at?: string | null;
        };
      };
      case_users: {
        Row: {
          id: string;
          case_id: string;
          user_id: string;
          role: string;
          job_title: string | null;
          job_description_text: string | null;
          job_description_url: string | null;
          permissions_json: Json | null;
          activated_at: string | null;
          last_seen_at: string | null;
        };
        Insert: {
          id?: string;
          case_id: string;
          user_id: string;
          role: string;
          job_title?: string | null;
          job_description_text?: string | null;
          job_description_url?: string | null;
          permissions_json?: Json | null;
          activated_at?: string | null;
          last_seen_at?: string | null;
        };
        Update: {
          case_id?: string;
          user_id?: string;
          role?: string;
          job_title?: string | null;
          job_description_text?: string | null;
          job_description_url?: string | null;
          permissions_json?: Json | null;
          activated_at?: string | null;
          last_seen_at?: string | null;
        };
      };
    };
    Views: {
      [_: string]: {
        Row: any;
      };
    };
    Functions: {
      [_: string]: {
        Args: any;
        Returns: any;
      };
    };
  };
}
