import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { resendQueueEntry, getQueueStats } from '@/lib/whatsapp/service';
import type {
  WhatsAppLog,
  QueueEntry,
  NotificationTemplate,
  MarketingCampaign,
  CustomerPreferences,
  QueueStats,
  MessageStatus,
  TriggerType,
} from '@/lib/whatsapp/types';

export function useWhatsAppLogs(limit = 100) {
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('whatsapp_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    setLogs((data as WhatsAppLog[]) ?? []);
    setLoading(false);
  }, [limit]);

  useEffect(() => { fetch(); }, [fetch]);

  return { logs, loading, refresh: fetch };
}

export function useNotificationQueue(limit = 100) {
  const [items, setItems] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('notification_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    setItems((data as QueueEntry[]) ?? []);
    setLoading(false);
  }, [limit]);

  useEffect(() => { fetch(); }, [fetch]);

  const resend = useCallback(async (id: string) => {
    await resendQueueEntry(id);
    await fetch();
  }, [fetch]);

  return { items, loading, refresh: fetch, resend };
}

export function useQueueStats() {
  const [stats, setStats] = useState<QueueStats>({ pending: 0, processing: 0, sent: 0, failed: 0, dead: 0 });
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const s = await getQueueStats();
    setStats(s);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { stats, loading, refresh: fetch };
}

export function useNotificationTemplates() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('notification_templates')
      .select('*')
      .order('trigger_type');
    setTemplates((data as NotificationTemplate[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const toggle = useCallback(async (id: string, active: boolean) => {
    await supabase.from('notification_templates').update({ is_active: active }).eq('id', id);
    await fetch();
  }, [fetch]);

  const update = useCallback(async (id: string, patch: Partial<NotificationTemplate>) => {
    await supabase.from('notification_templates').update(patch).eq('id', id);
    await fetch();
  }, [fetch]);

  return { templates, loading, refresh: fetch, toggle, update };
}

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    setCampaigns((data as MarketingCampaign[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const cancel = useCallback(async (id: string) => {
    await supabase.from('marketing_campaigns').update({ status: 'cancelled' }).eq('id', id);
    await fetch();
  }, [fetch]);

  return { campaigns, loading, refresh: fetch, cancel };
}

export function useCustomerPreferences(limit = 200) {
  const [prefs, setPrefs] = useState<CustomerPreferences[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('customer_notification_preferences')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    setPrefs((data as CustomerPreferences[]) ?? []);
    setLoading(false);
  }, [limit]);

  useEffect(() => { fetch(); }, [fetch]);

  return { prefs, loading, refresh: fetch };
}
