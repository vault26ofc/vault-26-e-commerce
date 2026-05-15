import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  order_id: string | null;
  is_read: boolean;
  created_at: string;
}

export default function AdminNotifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);
    setItems((data as any) || []);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`admin-notifications-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_notifications' }, (payload) => {
        setItems((prev) => [payload.new as Notification, ...prev].slice(0, 30));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const unread = items.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    const ids = items.filter((n) => !n.is_read).map((n) => n.id);
    if (ids.length === 0) return;
    await supabase.from('admin_notifications').update({ is_read: true }).in('id', ids);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const markRead = async (id: string) => {
    await supabase.from('admin_notifications').update({ is_read: true }).eq('id', id);
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 hover:bg-sidebar-accent/50 rounded transition-colors text-sidebar-foreground" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="font-medium text-sm">Notifications</div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
              <Check className="h-3 w-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</div>}
          {items.map((n) => {
            const inner = (
              <div className={cn('px-4 py-3 border-b border-border hover:bg-secondary cursor-pointer', !n.is_read && 'bg-accent/5')}>
                <div className="flex items-start gap-2">
                  {!n.is_read && <span className="mt-1.5 w-2 h-2 rounded-full bg-accent flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{n.title}</div>
                    {n.message && <div className="text-xs text-muted-foreground mt-0.5">{n.message}</div>}
                    <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            );
            const handleClick = () => { markRead(n.id); setOpen(false); };
            return n.order_id ? (
              <Link key={n.id} to="/admin/orders" onClick={handleClick}>{inner}</Link>
            ) : (
              <div key={n.id} onClick={handleClick}>{inner}</div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
