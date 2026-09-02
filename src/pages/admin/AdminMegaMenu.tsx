import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronUp, ChevronDown, X, Upload, Pencil } from 'lucide-react';

// No shared upload hook exists in this codebase yet (@/lib/useCloudinaryUpload is not
// implemented) — this mirrors the inline Cloudinary upload used in AdminProducts.tsx so this
// page works today. Swap for a real useCloudinaryUpload() import if/when one lands.
async function uploadToCloudinary(file: File, folder: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', folder);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );
  if (!res.ok) throw new Error('Upload failed');
  const data = await res.json();
  return data.secure_url as string;
}

type Category = { id: string; name: string };
type Tab = {
  id: string;
  tab_type: 'category' | 'custom';
  category_id: string | null;
  custom_label: string | null;
  custom_href: string | null;
  hero_image_url: string | null;
  subhead: string | null;
  position: number;
  is_active: boolean;
};
type Group = { id: string; tab_id: string; heading: string; position: number };
type LinkRow = {
  id: string;
  group_id: string;
  link_type: 'category' | 'custom';
  category_id: string | null;
  custom_label: string | null;
  custom_href: string | null;
  hover_image_url: string | null;
  position: number;
};

export default function AdminMegaMenu() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [editingTab, setEditingTab] = useState<Partial<Tab> | null>(null);
  const [savingTab, setSavingTab] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const [{ data: cats }, { data: t }, { data: g }, { data: l }] = await Promise.all([
      supabase.from('categories').select('id, name').order('name'),
      supabase.from('mega_menu_tabs' as any).select('*').order('position'),
      supabase.from('mega_menu_groups' as any).select('*').order('position'),
      supabase.from('mega_menu_links' as any).select('*').order('position'),
    ]);
    setCategories(cats || []);
    setTabs((t as unknown as Tab[]) || []);
    setGroups((g as unknown as Group[]) || []);
    setLinks((l as unknown as LinkRow[]) || []);
  };

  useEffect(() => { load(); }, []);

  const tabLabel = (tab: Tab) =>
    tab.tab_type === 'category'
      ? categories.find((c) => c.id === tab.category_id)?.name || '(deleted category)'
      : tab.custom_label || '';

  const usedCategoryIds = new Set(tabs.filter((t) => t.tab_type === 'category').map((t) => t.category_id));
  const availableForTab = categories.filter((c) => !usedCategoryIds.has(c.id));

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const addCategoryTab = async (categoryId: string) => {
    const maxPos = tabs.reduce((m, t) => Math.max(m, t.position), -1);
    const { error } = await supabase.from('mega_menu_tabs' as any).insert({
      tab_type: 'category', category_id: categoryId, position: maxPos + 1,
    });
    if (error) return toast.error(error.message);
    toast.success('Tab added');
    load();
  };

  const addCustomTab = () => setEditingTab({ tab_type: 'custom', is_active: true });

  const saveTab = async () => {
    if (!editingTab) return;
    if (editingTab.tab_type === 'custom') {
      if (!editingTab.custom_label?.trim()) return toast.error('Label required');
      if (!editingTab.custom_href?.trim()) return toast.error('Link required');
    }
    setSavingTab(true);
    const payload = {
      hero_image_url: editingTab.hero_image_url || null,
      subhead: editingTab.subhead || null,
      is_active: editingTab.is_active ?? true,
      ...(editingTab.tab_type === 'custom'
        ? { custom_label: editingTab.custom_label, custom_href: editingTab.custom_href }
        : {}),
    };
    if (editingTab.id) {
      const { error } = await supabase.from('mega_menu_tabs' as any).update(payload).eq('id', editingTab.id);
      setSavingTab(false);
      if (error) return toast.error(error.message);
    } else {
      const maxPos = tabs.reduce((m, t) => Math.max(m, t.position), -1);
      const { error } = await supabase.from('mega_menu_tabs' as any).insert({
        tab_type: 'custom', position: maxPos + 1, ...payload,
      });
      setSavingTab(false);
      if (error) return toast.error(error.message);
    }
    toast.success('Saved');
    setEditingTab(null);
    load();
  };

  const removeTab = async (id: string) => {
    if (!confirm('Remove this tab and all its groups/links?')) return;
    const { error } = await supabase.from('mega_menu_tabs' as any).delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Tab removed');
    if (activeTabId === id) setActiveTabId('');
    load();
  };

  const moveTab = async (tab: Tab, dir: 'up' | 'down') => {
    const idx = tabs.findIndex((t) => t.id === tab.id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= tabs.length) return;
    const swap = tabs[swapIdx];
    await Promise.all([
      supabase.from('mega_menu_tabs' as any).update({ position: swap.position }).eq('id', tab.id),
      supabase.from('mega_menu_tabs' as any).update({ position: tab.position }).eq('id', swap.id),
    ]);
    load();
  };

  const toggleTabActive = async (tab: Tab) => {
    await supabase.from('mega_menu_tabs' as any).update({ is_active: !tab.is_active }).eq('id', tab.id);
    load();
  };

  const handleHeroUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, 'vault26/mega-menu');
      setEditingTab((prev) => ({ ...prev, hero_image_url: url }));
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // ── Groups ────────────────────────────────────────────────────────────────
  const tabGroups = groups.filter((g) => g.tab_id === activeTabId);

  const addGroup = async () => {
    const heading = prompt('Group heading (e.g. NEW IN)');
    if (!heading?.trim()) return;
    const maxPos = tabGroups.reduce((m, g) => Math.max(m, g.position), -1);
    const { error } = await supabase.from('mega_menu_groups' as any).insert({
      tab_id: activeTabId, heading: heading.trim(), position: maxPos + 1,
    });
    if (error) return toast.error(error.message);
    load();
  };

  const removeGroup = async (id: string) => {
    if (!confirm('Remove this group and all its links?')) return;
    const { error } = await supabase.from('mega_menu_groups' as any).delete().eq('id', id);
    if (error) return toast.error(error.message);
    load();
  };

  const moveGroup = async (group: Group, dir: 'up' | 'down') => {
    const idx = tabGroups.findIndex((g) => g.id === group.id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= tabGroups.length) return;
    const swap = tabGroups[swapIdx];
    await Promise.all([
      supabase.from('mega_menu_groups' as any).update({ position: swap.position }).eq('id', group.id),
      supabase.from('mega_menu_groups' as any).update({ position: group.position }).eq('id', swap.id),
    ]);
    load();
  };

  // ── Links ─────────────────────────────────────────────────────────────────
  const groupLinks = (groupId: string) => links.filter((l) => l.group_id === groupId);

  const addCategoryLink = async (groupId: string, categoryId: string) => {
    const existing = groupLinks(groupId);
    const maxPos = existing.reduce((m, l) => Math.max(m, l.position), -1);
    const { error } = await supabase.from('mega_menu_links' as any).insert({
      group_id: groupId, link_type: 'category', category_id: categoryId, position: maxPos + 1,
    });
    if (error) return toast.error(error.message);
    load();
  };

  const addCustomLink = async (groupId: string) => {
    const label = prompt('Link label');
    if (!label?.trim()) return;
    const href = prompt('Link URL (e.g. /about)');
    if (!href?.trim()) return;
    const existing = groupLinks(groupId);
    const maxPos = existing.reduce((m, l) => Math.max(m, l.position), -1);
    const { error } = await supabase.from('mega_menu_links' as any).insert({
      group_id: groupId, link_type: 'custom', custom_label: label.trim(), custom_href: href.trim(), position: maxPos + 1,
    });
    if (error) return toast.error(error.message);
    load();
  };

  const removeLink = async (id: string) => {
    const { error } = await supabase.from('mega_menu_links' as any).delete().eq('id', id);
    if (error) return toast.error(error.message);
    load();
  };

  const handleLinkHoverUpload = async (linkId: string, file: File) => {
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, 'vault26/mega-menu');
      const { error } = await supabase.from('mega_menu_links' as any).update({ hover_image_url: url }).eq('id', linkId);
      if (error) return toast.error(error.message);
      load();
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const linkLabel = (link: LinkRow) =>
    link.link_type === 'category'
      ? categories.find((c) => c.id === link.category_id)?.name || '(deleted category)'
      : link.custom_label || '';

  return (
    <div>
      <h1 className="font-display text-2xl md:text-3xl mb-2">Mega Menu</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Controls the full-screen navigation menu on the storefront — tabs, heading groups,
        sublinks, hero image and subhead per tab, and hover images per link.
      </p>

      <div className="border border-border mb-6">
        <div className="p-4 flex items-center justify-between border-b border-border">
          <div className="eyebrow">Tabs</div>
          <div className="flex items-center gap-2">
            {availableForTab.length > 0 && (
              <select
                onChange={(e) => { if (e.target.value) addCategoryTab(e.target.value); e.target.value = ''; }}
                className="text-xs uppercase tracking-widest border border-border bg-transparent px-2 py-1"
                defaultValue=""
              >
                <option value="" disabled>+ Add category tab</option>
                {availableForTab.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            <button onClick={addCustomTab} className="text-xs uppercase tracking-widest flex items-center gap-1 hover:text-accent">
              <Plus className="h-3 w-3" /> Custom tab
            </button>
          </div>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {tabs.map((tab, i) => (
              <tr
                key={tab.id}
                className={`border-t border-border cursor-pointer ${activeTabId === tab.id ? 'bg-secondary' : ''}`}
                onClick={() => setActiveTabId(tab.id)}
              >
                <td className="p-3 font-medium">{tabLabel(tab)}</td>
                <td className="p-3 text-xs uppercase text-muted-foreground">{tab.tab_type}</td>
                <td className="p-3 text-xs">{tab.is_active ? 'Active' : 'Hidden'}</td>
                <td className="p-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => moveTab(tab, 'up')} disabled={i === 0} className="p-1.5 hover:bg-secondary disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                  <button onClick={() => moveTab(tab, 'down')} disabled={i === tabs.length - 1} className="p-1.5 hover:bg-secondary disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                  <button onClick={() => toggleTabActive(tab)} className="text-xs uppercase tracking-widest px-2 hover:text-accent">{tab.is_active ? 'Hide' : 'Show'}</button>
                  <button onClick={() => setEditingTab(tab)} className="p-1.5 hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => removeTab(tab.id)} className="p-1.5 hover:bg-secondary text-destructive"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
            {!tabs.length && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground text-xs">No tabs yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {activeTabId && (
        <div className="border border-border">
          <div className="p-4 flex items-center justify-between border-b border-border">
            <div className="eyebrow">Groups &amp; Links</div>
            <button onClick={addGroup} className="text-xs uppercase tracking-widest flex items-center gap-1 hover:text-accent">
              <Plus className="h-3 w-3" /> Add group
            </button>
          </div>
          <div className="p-4 space-y-6">
            {tabGroups.map((group, gi) => (
              <div key={group.id} className="border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase tracking-widest font-bold">{group.heading}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveGroup(group, 'up')} disabled={gi === 0} className="p-1 hover:bg-secondary disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" /></button>
                    <button onClick={() => moveGroup(group, 'down')} disabled={gi === tabGroups.length - 1} className="p-1 hover:bg-secondary disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" /></button>
                    <button onClick={() => removeGroup(group.id)} className="p-1 hover:bg-secondary text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <ul className="space-y-1 mb-3">
                  {groupLinks(group.id).map((link) => (
                    <li key={link.id} className="flex items-center justify-between text-sm border border-border px-3 py-1.5">
                      <span className="flex items-center gap-2">
                        {link.hover_image_url && <img src={link.hover_image_url} className="h-6 w-6 object-cover" alt="" />}
                        {linkLabel(link)}
                      </span>
                      <span className="flex items-center gap-1">
                        <label className="p-1 hover:bg-secondary cursor-pointer" title="Set hover image">
                          <Upload className="h-3.5 w-3.5" />
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLinkHoverUpload(link.id, f); }} />
                        </label>
                        <button onClick={() => removeLink(link.id)} className="p-1 hover:bg-secondary text-destructive"><X className="h-3.5 w-3.5" /></button>
                      </span>
                    </li>
                  ))}
                  {!groupLinks(group.id).length && <li className="text-xs text-muted-foreground py-2">No links yet.</li>}
                </ul>
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => { if (e.target.value) addCategoryLink(group.id, e.target.value); e.target.value = ''; }}
                    className="text-xs border border-border bg-transparent px-2 py-1"
                    defaultValue=""
                  >
                    <option value="" disabled>+ Category link</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button onClick={() => addCustomLink(group.id)} className="text-xs uppercase tracking-widest hover:text-accent">+ Custom link</button>
                </div>
              </div>
            ))}
            {!tabGroups.length && <p className="text-xs text-muted-foreground text-center py-6">No groups yet — click "Add group" above.</p>}
          </div>
        </div>
      )}

      {editingTab && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditingTab(null)}>
          <div className="bg-background w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-display text-xl">{editingTab.id ? 'Edit' : 'New'} {editingTab.tab_type === 'custom' ? 'Custom' : ''} Tab</h3>
              <button onClick={() => setEditingTab(null)}><X className="h-5 w-5" /></button>
            </div>
            {editingTab.tab_type === 'custom' && (
              <>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground">
                  Label
                  <input value={editingTab.custom_label || ''} onChange={(e) => setEditingTab({ ...editingTab, custom_label: e.target.value })} className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm" autoFocus />
                </label>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground">
                  Link URL
                  <input value={editingTab.custom_href || ''} onChange={(e) => setEditingTab({ ...editingTab, custom_href: e.target.value })} placeholder="/about" className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm" />
                </label>
              </>
            )}
            <label className="border border-dashed border-border flex items-center justify-center h-32 cursor-pointer relative overflow-hidden text-xs uppercase tracking-widest text-muted-foreground">
              {editingTab.hero_image_url ? (
                <img src={editingTab.hero_image_url} className="absolute inset-0 w-full h-full object-cover" alt="" />
              ) : uploading ? 'Uploading…' : (<><Upload className="h-5 w-5 mr-2" /> Hero image</>)}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleHeroUpload(f); }} />
            </label>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground">
              Subhead
              <textarea
                value={editingTab.subhead || ''}
                onChange={(e) => setEditingTab({ ...editingTab, subhead: e.target.value })}
                rows={2}
                placeholder={'MEN / COLLECTION 001\nSPRING / SUMMER 24'}
                className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editingTab.is_active ?? true} onChange={(e) => setEditingTab({ ...editingTab, is_active: e.target.checked })} /> Active
            </label>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditingTab(null)} className="flex-1 border border-border py-3 text-xs uppercase tracking-widest">Cancel</button>
              <button onClick={saveTab} disabled={savingTab} className="flex-1 bg-foreground text-background py-3 text-xs uppercase tracking-widest disabled:opacity-50">
                {savingTab ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
