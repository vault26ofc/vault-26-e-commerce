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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      abandoned_carts: {
        Row: {
          cart_id: string | null
          cart_value: number | null
          created_at: string
          email: string | null
          id: string
          item_count: number | null
          last_activity_at: string
          notified_at_1h: boolean
          notified_at_24h: boolean
          notified_at_48h: boolean
          phone: string | null
          recovered: boolean
          recovered_at: string | null
          user_id: string | null
        }
        Insert: {
          cart_id?: string | null
          cart_value?: number | null
          created_at?: string
          email?: string | null
          id?: string
          item_count?: number | null
          last_activity_at?: string
          notified_at_1h?: boolean
          notified_at_24h?: boolean
          notified_at_48h?: boolean
          phone?: string | null
          recovered?: boolean
          recovered_at?: string | null
          user_id?: string | null
        }
        Update: {
          cart_id?: string | null
          cart_value?: number | null
          created_at?: string
          email?: string | null
          id?: string
          item_count?: number | null
          last_activity_at?: string
          notified_at_1h?: boolean
          notified_at_24h?: boolean
          notified_at_48h?: boolean
          phone?: string | null
          recovered?: boolean
          recovered_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_carts_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
        ]
      }
      addresses: {
        Row: {
          city: string
          created_at: string
          full_name: string
          id: string
          is_default: boolean
          line1: string
          line2: string | null
          phone: string
          pincode: string
          state: string
          user_id: string
        }
        Insert: {
          city: string
          created_at?: string
          full_name: string
          id?: string
          is_default?: boolean
          line1: string
          line2?: string | null
          phone: string
          pincode: string
          state: string
          user_id: string
        }
        Update: {
          city?: string
          created_at?: string
          full_name?: string
          id?: string
          is_default?: boolean
          line1?: string
          line2?: string | null
          phone?: string
          pincode?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          order_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          order_id?: string | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          order_id?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      announcement_bars: {
        Row: {
          bg_color: string
          created_at: string
          cta_href: string | null
          cta_label: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          message: string
          position: number
          starts_at: string | null
          text_color: string
        }
        Insert: {
          bg_color?: string
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          message: string
          position?: number
          starts_at?: string | null
          text_color?: string
        }
        Update: {
          bg_color?: string
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          position?: number
          starts_at?: string | null
          text_color?: string
        }
        Relationships: []
      }
      brand_categories: {
        Row: {
          brand_id: string
          category_id: string
        }
        Insert: {
          brand_id: string
          category_id: string
        }
        Update: {
          brand_id?: string
          category_id?: string
        }
        Relationships: []
      }
      brand_settings: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          favicon_url: string | null
          id: string
          logo_url: string | null
          og_default_image: string | null
          site_name: string
          social_facebook: string | null
          social_instagram: string | null
          social_twitter: string | null
          tagline: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          og_default_image?: string | null
          site_name?: string
          social_facebook?: string | null
          social_instagram?: string | null
          social_twitter?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          og_default_image?: string | null
          site_name?: string
          social_facebook?: string | null
          social_instagram?: string | null
          social_twitter?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          banner_image: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo: string | null
          name: string
          slug: string
        }
        Insert: {
          banner_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo?: string | null
          name: string
          slug: string
        }
        Update: {
          banner_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          quantity: number
          variant_id: string
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          quantity?: number
          variant_id: string
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          quantity?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          coupon_id: string | null
          created_at: string
          id: string
          session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          coupon_id?: string | null
          created_at?: string
          id?: string
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          coupon_id?: string | null
          created_at?: string
          id?: string
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          brand_id: string | null
          created_at: string
          description: string | null
          id: string
          image: string | null
          is_active: boolean
          name: string
          parent_id: string | null
          position: number
          slug: string
          video: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          is_active?: boolean
          name: string
          parent_id?: string | null
          position?: number
          slug: string
          video?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          is_active?: boolean
          name?: string
          parent_id?: string | null
          position?: number
          slug?: string
          video?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      community_photos: {
        Row: {
          bento_size: string
          created_at: string
          handle: string | null
          id: string
          image_url: string
          is_active: boolean
          media_type: string
          position: number
        }
        Insert: {
          bento_size?: string
          created_at?: string
          handle?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          media_type?: string
          position?: number
        }
        Update: {
          bento_size?: string
          created_at?: string
          handle?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          media_type?: string
          position?: number
        }
        Relationships: []
      }
      content_versions: {
        Row: {
          changed_by: string | null
          changed_by_email: string | null
          created_at: string
          id: string
          note: string | null
          record_id: string
          snapshot: Json
          table_name: string
        }
        Insert: {
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          id?: string
          note?: string | null
          record_id: string
          snapshot: Json
          table_name: string
        }
        Update: {
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          id?: string
          note?: string | null
          record_id?: string
          snapshot?: Json
          table_name?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order: number
          type: Database["public"]["Enums"]["coupon_type"]
          used_count: number
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order?: number
          type: Database["public"]["Enums"]["coupon_type"]
          used_count?: number
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order?: number
          type?: Database["public"]["Enums"]["coupon_type"]
          used_count?: number
          value?: number
        }
        Relationships: []
      }
      customer_notification_preferences: {
        Row: {
          created_at: string
          id: string
          marketing_opted_in: boolean
          phone: string | null
          transactional_opted_in: boolean
          unsubscribed: boolean
          unsubscribed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          marketing_opted_in?: boolean
          phone?: string | null
          transactional_opted_in?: boolean
          unsubscribed?: boolean
          unsubscribed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          marketing_opted_in?: boolean
          phone?: string | null
          transactional_opted_in?: boolean
          unsubscribed?: boolean
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      faq_items: {
        Row: {
          answer: string
          category: string
          created_at: string
          id: string
          is_active: boolean
          position: number
          question: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          position?: number
          question: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          position?: number
          question?: string
        }
        Relationships: []
      }
      influencer_pick_products: {
        Row: {
          created_at: string
          id: string
          influencer_pick_id: string
          position: number
          product_slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          influencer_pick_id: string
          position?: number
          product_slug: string
        }
        Update: {
          created_at?: string
          id?: string
          influencer_pick_id?: string
          position?: number
          product_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencer_pick_products_influencer_pick_id_fkey"
            columns: ["influencer_pick_id"]
            isOneToOne: false
            referencedRelation: "influencer_picks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_pick_products_product_slug_fkey"
            columns: ["product_slug"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["slug"]
          },
        ]
      }
      influencer_picks: {
        Row: {
          created_at: string
          handle: string | null
          id: string
          is_active: boolean
          link_url: string | null
          name: string
          position: number
          quote: string | null
          thumbnail_type: string
          thumbnail_url: string | null
          video_source: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          handle?: string | null
          id?: string
          is_active?: boolean
          link_url?: string | null
          name: string
          position?: number
          quote?: string | null
          thumbnail_type?: string
          thumbnail_url?: string | null
          video_source: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          handle?: string | null
          id?: string
          is_active?: boolean
          link_url?: string | null
          name?: string
          position?: number
          quote?: string | null
          thumbnail_type?: string
          thumbnail_url?: string | null
          video_source?: string
          video_url?: string | null
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          delta: number
          id: string
          order_id: string | null
          reason: string
          stock_after: number
          variant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delta: number
          id?: string
          order_id?: string | null
          reason: string
          stock_after: number
          variant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delta?: number
          id?: string
          order_id?: string | null
          reason?: string
          stock_after?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      lookbook_slides: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          media_type: string
          position: number
          product_slug: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          media_type?: string
          position?: number
          product_slug?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          media_type?: string
          position?: number
          product_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lookbook_slides_product_slug_fkey"
            columns: ["product_slug"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["slug"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          delivered_count: number
          failed_count: number
          id: string
          name: string
          scheduled_at: string | null
          sent_count: number
          started_at: string | null
          status: string
          target_segment: string
          template_name: string
          updated_at: string
          variables: Json
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          failed_count?: number
          id?: string
          name: string
          scheduled_at?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          target_segment?: string
          template_name: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          failed_count?: number
          id?: string
          name?: string
          scheduled_at?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          target_segment?: string
          template_name?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          alt_text: string | null
          bytes: number | null
          cloudinary_public_id: string
          created_at: string
          folder: string | null
          format: string | null
          height: number | null
          id: string
          resource_type: string
          secure_url: string
          tags: string[]
          uploaded_by: string | null
          url: string
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          bytes?: number | null
          cloudinary_public_id: string
          created_at?: string
          folder?: string | null
          format?: string | null
          height?: number | null
          id?: string
          resource_type?: string
          secure_url: string
          tags?: string[]
          uploaded_by?: string | null
          url: string
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          bytes?: number | null
          cloudinary_public_id?: string
          created_at?: string
          folder?: string | null
          format?: string | null
          height?: number | null
          id?: string
          resource_type?: string
          secure_url?: string
          tags?: string[]
          uploaded_by?: string | null
          url?: string
          width?: number | null
        }
        Relationships: []
      }
      mega_menu_groups: {
        Row: {
          created_at: string
          heading: string
          id: string
          position: number
          tab_id: string
        }
        Insert: {
          created_at?: string
          heading: string
          id?: string
          position?: number
          tab_id: string
        }
        Update: {
          created_at?: string
          heading?: string
          id?: string
          position?: number
          tab_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mega_menu_groups_tab_id_fkey"
            columns: ["tab_id"]
            isOneToOne: false
            referencedRelation: "mega_menu_tabs"
            referencedColumns: ["id"]
          },
        ]
      }
      mega_menu_links: {
        Row: {
          category_id: string | null
          created_at: string
          custom_href: string | null
          custom_label: string | null
          group_id: string
          hover_image_url: string | null
          id: string
          link_type: string
          position: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          custom_href?: string | null
          custom_label?: string | null
          group_id: string
          hover_image_url?: string | null
          id?: string
          link_type: string
          position?: number
        }
        Update: {
          category_id?: string | null
          created_at?: string
          custom_href?: string | null
          custom_label?: string | null
          group_id?: string
          hover_image_url?: string | null
          id?: string
          link_type?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "mega_menu_links_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mega_menu_links_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "mega_menu_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      mega_menu_tabs: {
        Row: {
          category_id: string | null
          created_at: string
          custom_href: string | null
          custom_label: string | null
          hero_image_url: string | null
          id: string
          is_active: boolean
          position: number
          subhead: string | null
          tab_type: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          custom_href?: string | null
          custom_label?: string | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean
          position?: number
          subhead?: string | null
          tab_type: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          custom_href?: string | null
          custom_label?: string | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean
          position?: number
          subhead?: string | null
          tab_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "mega_menu_tabs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      navigation_menus: {
        Row: {
          id: string
          items: Json
          label: string | null
          location: string
          updated_at: string
        }
        Insert: {
          id?: string
          items?: Json
          label?: string | null
          location: string
          updated_at?: string
        }
        Update: {
          id?: string
          items?: Json
          label?: string | null
          location?: string
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          attempts: number
          created_at: string
          error_text: string | null
          id: string
          idempotency_key: string | null
          max_attempts: number
          next_retry_at: string
          order_id: string | null
          status: string
          template_name: string
          to_phone: string
          trigger_type: string
          updated_at: string
          user_id: string | null
          variables: Json
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_text?: string | null
          id?: string
          idempotency_key?: string | null
          max_attempts?: number
          next_retry_at?: string
          order_id?: string | null
          status?: string
          template_name: string
          to_phone: string
          trigger_type: string
          updated_at?: string
          user_id?: string | null
          variables?: Json
        }
        Update: {
          attempts?: number
          created_at?: string
          error_text?: string | null
          id?: string
          idempotency_key?: string | null
          max_attempts?: number
          next_retry_at?: string
          order_id?: string | null
          status?: string
          template_name?: string
          to_phone?: string
          trigger_type?: string
          updated_at?: string
          user_id?: string | null
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body_text: string
          created_at: string
          id: string
          is_active: boolean
          language: string
          name: string
          provider_template_id: string | null
          trigger_type: string
          updated_at: string
          variables: string[]
        }
        Insert: {
          body_text: string
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string
          name: string
          provider_template_id?: string | null
          trigger_type: string
          updated_at?: string
          variables?: string[]
        }
        Update: {
          body_text?: string
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string
          name?: string
          provider_template_id?: string | null
          trigger_type?: string
          updated_at?: string
          variables?: string[]
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          image: string | null
          order_id: string
          price_at_purchase: number
          product_name: string
          quantity: number
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          id?: string
          image?: string | null
          order_id: string
          price_at_purchase: number
          product_name: string
          quantity: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          id?: string
          image?: string | null
          order_id?: string
          price_at_purchase?: number
          product_name?: string
          quantity?: number
          variant_id?: string | null
          variant_label?: string | null
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
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          awb_number: string | null
          cod_advance_amount: number | null
          cod_advance_paid: boolean
          coupon_code: string | null
          courier_name: string | null
          created_at: string
          delivered_at: string | null
          discount: number
          email: string
          id: string
          notes: string | null
          order_number: string
          payment_amount_paise: number | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          pickup_scheduled_at: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_refund_id: string | null
          refund_amount: number
          refund_notes: string | null
          refund_status: Database["public"]["Enums"]["refund_status"]
          refunded_at: string | null
          replacement_of: string | null
          replacement_order_id: string | null
          return_awb: string | null
          return_reason: string | null
          return_received_at: string | null
          return_requested_at: string | null
          return_shipment_id: string | null
          return_shiprocket_order_id: string | null
          return_status: Database["public"]["Enums"]["return_status"]
          return_tracking_url: string | null
          rto_initiated_at: string | null
          shipment_id: string | null
          shipped_at: string | null
          shipping: number
          shipping_address: Json
          shipping_error: string | null
          shipping_status: string | null
          shiprocket_cancelled_at: string | null
          shiprocket_order_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          stock_committed: boolean
          subtotal: number
          total: number
          tracking_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          awb_number?: string | null
          cod_advance_amount?: number | null
          cod_advance_paid?: boolean
          coupon_code?: string | null
          courier_name?: string | null
          created_at?: string
          delivered_at?: string | null
          discount?: number
          email: string
          id?: string
          notes?: string | null
          order_number?: string
          payment_amount_paise?: number | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_scheduled_at?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_refund_id?: string | null
          refund_amount?: number
          refund_notes?: string | null
          refund_status?: Database["public"]["Enums"]["refund_status"]
          refunded_at?: string | null
          replacement_of?: string | null
          replacement_order_id?: string | null
          return_awb?: string | null
          return_reason?: string | null
          return_received_at?: string | null
          return_requested_at?: string | null
          return_shipment_id?: string | null
          return_shiprocket_order_id?: string | null
          return_status?: Database["public"]["Enums"]["return_status"]
          return_tracking_url?: string | null
          rto_initiated_at?: string | null
          shipment_id?: string | null
          shipped_at?: string | null
          shipping?: number
          shipping_address: Json
          shipping_error?: string | null
          shipping_status?: string | null
          shiprocket_cancelled_at?: string | null
          shiprocket_order_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stock_committed?: boolean
          subtotal: number
          total: number
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          awb_number?: string | null
          cod_advance_amount?: number | null
          cod_advance_paid?: boolean
          coupon_code?: string | null
          courier_name?: string | null
          created_at?: string
          delivered_at?: string | null
          discount?: number
          email?: string
          id?: string
          notes?: string | null
          order_number?: string
          payment_amount_paise?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_scheduled_at?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_refund_id?: string | null
          refund_amount?: number
          refund_notes?: string | null
          refund_status?: Database["public"]["Enums"]["refund_status"]
          refunded_at?: string | null
          replacement_of?: string | null
          replacement_order_id?: string | null
          return_awb?: string | null
          return_reason?: string | null
          return_received_at?: string | null
          return_requested_at?: string | null
          return_shipment_id?: string | null
          return_shiprocket_order_id?: string | null
          return_status?: Database["public"]["Enums"]["return_status"]
          return_tracking_url?: string | null
          rto_initiated_at?: string | null
          shipment_id?: string | null
          shipped_at?: string | null
          shipping?: number
          shipping_address?: Json
          shipping_error?: string | null
          shipping_status?: string | null
          shiprocket_cancelled_at?: string | null
          shiprocket_order_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stock_committed?: boolean
          subtotal?: number
          total?: number
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_replacement_of_fkey"
            columns: ["replacement_of"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_replacement_order_id_fkey"
            columns: ["replacement_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      preloader_settings: {
        Row: {
          bg_image_url: string | null
          bg_type: string
          bg_video_url: string | null
          content_image_url: string | null
          content_text: string
          content_type: string
          created_at: string
          duration_ms: number
          id: string
          text_color: string
          updated_at: string
        }
        Insert: {
          bg_image_url?: string | null
          bg_type?: string
          bg_video_url?: string | null
          content_image_url?: string | null
          content_text?: string
          content_type?: string
          created_at?: string
          duration_ms?: number
          id?: string
          text_color?: string
          updated_at?: string
        }
        Update: {
          bg_image_url?: string | null
          bg_type?: string
          bg_video_url?: string | null
          content_image_url?: string | null
          content_text?: string
          content_type?: string
          created_at?: string
          duration_ms?: number
          id?: string
          text_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          category_id: string
          product_id: string
        }
        Insert: {
          category_id: string
          product_id: string
        }
        Update: {
          category_id?: string
          product_id?: string
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          color: string | null
          color_hex: string | null
          compare_price: number | null
          created_at: string
          id: string
          price: number
          product_id: string
          size: string | null
          sku: string | null
          stock: number
        }
        Insert: {
          color?: string | null
          color_hex?: string | null
          compare_price?: number | null
          created_at?: string
          id?: string
          price: number
          product_id: string
          size?: string | null
          sku?: string | null
          stock?: number
        }
        Update: {
          color?: string | null
          color_hex?: string | null
          compare_price?: number | null
          created_at?: string
          id?: string
          price?: number
          product_id?: string
          size?: string | null
          sku?: string | null
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string | null
          care: string | null
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          images: string[]
          is_active: boolean
          is_featured: boolean
          material: string | null
          name: string
          slug: string
          videos: string[]
        }
        Insert: {
          brand_id?: string | null
          care?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[]
          is_active?: boolean
          is_featured?: boolean
          material?: string | null
          name: string
          slug: string
          videos?: string[]
        }
        Update: {
          brand_id?: string | null
          care?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[]
          is_active?: boolean
          is_featured?: boolean
          material?: string | null
          name?: string
          slug?: string
          videos?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          id: string
          key: string
          request_count: number
          window_start: string
        }
        Insert: {
          id?: string
          key: string
          request_count?: number
          window_start?: string
        }
        Update: {
          id?: string
          key?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      seo_settings: {
        Row: {
          canonical_url: string | null
          description: string | null
          id: string
          no_index: boolean
          og_description: string | null
          og_image: string | null
          og_title: string | null
          page_slug: string
          structured_data: Json | null
          title: string | null
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          description?: string | null
          id?: string
          no_index?: boolean
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          page_slug: string
          structured_data?: Json | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          description?: string | null
          id?: string
          no_index?: boolean
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          page_slug?: string
          structured_data?: Json | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      sizes: {
        Row: {
          category_id: string
          created_at: string
          id: string
          label: string
          position: number
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          label: string
          position?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          label?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "sizes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          avatar: string | null
          body: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          position: number
          rating: number
          role: string | null
        }
        Insert: {
          avatar?: string | null
          body: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          position?: number
          rating?: number
          role?: string | null
        }
        Update: {
          avatar?: string | null
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          position?: number
          rating?: number
          role?: string | null
        }
        Relationships: []
      }
      theme_settings: {
        Row: {
          accent_color: string
          animations_enabled: boolean
          border_radius: string
          custom_css: string | null
          font_display: string
          font_elegant: string
          font_ui: string
          id: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          animations_enabled?: boolean
          border_radius?: string
          custom_css?: string | null
          font_display?: string
          font_elegant?: string
          font_ui?: string
          id?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          animations_enabled?: boolean
          border_radius?: string
          custom_css?: string | null
          font_display?: string
          font_elegant?: string
          font_ui?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      website_sections: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_locked: boolean
          is_visible: boolean
          label: string | null
          page_slug: string
          position: number
          section_type: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_locked?: boolean
          is_visible?: boolean
          label?: string | null
          page_slug?: string
          position?: number
          section_type: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_locked?: boolean
          is_visible?: boolean
          label?: string | null
          page_slug?: string
          position?: number
          section_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_logs: {
        Row: {
          created_at: string
          delivered_at: string | null
          error_text: string | null
          id: string
          order_id: string | null
          provider: string
          provider_message_id: string | null
          read_at: string | null
          sent_at: string | null
          status: string
          template_name: string
          to_phone: string
          trigger_type: string
          user_id: string | null
          variables: Json
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          error_text?: string | null
          id?: string
          order_id?: string | null
          provider?: string
          provider_message_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string
          template_name: string
          to_phone: string
          trigger_type: string
          user_id?: string | null
          variables?: Json
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          error_text?: string | null
          id?: string
          order_id?: string | null
          provider?: string
          provider_message_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string
          template_name?: string
          to_phone?: string
          trigger_type?: string
          user_id?: string | null
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_stock: {
        Args: { p_delta: number; p_reason: string; p_variant_id: string }
        Returns: number
      }
      call_shipping_function: {
        Args: { p_function: string; p_order_id: string }
        Returns: undefined
      }
      check_rate_limit: {
        Args: {
          p_key: string
          p_max_requests?: number
          p_window_seconds?: number
        }
        Returns: boolean
      }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      confirm_order_payment: {
        Args: {
          p_amount_paise: number
          p_order_id: string
          p_payment_id: string
        }
        Returns: Json
      }
      create_order: {
        Args: {
          p_coupon_code?: string
          p_email: string
          p_items: Json
          p_payment_method?: string
          p_shipping_address: Json
          p_user_id: string
        }
        Returns: Json
      }
      create_replacement_order: {
        Args: { p_order_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      save_product: {
        Args: { p_product: Json; p_variants: Json }
        Returns: string
      }
      save_product_core: {
        Args: { p_product: Json; p_variants: Json }
        Returns: string
      }
      save_product_extra_categories: {
        Args: { p_product: Json; p_product_id: string }
        Returns: undefined
      }
      set_stock_context: {
        Args: { p_order?: string; p_reason: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "customer"
      coupon_type: "PERCENT" | "FLAT"
      order_status: "PENDING" | "PACKED" | "SHIPPED" | "DELIVERED" | "CANCELLED"
      payment_method: "RAZORPAY" | "COD"
      payment_status: "PENDING" | "PAID" | "FAILED" | "REFUNDED"
      refund_status:
        | "NONE"
        | "REQUESTED"
        | "PROCESSING"
        | "REFUNDED"
        | "REJECTED"
      return_status:
        | "NONE"
        | "REQUESTED"
        | "PICKUP_SCHEDULED"
        | "IN_TRANSIT"
        | "RECEIVED"
        | "REFUNDED"
        | "REPLACED"
        | "REJECTED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "customer"],
      coupon_type: ["PERCENT", "FLAT"],
      order_status: ["PENDING", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"],
      payment_method: ["RAZORPAY", "COD"],
      payment_status: ["PENDING", "PAID", "FAILED", "REFUNDED"],
      refund_status: [
        "NONE",
        "REQUESTED",
        "PROCESSING",
        "REFUNDED",
        "REJECTED",
      ],
      return_status: [
        "NONE",
        "REQUESTED",
        "PICKUP_SCHEDULED",
        "IN_TRANSIT",
        "RECEIVED",
        "REFUNDED",
        "REPLACED",
        "REJECTED",
      ],
    },
  },
} as const
