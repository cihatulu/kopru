export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      announcement_reads: {
        Row: {
          announcement_id: string
          read_at: string
          retailer_org_id: string
        }
        Insert: {
          announcement_id: string
          read_at?: string
          retailer_org_id: string
        }
        Update: {
          announcement_id?: string
          read_at?: string
          retailer_org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reads_retailer_org_id_fkey"
            columns: ["retailer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body: string
          created_at: string
          id: string
          is_active: boolean
          owner_kind: Database["public"]["Enums"]["org_kind"] | null
          owner_org_id: string
          target_retailer_org_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_active?: boolean
          owner_kind?: Database["public"]["Enums"]["org_kind"] | null
          owner_org_id: string
          target_retailer_org_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          owner_kind?: Database["public"]["Enums"]["org_kind"] | null
          owner_org_id?: string
          target_retailer_org_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_owner_org_id_owner_kind_fkey"
            columns: ["owner_org_id", "owner_kind"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id", "kind"]
          },
          {
            foreignKeyName: "announcements_target_retailer_org_id_fkey"
            columns: ["target_retailer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_entries: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          description: string
          id: string
          kind: Database["public"]["Enums"]["finance_kind"]
          method: Database["public"]["Enums"]["payment_method"]
          occurred_on: string
          retailer_kind: Database["public"]["Enums"]["org_kind"] | null
          retailer_org_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          description: string
          id?: string
          kind: Database["public"]["Enums"]["finance_kind"]
          method?: Database["public"]["Enums"]["payment_method"]
          occurred_on?: string
          retailer_kind?: Database["public"]["Enums"]["org_kind"] | null
          retailer_org_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          kind?: Database["public"]["Enums"]["finance_kind"]
          method?: Database["public"]["Enums"]["payment_method"]
          occurred_on?: string
          retailer_kind?: Database["public"]["Enums"]["org_kind"] | null
          retailer_org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_entries_retailer_org_id_retailer_kind_fkey"
            columns: ["retailer_org_id", "retailer_kind"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id", "kind"]
          },
        ]
      }
      invitations: {
        Row: {
          authorized_name: string | null
          company_name: string | null
          created_at: string
          created_by_user_id: string | null
          discount_rate: number
          email: string | null
          expires_at: string
          id: string
          inviter_org_id: string
          phone: string | null
          revoked_at: string | null
          token: string
          used_at: string | null
          used_by_org_id: string | null
          vkn_tc: string | null
        }
        Insert: {
          authorized_name?: string | null
          company_name?: string | null
          created_at?: string
          created_by_user_id?: string | null
          discount_rate?: number
          email?: string | null
          expires_at: string
          id?: string
          inviter_org_id: string
          phone?: string | null
          revoked_at?: string | null
          token: string
          used_at?: string | null
          used_by_org_id?: string | null
          vkn_tc?: string | null
        }
        Update: {
          authorized_name?: string | null
          company_name?: string | null
          created_at?: string
          created_by_user_id?: string | null
          discount_rate?: number
          email?: string | null
          expires_at?: string
          id?: string
          inviter_org_id?: string
          phone?: string | null
          revoked_at?: string | null
          token?: string
          used_at?: string | null
          used_by_org_id?: string | null
          vkn_tc?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_inviter_org_id_fkey"
            columns: ["inviter_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_used_by_org_id_fkey"
            columns: ["used_by_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          city: string | null
          company_name: string
          created_at: string
          email: string | null
          id: string
          kind: Database["public"]["Enums"]["org_kind"] | null
          last_contacted_at: string | null
          matched_org_id: string | null
          note: string | null
          phone: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          vkn_tc: string | null
          website: string | null
        }
        Insert: {
          city?: string | null
          company_name: string
          created_at?: string
          email?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["org_kind"] | null
          last_contacted_at?: string | null
          matched_org_id?: string | null
          note?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          vkn_tc?: string | null
          website?: string | null
        }
        Update: {
          city?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["org_kind"] | null
          last_contacted_at?: string | null
          matched_org_id?: string | null
          note?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          vkn_tc?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_matched_org_id_fkey"
            columns: ["matched_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      login_audit: {
        Row: {
          created_at: string
          id: string
          ip: unknown
          portal: Database["public"]["Enums"]["org_kind"] | null
          reason: string | null
          succeeded: boolean
          user_code: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip?: unknown
          portal?: Database["public"]["Enums"]["org_kind"] | null
          reason?: string | null
          succeeded: boolean
          user_code: string
        }
        Update: {
          created_at?: string
          id?: string
          ip?: unknown
          portal?: Database["public"]["Enums"]["org_kind"] | null
          reason?: string | null
          succeeded?: boolean
          user_code?: string
        }
        Relationships: []
      }
      manufacturer_stock: {
        Row: {
          owner_org_id: string
          product_id: string
          quantity: number
          unit: string
          updated_at: string
        }
        Insert: {
          owner_org_id: string
          product_id: string
          quantity?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          owner_org_id?: string
          product_id?: string
          quantity?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manufacturer_stock_product_id_owner_org_id_fkey"
            columns: ["product_id", "owner_org_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "owner_org_id"]
          },
        ]
      }
      order_item_retail_prices: {
        Row: {
          created_at: string
          order_item_id: string
          retail_unit_price: number
          retailer_org_id: string
        }
        Insert: {
          created_at?: string
          order_item_id: string
          retail_unit_price: number
          retailer_org_id: string
        }
        Update: {
          created_at?: string
          order_item_id?: string
          retail_unit_price?: number
          retailer_org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_item_retail_prices_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: true
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_retail_prices_retailer_org_id_fkey"
            columns: ["retailer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_snapshot: Json
          quantity: number
          supplier_unit_price: number
          total_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_snapshot?: Json
          quantity: number
          supplier_unit_price: number
          total_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_snapshot?: Json
          quantity?: number
          supplier_unit_price?: number
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_sequences: {
        Row: {
          day: string
          last_no: number
          manufacturer_org_id: string
        }
        Insert: {
          day: string
          last_no?: number
          manufacturer_org_id: string
        }
        Update: {
          day?: string
          last_no?: number
          manufacturer_org_id?: string
        }
        Relationships: []
      }
      order_status_logs: {
        Row: {
          actor_org_id: string | null
          actor_user_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: string
          note: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          actor_org_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          note?: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          actor_org_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          note?: string | null
          order_id?: string
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          currency: string
          customer_address: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          manufacturer_org_id: string
          note: string | null
          order_no: string
          order_token: string
          parent_order_id: string | null
          relationship_id: string
          retailer_org_id: string
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          manufacturer_org_id: string
          note?: string | null
          order_no: string
          order_token?: string
          parent_order_id?: string | null
          relationship_id: string
          retailer_org_id: string
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          manufacturer_org_id?: string
          note?: string | null
          order_no?: string
          order_token?: string
          parent_order_id?: string | null
          relationship_id?: string
          retailer_org_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_manufacturer_org_id_fkey"
            columns: ["manufacturer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_parent_order_id_fkey"
            columns: ["parent_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_retailer_org_id_fkey"
            columns: ["retailer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          active_relationship_count: number
          address: string | null
          authorized_name: string | null
          branding: Json
          company_name: string
          created_at: string
          created_by_org_id: string | null
          email: string | null
          enabled_modules: Json
          id: string
          is_active: boolean
          is_subscriber: boolean
          kind: Database["public"]["Enums"]["org_kind"]
          phone: string | null
          plan: Database["public"]["Enums"]["plan_tier"] | null
          subdomain: string | null
          updated_at: string
          vkn_tc: string
        }
        Insert: {
          active_relationship_count?: number
          address?: string | null
          authorized_name?: string | null
          branding?: Json
          company_name: string
          created_at?: string
          created_by_org_id?: string | null
          email?: string | null
          enabled_modules?: Json
          id?: string
          is_active?: boolean
          is_subscriber?: boolean
          kind: Database["public"]["Enums"]["org_kind"]
          phone?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"] | null
          subdomain?: string | null
          updated_at?: string
          vkn_tc: string
        }
        Update: {
          active_relationship_count?: number
          address?: string | null
          authorized_name?: string | null
          branding?: Json
          company_name?: string
          created_at?: string
          created_by_org_id?: string | null
          email?: string | null
          enabled_modules?: Json
          id?: string
          is_active?: boolean
          is_subscriber?: boolean
          kind?: Database["public"]["Enums"]["org_kind"]
          phone?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"] | null
          subdomain?: string | null
          updated_at?: string
          vkn_tc?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_org_id_fkey"
            columns: ["created_by_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          label: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          label?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          label?: string | null
          user_id?: string
        }
        Relationships: []
      }
      product_costs: {
        Row: {
          cost_price: number
          owner_org_id: string
          product_id: string
          updated_at: string
        }
        Insert: {
          cost_price: number
          owner_org_id: string
          product_id: string
          updated_at?: string
        }
        Update: {
          cost_price?: number
          owner_org_id?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_costs_product_id_owner_org_id_fkey"
            columns: ["product_id", "owner_org_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "owner_org_id"]
          },
        ]
      }
      product_groups: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          owner_kind: Database["public"]["Enums"]["org_kind"] | null
          owner_org_id: string
          parent_group_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          owner_kind?: Database["public"]["Enums"]["org_kind"] | null
          owner_org_id: string
          parent_group_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          owner_kind?: Database["public"]["Enums"]["org_kind"] | null
          owner_org_id?: string
          parent_group_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_groups_owner_org_id_owner_kind_fkey"
            columns: ["owner_org_id", "owner_kind"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id", "kind"]
          },
          {
            foreignKeyName: "product_groups_parent_group_id_fkey"
            columns: ["parent_group_id"]
            isOneToOne: false
            referencedRelation: "product_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          code: string
          created_at: string
          currency: string
          depth_cm: number | null
          description: string | null
          group_id: string | null
          height_cm: number | null
          id: string
          images: string[]
          is_active: boolean
          name: string
          owner_kind: Database["public"]["Enums"]["org_kind"] | null
          owner_org_id: string
          set_contents: Json
          supplier_price: number
          type: Database["public"]["Enums"]["product_type"]
          updated_at: string
          variants: Json
          width_cm: number | null
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          currency?: string
          depth_cm?: number | null
          description?: string | null
          group_id?: string | null
          height_cm?: number | null
          id?: string
          images?: string[]
          is_active?: boolean
          name: string
          owner_kind?: Database["public"]["Enums"]["org_kind"] | null
          owner_org_id: string
          set_contents?: Json
          supplier_price: number
          type?: Database["public"]["Enums"]["product_type"]
          updated_at?: string
          variants?: Json
          width_cm?: number | null
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          currency?: string
          depth_cm?: number | null
          description?: string | null
          group_id?: string | null
          height_cm?: number | null
          id?: string
          images?: string[]
          is_active?: boolean
          name?: string
          owner_kind?: Database["public"]["Enums"]["org_kind"] | null
          owner_org_id?: string
          set_contents?: Json
          supplier_price?: number
          type?: Database["public"]["Enums"]["product_type"]
          updated_at?: string
          variants?: Json
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "product_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_owner_org_id_owner_kind_fkey"
            columns: ["owner_org_id", "owner_kind"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id", "kind"]
          },
        ]
      }
      relationships: {
        Row: {
          activated_at: string | null
          created_at: string
          discount_rate: number
          id: string
          initiated_by_org_id: string
          manufacturer_kind: Database["public"]["Enums"]["org_kind"] | null
          manufacturer_org_id: string
          retailer_kind: Database["public"]["Enums"]["org_kind"] | null
          retailer_org_id: string
          status: Database["public"]["Enums"]["relationship_status"]
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          discount_rate?: number
          id?: string
          initiated_by_org_id: string
          manufacturer_kind?: Database["public"]["Enums"]["org_kind"] | null
          manufacturer_org_id: string
          retailer_kind?: Database["public"]["Enums"]["org_kind"] | null
          retailer_org_id: string
          status?: Database["public"]["Enums"]["relationship_status"]
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          discount_rate?: number
          id?: string
          initiated_by_org_id?: string
          manufacturer_kind?: Database["public"]["Enums"]["org_kind"] | null
          manufacturer_org_id?: string
          retailer_kind?: Database["public"]["Enums"]["org_kind"] | null
          retailer_org_id?: string
          status?: Database["public"]["Enums"]["relationship_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationships_initiated_by_org_id_fkey"
            columns: ["initiated_by_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_manufacturer_org_id_manufacturer_kind_fkey"
            columns: ["manufacturer_org_id", "manufacturer_kind"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id", "kind"]
          },
          {
            foreignKeyName: "relationships_retailer_org_id_retailer_kind_fkey"
            columns: ["retailer_org_id", "retailer_kind"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id", "kind"]
          },
        ]
      }
      retail_prices: {
        Row: {
          product_id: string
          retail_price: number
          retailer_kind: Database["public"]["Enums"]["org_kind"] | null
          retailer_org_id: string
          updated_at: string
        }
        Insert: {
          product_id: string
          retail_price: number
          retailer_kind?: Database["public"]["Enums"]["org_kind"] | null
          retailer_org_id: string
          updated_at?: string
        }
        Update: {
          product_id?: string
          retail_price?: number
          retailer_kind?: Database["public"]["Enums"]["org_kind"] | null
          retailer_org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "retail_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retail_prices_retailer_org_id_retailer_kind_fkey"
            columns: ["retailer_org_id", "retailer_kind"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id", "kind"]
          },
        ]
      }
      retailer_stock: {
        Row: {
          product_id: string
          quantity: number
          retailer_kind: Database["public"]["Enums"]["org_kind"] | null
          retailer_org_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          product_id: string
          quantity?: number
          retailer_kind?: Database["public"]["Enums"]["org_kind"] | null
          retailer_org_id: string
          unit?: string
          updated_at?: string
        }
        Update: {
          product_id?: string
          quantity?: number
          retailer_kind?: Database["public"]["Enums"]["org_kind"] | null
          retailer_org_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "retailer_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retailer_stock_retailer_org_id_retailer_kind_fkey"
            columns: ["retailer_org_id", "retailer_kind"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id", "kind"]
          },
        ]
      }
      return_requests: {
        Row: {
          approved_amount: number | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          items: Json
          manufacturer_org_id: string
          order_id: string
          reason: string | null
          relationship_id: string
          retailer_org_id: string
          status: Database["public"]["Enums"]["return_status"]
          updated_at: string
        }
        Insert: {
          approved_amount?: number | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          items?: Json
          manufacturer_org_id: string
          order_id: string
          reason?: string | null
          relationship_id: string
          retailer_org_id: string
          status?: Database["public"]["Enums"]["return_status"]
          updated_at?: string
        }
        Update: {
          approved_amount?: number | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          items?: Json
          manufacturer_org_id?: string
          order_id?: string
          reason?: string | null
          relationship_id?: string
          retailer_org_id?: string
          status?: Database["public"]["Enums"]["return_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_requests_manufacturer_org_id_fkey"
            columns: ["manufacturer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_retailer_org_id_fkey"
            columns: ["retailer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ssh_requests: {
        Row: {
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          description: string | null
          id: string
          images: string[]
          manufacturer_org_id: string
          order_id: string | null
          product_id: string | null
          relationship_id: string
          retailer_org_id: string
          status: Database["public"]["Enums"]["ssh_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          description?: string | null
          id?: string
          images?: string[]
          manufacturer_org_id: string
          order_id?: string | null
          product_id?: string | null
          relationship_id: string
          retailer_org_id: string
          status?: Database["public"]["Enums"]["ssh_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          description?: string | null
          id?: string
          images?: string[]
          manufacturer_org_id?: string
          order_id?: string | null
          product_id?: string | null
          relationship_id?: string
          retailer_org_id?: string
          status?: Database["public"]["Enums"]["ssh_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ssh_requests_manufacturer_org_id_fkey"
            columns: ["manufacturer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ssh_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ssh_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ssh_requests_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ssh_requests_retailer_org_id_fkey"
            columns: ["retailer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ssh_status_logs: {
        Row: {
          actor_org_id: string
          actor_user_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["ssh_status"] | null
          id: string
          manufacturer_org_id: string
          note: string | null
          retailer_org_id: string
          ssh_id: string
          to_status: Database["public"]["Enums"]["ssh_status"]
        }
        Insert: {
          actor_org_id: string
          actor_user_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["ssh_status"] | null
          id?: string
          manufacturer_org_id: string
          note?: string | null
          retailer_org_id: string
          ssh_id: string
          to_status: Database["public"]["Enums"]["ssh_status"]
        }
        Update: {
          actor_org_id?: string
          actor_user_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["ssh_status"] | null
          id?: string
          manufacturer_org_id?: string
          note?: string | null
          retailer_org_id?: string
          ssh_id?: string
          to_status?: Database["public"]["Enums"]["ssh_status"]
        }
        Relationships: [
          {
            foreignKeyName: "ssh_status_logs_actor_org_id_fkey"
            columns: ["actor_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ssh_status_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ssh_status_logs_ssh_id_fkey"
            columns: ["ssh_id"]
            isOneToOne: false
            referencedRelation: "ssh_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_scope: {
        Row: {
          created_at: string
          retailer_org_id: string
          staff_user_id: string
        }
        Insert: {
          created_at?: string
          retailer_org_id: string
          staff_user_id: string
        }
        Update: {
          created_at?: string
          retailer_org_id?: string
          staff_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_scope_retailer_org_id_fkey"
            columns: ["retailer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_scope_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          note: string | null
          org_id: string
          requested_by: string | null
          requested_plan: Database["public"]["Enums"]["plan_tier"] | null
          status: Database["public"]["Enums"]["subscription_request_status"]
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          note?: string | null
          org_id: string
          requested_by?: string | null
          requested_plan?: Database["public"]["Enums"]["plan_tier"] | null
          status?: Database["public"]["Enums"]["subscription_request_status"]
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          note?: string | null
          org_id?: string
          requested_by?: string | null
          requested_plan?: Database["public"]["Enums"]["plan_tier"] | null
          status?: Database["public"]["Enums"]["subscription_request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "subscription_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          action: string
          actor_org_id: string | null
          actor_user_id: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          meta: Json
        }
        Insert: {
          action: string
          actor_org_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          meta?: Json
        }
        Update: {
          action?: string
          actor_org_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          meta?: Json
        }
        Relationships: []
      }
      system_logs_202608: {
        Row: {
          action: string
          actor_org_id: string | null
          actor_user_id: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          meta: Json
        }
        Insert: {
          action: string
          actor_org_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          meta?: Json
        }
        Update: {
          action?: string
          actor_org_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          meta?: Json
        }
        Relationships: []
      }
      system_logs_202609: {
        Row: {
          action: string
          actor_org_id: string | null
          actor_user_id: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          meta: Json
        }
        Insert: {
          action: string
          actor_org_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          meta?: Json
        }
        Update: {
          action?: string
          actor_org_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          meta?: Json
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string
          id: string
          items_snapshot: Json
          manufacturer_org_id: string
          order_id: string | null
          relationship_id: string
          retailer_org_id: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description: string
          id?: string
          items_snapshot?: Json
          manufacturer_org_id: string
          order_id?: string | null
          relationship_id: string
          retailer_org_id: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string
          id?: string
          items_snapshot?: Json
          manufacturer_org_id?: string
          order_id?: string | null
          relationship_id?: string
          retailer_org_id?: string
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_manufacturer_org_id_fkey"
            columns: ["manufacturer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_retailer_org_id_fkey"
            columns: ["retailer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_email: string
          created_at: string
          email: string | null
          failed_attempts: number
          full_name: string | null
          id: string
          is_active: boolean
          locked_until: string | null
          org_id: string
          org_role: Database["public"]["Enums"]["org_role"]
          phone: string | null
          updated_at: string
          user_code: string
        }
        Insert: {
          auth_email: string
          created_at?: string
          email?: string | null
          failed_attempts?: number
          full_name?: string | null
          id: string
          is_active?: boolean
          locked_until?: string | null
          org_id: string
          org_role?: Database["public"]["Enums"]["org_role"]
          phone?: string | null
          updated_at?: string
          user_code: string
        }
        Update: {
          auth_email?: string
          created_at?: string
          email?: string | null
          failed_attempts?: number
          full_name?: string | null
          id?: string
          is_active?: boolean
          locked_until?: string | null
          org_id?: string
          org_role?: Database["public"]["Enums"]["org_role"]
          phone?: string | null
          updated_at?: string
          user_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_counterparty: {
        Args: {
          p_authorized_name?: string
          p_company_name?: string
          p_discount_rate?: number
          p_email?: string
          p_phone?: string
          p_vkn_tc: string
        }
        Returns: Database["public"]["CompositeTypes"]["add_counterparty_result"]
        SetofOptions: {
          from: "*"
          to: "add_counterparty_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      add_manual_transaction: {
        Args: {
          p_amount: number
          p_description: string
          p_relationship_id: string
          p_type: Database["public"]["Enums"]["transaction_type"]
        }
        Returns: {
          amount: number
          balance_after: number
          created_at: string
          description: string
          id: string
          items_snapshot: Json
          manufacturer_org_id: string
          order_id: string | null
          relationship_id: string
          retailer_org_id: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_relationship_status: {
        Args: {
          p_relationship_id: string
          p_status: Database["public"]["Enums"]["relationship_status"]
        }
        Returns: {
          activated_at: string | null
          created_at: string
          discount_rate: number
          id: string
          initiated_by_org_id: string
          manufacturer_kind: Database["public"]["Enums"]["org_kind"] | null
          manufacturer_org_id: string
          retailer_kind: Database["public"]["Enums"]["org_kind"] | null
          retailer_org_id: string
          status: Database["public"]["Enums"]["relationship_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "relationships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      advance_order_status: {
        Args: {
          p_note?: string
          p_order_id: string
          p_status: Database["public"]["Enums"]["order_status"]
        }
        Returns: {
          created_at: string
          currency: string
          customer_address: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          manufacturer_org_id: string
          note: string | null
          order_no: string
          order_token: string
          parent_order_id: string | null
          relationship_id: string
          retailer_org_id: string
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      advance_ssh_status: {
        Args: {
          p_id: string
          p_note?: string
          p_status: Database["public"]["Enums"]["ssh_status"]
        }
        Returns: {
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          description: string | null
          id: string
          images: string[]
          manufacturer_org_id: string
          order_id: string | null
          product_id: string | null
          relationship_id: string
          retailer_org_id: string
          status: Database["public"]["Enums"]["ssh_status"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "ssh_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assign_products_to_group: {
        Args: { p_group_id?: string; p_product_ids: string[] }
        Returns: number
      }
      bulk_update_stock: { Args: { p_rows: Json }; Returns: number }
      cancel_order_atomic: {
        Args: { p_order_id: string; p_reason?: string }
        Returns: {
          created_at: string
          currency: string
          customer_address: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          manufacturer_org_id: string
          note: string | null
          order_no: string
          order_token: string
          parent_order_id: string | null
          relationship_id: string
          retailer_org_id: string
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_return_atomic: {
        Args: { p_approve: boolean; p_note?: string; p_return_id: string }
        Returns: {
          approved_amount: number | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          items: Json
          manufacturer_org_id: string
          order_id: string
          reason: string | null
          relationship_id: string
          retailer_org_id: string
          status: Database["public"]["Enums"]["return_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "return_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_invitation: {
        Args: {
          p_authorized_name?: string
          p_company_name?: string
          p_discount_rate?: number
          p_email?: string
          p_phone?: string
          p_valid_days?: number
          p_vkn_tc?: string
        }
        Returns: {
          authorized_name: string | null
          company_name: string | null
          created_at: string
          created_by_user_id: string | null
          discount_rate: number
          email: string | null
          expires_at: string
          id: string
          inviter_org_id: string
          phone: string | null
          revoked_at: string | null
          token: string
          used_at: string | null
          used_by_org_id: string | null
          vkn_tc: string | null
        }
        SetofOptions: {
          from: "*"
          to: "invitations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_return_request: {
        Args: { p_items: Json; p_order_id: string; p_reason?: string }
        Returns: string
      }
      create_ssh_request: {
        Args: {
          p_customer?: Json
          p_description?: string
          p_order_id?: string
          p_product_id?: string
          p_relationship_id: string
          p_title: string
        }
        Returns: string
      }
      current_balance: { Args: { p_relationship_id: string }; Returns: number }
      dashboard_summary: { Args: never; Returns: Json }
      decide_subscription_request: {
        Args: {
          p_approve: boolean
          p_plan?: Database["public"]["Enums"]["plan_tier"]
          p_request_id: string
          p_subdomain?: string
        }
        Returns: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          note: string | null
          org_id: string
          requested_by: string | null
          requested_plan: Database["public"]["Enums"]["plan_tier"] | null
          status: Database["public"]["Enums"]["subscription_request_status"]
        }
        SetofOptions: {
          from: "*"
          to: "subscription_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      default_modules_for_plan: {
        Args: { p_plan: Database["public"]["Enums"]["plan_tier"] }
        Returns: Json
      }
      delete_product_group: { Args: { p_id: string }; Returns: undefined }
      delete_product_permanently: { Args: { p_id: string }; Returns: undefined }
      downgrade_org_to_guest: {
        Args: { p_org_id: string }
        Returns: {
          active_relationship_count: number
          address: string | null
          authorized_name: string | null
          branding: Json
          company_name: string
          created_at: string
          created_by_org_id: string | null
          email: string | null
          enabled_modules: Json
          id: string
          is_active: boolean
          is_subscriber: boolean
          kind: Database["public"]["Enums"]["org_kind"]
          phone: string | null
          plan: Database["public"]["Enums"]["plan_tier"] | null
          subdomain: string | null
          updated_at: string
          vkn_tc: string
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_log_partition: { Args: { p_month: string }; Returns: undefined }
      get_my_org_id: { Args: never; Returns: string }
      get_my_org_kind: {
        Args: never
        Returns: Database["public"]["Enums"]["org_kind"]
      }
      get_my_org_role: {
        Args: never
        Returns: Database["public"]["Enums"]["org_role"]
      }
      get_my_user_id: { Args: never; Returns: string }
      is_my_relationship: {
        Args: { p_relationship_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      is_valid_tckn: { Args: { p: string }; Returns: boolean }
      is_valid_vkn: { Args: { p: string }; Returns: boolean }
      is_valid_vkn_tc: { Args: { p: string }; Returns: boolean }
      ledger_period_summary: {
        Args: { p_from?: string; p_relationship_id: string; p_to?: string }
        Returns: Database["public"]["CompositeTypes"]["ledger_summary"]
        SetofOptions: {
          from: "*"
          to: "ledger_summary"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      manufacturer_summary: {
        Args: { p_from?: string; p_to?: string }
        Returns: Json
      }
      my_relationship_ids: { Args: never; Returns: string[] }
      next_order_no: {
        Args: { p_manufacturer_org_id: string }
        Returns: string
      }
      place_order_atomic: {
        Args: { p_customer?: Json; p_items: Json; p_relationship_id: string }
        Returns: string
      }
      relationship_has_module: {
        Args: { p_module: string; p_relationship_id: string }
        Returns: boolean
      }
      request_subscription: {
        Args: {
          p_note?: string
          p_plan?: Database["public"]["Enums"]["plan_tier"]
        }
        Returns: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          note: string | null
          org_id: string
          requested_by: string | null
          requested_plan: Database["public"]["Enums"]["plan_tier"] | null
          status: Database["public"]["Enums"]["subscription_request_status"]
        }
        SetofOptions: {
          from: "*"
          to: "subscription_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      respond_to_connection_request: {
        Args: { p_accept: boolean; p_relationship_id: string }
        Returns: {
          activated_at: string | null
          created_at: string
          discount_rate: number
          id: string
          initiated_by_org_id: string
          manufacturer_kind: Database["public"]["Enums"]["org_kind"] | null
          manufacturer_org_id: string
          retailer_kind: Database["public"]["Enums"]["org_kind"] | null
          retailer_org_id: string
          status: Database["public"]["Enums"]["relationship_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "relationships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      retailer_summary: {
        Args: { p_from?: string; p_to?: string }
        Returns: Json
      }
      revoke_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      save_product: {
        Args: {
          p_category?: string
          p_code: string
          p_cost_price?: number
          p_depth?: number
          p_description?: string
          p_group_id?: string
          p_height?: number
          p_id: string
          p_images?: string[]
          p_name: string
          p_set_contents?: Json
          p_stock?: number
          p_supplier_price: number
          p_type?: Database["public"]["Enums"]["product_type"]
          p_variants?: Json
          p_width?: number
        }
        Returns: string
      }
      save_product_group: {
        Args: { p_id: string; p_name: string; p_sort_order?: number }
        Returns: string
      }
      set_counterparty_discount: {
        Args: { p_discount_rate: number; p_relationship_id: string }
        Returns: {
          activated_at: string | null
          created_at: string
          discount_rate: number
          id: string
          initiated_by_org_id: string
          manufacturer_kind: Database["public"]["Enums"]["org_kind"] | null
          manufacturer_org_id: string
          retailer_kind: Database["public"]["Enums"]["org_kind"] | null
          retailer_org_id: string
          status: Database["public"]["Enums"]["relationship_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "relationships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_counterparty_status: {
        Args: {
          p_relationship_id: string
          p_status: Database["public"]["Enums"]["relationship_status"]
        }
        Returns: {
          activated_at: string | null
          created_at: string
          discount_rate: number
          id: string
          initiated_by_org_id: string
          manufacturer_kind: Database["public"]["Enums"]["org_kind"] | null
          manufacturer_org_id: string
          retailer_kind: Database["public"]["Enums"]["org_kind"] | null
          retailer_org_id: string
          status: Database["public"]["Enums"]["relationship_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "relationships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_group_products: {
        Args: { p_group_id: string; p_product_ids: string[] }
        Returns: number
      }
      set_product_active: {
        Args: { p_active: boolean; p_id: string }
        Returns: {
          category: string | null
          code: string
          created_at: string
          currency: string
          depth_cm: number | null
          description: string | null
          group_id: string | null
          height_cm: number | null
          id: string
          images: string[]
          is_active: boolean
          name: string
          owner_kind: Database["public"]["Enums"]["org_kind"] | null
          owner_org_id: string
          set_contents: Json
          supplier_price: number
          type: Database["public"]["Enums"]["product_type"]
          updated_at: string
          variants: Json
          width_cm: number | null
        }
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_product_stock: {
        Args: { p_product_id: string; p_quantity: number }
        Returns: undefined
      }
      set_ssh_images: {
        Args: { p_paths: string[]; p_ssh_id: string }
        Returns: {
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          description: string | null
          id: string
          images: string[]
          manufacturer_org_id: string
          order_id: string | null
          product_id: string | null
          relationship_id: string
          retailer_org_id: string
          status: Database["public"]["Enums"]["ssh_status"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "ssh_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_staff_active: {
        Args: { p_is_active: boolean; p_user_id: string }
        Returns: undefined
      }
      set_staff_role: {
        Args: {
          p_role: Database["public"]["Enums"]["org_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      set_staff_scope: {
        Args: { p_retailer_org_ids: string[]; p_staff_user_id: string }
        Returns: undefined
      }
      shares_relationship_with: { Args: { p_org_id: string }; Returns: boolean }
      ship_order_atomic: {
        Args: { p_items?: Json; p_order_id: string }
        Returns: string
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      track_order: { Args: { p_token: string }; Returns: Json }
      upgrade_org_to_subscriber: {
        Args: {
          p_org_id: string
          p_plan: Database["public"]["Enums"]["plan_tier"]
          p_subdomain: string
        }
        Returns: {
          active_relationship_count: number
          address: string | null
          authorized_name: string | null
          branding: Json
          company_name: string
          created_at: string
          created_by_org_id: string | null
          email: string | null
          enabled_modules: Json
          id: string
          is_active: boolean
          is_subscriber: boolean
          kind: Database["public"]["Enums"]["org_kind"]
          phone: string | null
          plan: Database["public"]["Enums"]["plan_tier"] | null
          subdomain: string | null
          updated_at: string
          vkn_tc: string
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      finance_kind: "income" | "expense"
      lead_status: "new" | "contacted" | "interested" | "converted" | "rejected"
      order_status:
        | "pending"
        | "confirmed"
        | "in_production"
        | "partially_shipped"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "return_requested"
        | "returned"
      org_kind: "manufacturer" | "retailer"
      org_role: "owner" | "staff" | "accountant"
      payment_method: "cash" | "pos_own" | "pos_manufacturer" | "bank_transfer"
      plan_tier: "free" | "basic" | "pro"
      product_type: "single" | "set"
      relationship_status: "pending" | "active" | "passive"
      return_status: "pending" | "approved" | "rejected"
      ssh_status:
        | "bekliyor"
        | "inceleniyor"
        | "parca_gonderildi"
        | "tamamlandi"
        | "iptal"
      subscription_request_status: "pending" | "approved" | "rejected"
      transaction_type: "debit" | "credit"
    }
    CompositeTypes: {
      add_counterparty_result: {
        relationship_id: string | null
        org_id: string | null
        org_created: boolean | null
        status: Database["public"]["Enums"]["relationship_status"] | null
        already_existed: boolean | null
      }
      ledger_summary: {
        opening_balance: number | null
        total_debit: number | null
        total_credit: number | null
        closing_balance: number | null
        entry_count: number | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      finance_kind: ["income", "expense"],
      lead_status: ["new", "contacted", "interested", "converted", "rejected"],
      order_status: [
        "pending",
        "confirmed",
        "in_production",
        "partially_shipped",
        "shipped",
        "delivered",
        "cancelled",
        "return_requested",
        "returned",
      ],
      org_kind: ["manufacturer", "retailer"],
      org_role: ["owner", "staff", "accountant"],
      payment_method: ["cash", "pos_own", "pos_manufacturer", "bank_transfer"],
      plan_tier: ["free", "basic", "pro"],
      product_type: ["single", "set"],
      relationship_status: ["pending", "active", "passive"],
      return_status: ["pending", "approved", "rejected"],
      ssh_status: [
        "bekliyor",
        "inceleniyor",
        "parca_gonderildi",
        "tamamlandi",
        "iptal",
      ],
      subscription_request_status: ["pending", "approved", "rejected"],
      transaction_type: ["debit", "credit"],
    },
  },
} as const
