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
      photos: {
        Row: {
          id: string;
          room_id: string;
          work_type_id: string;
          date: string;
          storage_path: string;
          file_name: string;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          work_type_id: string;
          date: string;
          storage_path: string;
          file_name: string;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["photos"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "photos_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "photos_work_type_id_fkey";
            columns: ["work_type_id"];
            isOneToOne: false;
            referencedRelation: "work_types";
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
      document_groups: {
        Row: {
          id: string;
          category_id: string;
          name_th: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name_th: string;
          sort_order: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["document_groups"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "document_groups_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "document_categories";
            referencedColumns: ["id"];
          }
        ];
      };
      documents: {
        Row: {
          id: string;
          category_id: string;
          storage_path: string;
          file_name: string;
          group_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          storage_path: string;
          file_name: string;
          group_id?: string | null;
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
          },
          {
            foreignKeyName: "documents_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "document_groups";
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
      checklist_items: {
        Row: {
          id: string;
          text: string;
          status: string;
          detail: string | null;
          start_date: string | null;
          due_date: string | null;
          parent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          text: string;
          status?: string;
          detail?: string | null;
          start_date?: string | null;
          due_date?: string | null;
          parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["checklist_items"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "checklist_items_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "checklist_items";
            referencedColumns: ["id"];
          }
        ];
      };
      checklist_item_rooms: {
        Row: {
          checklist_item_id: string;
          room_id: string;
          status: string;
        };
        Insert: {
          checklist_item_id: string;
          room_id: string;
          status?: string;
        };
        Update: Partial<Database["public"]["Tables"]["checklist_item_rooms"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "checklist_item_rooms_checklist_item_id_fkey";
            columns: ["checklist_item_id"];
            isOneToOne: false;
            referencedRelation: "checklist_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checklist_item_rooms_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Empty;
    Functions: Empty;
  };
};
