import { useState } from 'react';
import { MessageCircle, RefreshCw, Send, CheckCircle2, XCircle, Clock, Inbox, BarChart3, Settings, Users, FileText, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useWhatsAppLogs,
  useNotificationQueue,
  useQueueStats,
  useNotificationTemplates,
  useCampaigns,
  useCustomerPreferences,
} from '@/hooks/useWhatsApp';
import type { WhatsAppLog, QueueEntry, NotificationTemplate, MarketingCampaign } from '@/lib/whatsapp/types';

const TABS = [
  { id: 'logs', label: 'Message Logs', icon: Inbox },
  { id: 'queue', label: 'Queue', icon: Clock },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

type TabId = typeof TABS[number]['id'];

const STATUS_COLORS: Record<string, string> = {
  sent: 'text-green-600 bg-green-50',
  delivered: 'text-blue-600 bg-blue-50',
  read: 'text-purple-600 bg-purple-50',
  failed: 'text-red-600 bg-red-50',
  dead: 'text-gray-500 bg-gray-100',
  pending: 'text-yellow-600 bg-yellow-50',
  processing: 'text-blue-500 bg-blue-50',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('text-[9px] tracking-widest uppercase font-bold px-2 py-0.5 rounded', STATUS_COLORS[status] ?? 'text-gray-500 bg-gray-100')}>
      {status}
    </span>
  );
}

