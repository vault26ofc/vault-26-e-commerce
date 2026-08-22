export type TriggerType =
  | 'order_placed' | 'order_confirmed' | 'order_shipped' | 'order_delivered' | 'order_cancelled'
  | 'cod_verification' | 'payment_success' | 'payment_failed'
  | 'refund_initiated' | 'refund_completed'
  | 'abandoned_cart_1h' | 'abandoned_cart_24h' | 'abandoned_cart_48h'
  | 'wishlist_reminder' | 'back_in_stock' | 'new_arrivals'
  | 'marketing_campaign' | 'admin_new_order';

export type MessageStatus = 'pending' | 'processing' | 'sent' | 'delivered' | 'failed' | 'dead' | 'read';
export type QueueStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'dead';
export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'completed' | 'cancelled';
export type ProviderType = 'meta' | 'interakt' | 'twilio' | 'gupshup' | 'mock';

export interface TemplateVariables {
  customer_name?: string;
  order_number?: string;
  order_total?: string;
  order_status?: string;
  product_names?: string;
  tracking_link?: string;
  store_name?: string;
  cta_link?: string;
  discount_code?: string;
  cart_value?: string;
  item_count?: string;
  refund_amount?: string;
  [key: string]: string | undefined;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WhatsAppMessage {
  to: string;
  templateName: string;
  variables: TemplateVariables;
  triggerType: TriggerType;
  orderId?: string;
  userId?: string;
  idempotencyKey?: string;
}

export interface QueueEntry {
  id: string;
  to_phone: string;
  user_id?: string;
  order_id?: string;
  trigger_type: TriggerType;
  template_name: string;
  variables: string[];
  status: QueueStatus;
  attempts: number;
  max_attempts: number;
  next_retry_at: string;
  error_text?: string;
  idempotency_key?: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppLog {
  id: string;
  to_phone: string;
  user_id?: string;
  order_id?: string;
  trigger_type: TriggerType;
  template_name: string;
  variables: string[];
  provider: ProviderType;
  provider_message_id?: string;
  status: MessageStatus;
  error_text?: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  created_at: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  trigger_type: TriggerType;
  provider_template_id?: string;
  language: string;
  body_text: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerPreferences {
  id: string;
  user_id: string;
  phone?: string;
  marketing_opted_in: boolean;
  transactional_opted_in: boolean;
  unsubscribed: boolean;
  unsubscribed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  template_name: string;
  variables: Record<string, string>;
  status: CampaignStatus;
  target_segment: string;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AbandonedCart {
  id: string;
  cart_id?: string;
  user_id?: string;
  phone?: string;
  email?: string;
  cart_value?: number;
  item_count?: number;
  last_activity_at: string;
  notified_at_1h: boolean;
  notified_at_24h: boolean;
  notified_at_48h: boolean;
  recovered: boolean;
  recovered_at?: string;
  created_at: string;
}

export interface QueueStats {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  dead: number;
}
