// Hand-written to match supabase/migrations/0001_schema.sql column-for-column.
// Once a live Supabase project exists, regenerate with
// `supabase gen types typescript --linked` and diff against this file —
// the two should match exactly. Shape (Tables/Views/Functions, each table's
// Row/Insert/Update/Relationships) follows @supabase/postgrest-js's
// GenericSchema/GenericTable so query results are actually type-checked
// against these Row types, instead of silently falling back to `any`.

type Empty = Record<string, never>;

export type Database = {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string;
          slug: string;
          name_th: string;
          emoji: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          slug: string;
          name_th: string;
          emoji: string;
          sort_order: number;
        };
        Update: Partial<Database["public"]["Tables"]["rooms"]["Insert"]>;
        Relationships: [];
      };
      work_types: {
        Row: {
          id: string;
          slug: string;
          name_th: string;
          emoji: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          slug: string;
          name_th: string;
          emoji: string;
          sort_order: number;
        };
        Update: Partial<Database["public"]["Tables"]["work_types"]["Insert"]>;
        Relationships: [];
      };
      weeks: {
        Row: {
          id: string;
          room_id: string;
          work_type_id: string;
          week_number: number;
          label: string;
          start_date: string | null;
          end_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          work_type_id: string;
          week_number: number;
          label: string;
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["weeks"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "weeks_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weeks_work_type_id_fkey";
            columns: ["work_type_id"];
            isOneToOne: false;
            referencedRelation: "work_types";
            referencedColumns: ["id"];
          }
        ];
      };
      photos: {
        Row: {
          id: string;
          week_id: string;
          storage_path: string;
          file_name: string;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          week_id: string;
          storage_path: string;
          file_name: string;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["photos"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "photos_week_id_fkey";
            columns: ["week_id"];
            isOneToOne: false;
            referencedRelation: "weeks";
            referencedColumns: ["id"];
          }
        ];
      };
      document_categories: {
        Row: {
          id: string;
          slug: string;
          name_th: string;
          emoji: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          slug: string;
          name_th: string;
          emoji: string;
          sort_order: number;
        };
        Update: Partial<Database["public"]["Tables"]["document_categories"]["Insert"]>;
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          category_id: string;
          storage_path: string;
          file_name: string;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          storage_path: string;
          file_name: string;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "documents_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "document_categories";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      role_requests: {
        Row: {
          id: string;
          requester_id: string;
          status: string;
          requested_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
        };
        Insert: {
          id?: string;
          requester_id: string;
          status?: string;
          requested_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["role_requests"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "role_requests_requester_id_fkey";
            columns: ["requester_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Empty;
    Functions: Empty;
  };
};