function LogsTab() {
  const { logs, loading, refresh } = useWhatsAppLogs();
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? logs : logs.filter((l) => l.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2 flex-wrap">
          {['all', 'sent', 'delivered', 'read', 'failed'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn('text-[9px] tracking-widest uppercase font-bold px-3 py-1.5 border transition-colors', filter === s ? 'bg-black text-white border-black' : 'border-black/10 hover:border-black')}
            >
              {s}
            </button>
          ))}
        </div>
        <button onClick={refresh} className="p-2 hover:bg-muted rounded transition-colors">
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm">No messages found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] font-ui">
            <thead>
              <tr className="border-b border-black/5">
                {['Phone', 'Template', 'Trigger', 'Provider', 'Status', 'Sent At'].map((h) => (
                  <th key={h} className="text-left py-3 px-3 text-[9px] tracking-widest uppercase font-bold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="border-b border-black/5 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-3 font-mono">{log.to_phone}</td>
                  <td className="py-3 px-3 max-w-[160px] truncate">{log.template_name}</td>
                  <td className="py-3 px-3 text-muted-foreground">{log.trigger_type}</td>
                  <td className="py-3 px-3 text-muted-foreground">{log.provider}</td>
                  <td className="py-3 px-3"><StatusBadge status={log.status} /></td>
                  <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                    {log.sent_at ? new Date(log.sent_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function QueueTab() {
  const { items, loading, refresh, resend } = useNotificationQueue();
  const { stats } = useQueueStats();
  const [resending, setResending] = useState<string | null>(null);

  const handleResend = async (id: string) => {
    setResending(id);
    await resend(id);
    setResending(null);
    toast.success('Queued for retry');
  };

  return (
    <div>
      <div className="grid grid-cols-5 gap-4 mb-8">
        {(['pending', 'processing', 'sent', 'failed', 'dead'] as const).map((s) => (
          <div key={s} className="border border-black/5 p-4 text-center">
            <div className="text-2xl font-bold font-ui">{stats[s]}</div>
            <div className="text-[9px] tracking-widest uppercase font-bold text-muted-foreground mt-1">{s}</div>
          </div>
        ))}
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={refresh} className="p-2 hover:bg-muted rounded transition-colors">
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm">Queue is empty.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] font-ui">
            <thead>
              <tr className="border-b border-black/5">
                {['Phone', 'Template', 'Trigger', 'Status', 'Attempts', 'Next Retry', 'Error', ''].map((h) => (
                  <th key={h} className="text-left py-3 px-3 text-[9px] tracking-widest uppercase font-bold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-black/5 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-3 font-mono">{item.to_phone}</td>
                  <td className="py-3 px-3 max-w-[140px] truncate">{item.template_name}</td>
                  <td className="py-3 px-3 text-muted-foreground">{item.trigger_type}</td>
                  <td className="py-3 px-3"><StatusBadge status={item.status} /></td>
                  <td className="py-3 px-3 text-center">{item.attempts}/{item.max_attempts}</td>
                  <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                    {new Date(item.next_retry_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-red-500 max-w-[160px] truncate">{item.error_text ?? '—'}</td>
                  <td className="py-3 px-3">
                    {(item.status === 'failed' || item.status === 'dead') && (
                      <button
                        onClick={() => handleResend(item.id)}
                        disabled={resending === item.id}
                        className="text-[9px] tracking-widest uppercase font-bold px-3 py-1.5 border border-black/10 hover:border-black transition-colors disabled:opacity-40"
                      >
                        {resending === item.id ? '…' : 'Retry'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TemplatesTab() {
  const { templates, loading, refresh, toggle, update } = useNotificationTemplates();
  const [editing, setEditing] = useState<NotificationTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    await update(editing.id, {
      body_text: editing.body_text,
      provider_template_id: editing.provider_template_id,
    });
    setSaving(false);
    setEditing(null);
    toast.success('Template saved');
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={refresh} className="p-2 hover:bg-muted rounded transition-colors">
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </button>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg p-8 space-y-4">
            <h3 className="text-[11px] tracking-widest uppercase font-bold">{editing.trigger_type}</h3>
            <div>
              <label className="text-[9px] tracking-widest uppercase font-bold text-muted-foreground block mb-1">Provider Template ID</label>
              <input
                value={editing.provider_template_id ?? ''}
                onChange={(e) => setEditing({ ...editing, provider_template_id: e.target.value })}
                className="w-full border-b border-black/10 bg-transparent py-2 text-sm outline-none focus:border-black"
                placeholder="e.g. order_placed_v1"
              />
            </div>
            <div>
              <label className="text-[9px] tracking-widest uppercase font-bold text-muted-foreground block mb-1">Body Preview</label>
              <textarea
                value={editing.body_text}
                onChange={(e) => setEditing({ ...editing, body_text: e.target.value })}
                rows={5}
                className="w-full border border-black/10 bg-transparent p-3 text-sm outline-none focus:border-black resize-none"
              />
            </div>
            <div className="text-[9px] text-muted-foreground">Variables: {editing.variables.join(', ')}</div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditing(null)} className="flex-1 border border-black/10 py-3 text-[10px] tracking-widest uppercase font-bold hover:border-black transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-black text-white py-3 text-[10px] tracking-widest uppercase font-bold hover:bg-accent transition-colors disabled:opacity-40">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-muted-foreground text-sm">Loading…</div>
      ) : (
        <div className="space-y-2">
          {templates.map((tpl) => (
            <div key={tpl.id} className="flex items-start gap-4 p-4 border border-black/5 hover:border-black/20 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-[10px] tracking-widest uppercase font-bold">{tpl.trigger_type}</span>
                  <StatusBadge status={tpl.is_active ? 'sent' : 'dead'} />
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{tpl.body_text}</p>
                {tpl.provider_template_id && (
                  <p className="text-[9px] text-muted-foreground mt-1 font-mono">{tpl.provider_template_id}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggle(tpl.id, !tpl.is_active)}
                  className={cn('text-[9px] tracking-widest uppercase font-bold px-3 py-1.5 border transition-colors', tpl.is_active ? 'border-black text-black hover:bg-black hover:text-white' : 'border-black/10 text-muted-foreground hover:border-black')}
                >
                  {tpl.is_active ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => setEditing(tpl)}
                  className="text-[9px] tracking-widest uppercase font-bold px-3 py-1.5 border border-black/10 hover:border-black transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignsTab() {
  const { campaigns, loading, refresh, cancel } = useCampaigns();

  const CAMPAIGN_COLORS: Record<string, string> = {
    draft: 'text-gray-500 bg-gray-100',
    scheduled: 'text-blue-600 bg-blue-50',
    running: 'text-yellow-600 bg-yellow-50',
    completed: 'text-green-600 bg-green-50',
    cancelled: 'text-red-600 bg-red-50',
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={refresh} className="p-2 hover:bg-muted rounded transition-colors">
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground text-sm">Loading…</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm">No campaigns yet.</div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <div key={c.id} className="p-6 border border-black/5 hover:border-black/20 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[11px] tracking-wider uppercase font-bold">{c.name}</span>
                    <span className={cn('text-[9px] tracking-widest uppercase font-bold px-2 py-0.5 rounded', CAMPAIGN_COLORS[c.status] ?? 'text-gray-500 bg-gray-100')}>
                      {c.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">Template: {c.template_name} · Segment: {c.target_segment}</div>
                  <div className="flex gap-6 text-[10px] font-ui font-bold">
                    <span>Sent <span className="text-foreground">{c.sent_count}</span></span>
                    <span>Delivered <span className="text-foreground">{c.delivered_count}</span></span>
                    <span>Failed <span className="text-foreground">{c.failed_count}</span></span>
                  </div>
                </div>
                {(c.status === 'scheduled' || c.status === 'running') && (
                  <button
                    onClick={() => cancel(c.id)}
                    className="text-[9px] tracking-widest uppercase font-bold px-3 py-1.5 border border-red-200 text-red-500 hover:bg-red-500 hover:text-white transition-colors flex-shrink-0"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab() {
  const { prefs, loading, refresh } = useCustomerPreferences();

  const opted_in = prefs.filter((p) => !p.unsubscribed && p.transactional_opted_in).length;
  const opted_out = prefs.filter((p) => p.unsubscribed).length;

  const envStatus = [
    { label: 'WHATSAPP_ENABLED', hint: 'Set to "true" to activate live sending' },
    { label: 'WHATSAPP_PROVIDER', hint: 'meta | interakt | mock' },
    { label: 'WHATSAPP_ACCESS_TOKEN', hint: 'API access token from provider' },
    { label: 'WHATSAPP_PHONE_NUMBER_ID', hint: 'Meta phone number ID (meta only)' },
    { label: 'WHATSAPP_VERIFY_TOKEN', hint: 'Webhook verification token' },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h3 className="text-[11px] tracking-widest uppercase font-bold mb-4">Environment Variables</h3>
        <div className="space-y-2">
          {envStatus.map((e) => (
            <div key={e.label} className="flex items-center gap-4 p-4 border border-black/5">
              <code className="text-xs font-mono flex-1">{e.label}</code>
              <span className="text-[10px] text-muted-foreground">{e.hint}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          Set these in your Supabase project → Settings → Edge Functions → Secrets, and in Vercel → Environment Variables.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] tracking-widest uppercase font-bold">Customer Preferences</h3>
          <button onClick={refresh} className="p-2 hover:bg-muted rounded transition-colors">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="border border-black/5 p-4 text-center">
            <div className="text-2xl font-bold font-ui">{prefs.length}</div>
            <div className="text-[9px] tracking-widest uppercase font-bold text-muted-foreground mt-1">Total</div>
          </div>
          <div className="border border-black/5 p-4 text-center">
            <div className="text-2xl font-bold font-ui text-green-600">{opted_in}</div>
            <div className="text-[9px] tracking-widest uppercase font-bold text-muted-foreground mt-1">Opted In</div>
          </div>
          <div className="border border-black/5 p-4 text-center">
            <div className="text-2xl font-bold font-ui text-red-500">{opted_out}</div>
            <div className="text-[9px] tracking-widest uppercase font-bold text-muted-foreground mt-1">Opted Out</div>
          </div>
        </div>

        {!loading && prefs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-ui">
              <thead>
                <tr className="border-b border-black/5">
                  {['User ID', 'Phone', 'Marketing', 'Transactional', 'Unsubscribed'].map((h) => (
                    <th key={h} className="text-left py-3 px-3 text-[9px] tracking-widest uppercase font-bold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prefs.slice(0, 50).map((p) => (
                  <tr key={p.id} className="border-b border-black/5 hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-3 font-mono text-muted-foreground max-w-[120px] truncate">{p.user_id}</td>
                    <td className="py-2 px-3 font-mono">{p.phone ?? '—'}</td>
                    <td className="py-2 px-3"><StatusBadge status={p.marketing_opted_in ? 'sent' : 'failed'} /></td>
                    <td className="py-2 px-3"><StatusBadge status={p.transactional_opted_in ? 'sent' : 'failed'} /></td>
                    <td className="py-2 px-3"><StatusBadge status={p.unsubscribed ? 'dead' : 'sent'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminWhatsApp() {
  const [tab, setTab] = useState<TabId>('logs');
  const { stats } = useQueueStats();

  return (
    <div>
      <div className="mb-8">
        <span className="eyebrow block mb-2">Automation</span>
        <h1 className="display-2 text-2xl md:text-3xl">WhatsApp</h1>
      </div>

      <div className="flex gap-1 border-b border-black/5 mb-8 overflow-x-auto scrollbar-hide">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-[10px] tracking-widest uppercase font-bold whitespace-nowrap transition-colors border-b-2',
              tab === t.id ? 'border-black text-black' : 'border-transparent text-muted-foreground hover:text-black'
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            {t.id === 'queue' && stats.failed > 0 && (
              <span className="bg-red-500 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center">{stats.failed}</span>
            )}
          </button>
        ))}
      </div>

      <div>
        {tab === 'logs' && <LogsTab />}
        {tab === 'queue' && <QueueTab />}
        {tab === 'templates' && <TemplatesTab />}
        {tab === 'campaigns' && <CampaignsTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}
