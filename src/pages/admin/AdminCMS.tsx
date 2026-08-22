import { useState, useEffect, useCallback } from 'react';
import {
  Eye, EyeOff, Trash2, ChevronUp, ChevronDown, Plus,
  RefreshCw, ExternalLink, Save, Upload, Copy, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SECTION_FIELDS, SECTION_META } from '@/cms/registry';
import type {
  CMSSection, SectionType, Testimonial, FAQItem,
  AnnouncementBar, BrandSettings, ThemeSettings, SEOSettings,
  MediaAsset, FieldDef,
} from '@/cms/types';

// ─── Field Editor ────────────────────────────────────────────────────────────

function FieldEditor({ field, value, onChange }: {
  field: FieldDef;
  value: any;
  onChange: (v: any) => void;
}) {
  if (field.type === 'boolean') return (
    <div className="flex items-center gap-3">
      <Switch
        id={`fe-${field.key}`}
        checked={value === true || value === 'true'}
        onCheckedChange={onChange}
      />
      <Label htmlFor={`fe-${field.key}`} className="text-sm font-normal">{field.label}</Label>
    </div>
  );
  if (field.type === 'textarea') return (
    <Textarea
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      rows={4}
      className="text-sm"
    />
  );
  if (field.type === 'json') return (
    <>
      {field.hint && <p className="text-[10px] text-muted-foreground mb-1 font-mono">{field.hint}</p>}
      <Textarea
        value={typeof value === 'string' ? value : JSON.stringify(value ?? '', null, 2)}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        className="font-mono text-xs"
      />
    </>
  );
  if (field.type === 'color') return (
    <div className="flex gap-2 items-center">
      <input
        type="color"
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 rounded border cursor-pointer"
      />
      <Input
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#000000"
        className="text-sm"
      />
    </div>
  );
  return (
    <Input
      type={field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text'}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      className="text-sm"
    />
  );
}

// ─── AdminCMS ────────────────────────────────────────────────────────────────

export default function AdminCMS() {
  // Pages tab
  const [pageSlug, setPageSlug] = useState('home');
  const [sections, setSections] = useState<CMSSection[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [addingSection, setAddingSection] = useState(false);
  const [newType, setNewType] = useState<SectionType | ''>('');
  const [sectionsLoading, setSectionsLoading] = useState(true);

  // Content tab
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);

  // Marketing tab
  const [bars, setBars] = useState<AnnouncementBar[]>([]);

  // Theme tab
  const [theme, setTheme] = useState<Partial<ThemeSettings>>({});
  const [themeId, setThemeId] = useState<string | null>(null);

  // Brand tab
  const [brand, setBrand] = useState<Partial<BrandSettings>>({});
  const [brandId, setBrandId] = useState<string | null>(null);

  // SEO tab
  const [seoSlug, setSeoSlug] = useState('home');
  const [seo, setSeo] = useState<Partial<SEOSettings>>({});
  const [seoId, setSeoId] = useState<string | null>(null);

  // Media tab
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const loadSections = useCallback(async () => {
    setSectionsLoading(true);
    const { data } = await supabase
      .from('website_sections')
      .select('*')
      .eq('page_slug', pageSlug)
      .order('position', { ascending: true });
    setSections((data as unknown as CMSSection[]) ?? []);
    setSectionsLoading(false);
  }, [pageSlug]);

  useEffect(() => { loadSections(); }, [loadSections]);

  useEffect(() => {
    supabase.from('testimonials').select('*').order('position').then(({ data }) =>
      setTestimonials((data as unknown as Testimonial[]) ?? []));
    supabase.from('faq_items').select('*').order('position').then(({ data }) =>
      setFaqs((data as unknown as FAQItem[]) ?? []));
    supabase.from('announcement_bars').select('*').order('position').then(({ data }) =>
      setBars((data as unknown as AnnouncementBar[]) ?? []));
    supabase.from('theme_settings').select('*').limit(1).maybeSingle().then(({ data }) => {
      if (data) { setTheme(data as any); setThemeId((data as any).id); }
    });
    supabase.from('brand_settings').select('*').limit(1).maybeSingle().then(({ data }) => {
      if (data) { setBrand(data as any); setBrandId((data as any).id); }
    });
    supabase.from('media_assets').select('*').order('created_at', { ascending: false }).limit(50).then(({ data }) =>
      setMedia((data as unknown as MediaAsset[]) ?? []));
  }, []);

  useEffect(() => {
    supabase.from('seo_settings').select('*').eq('page_slug', seoSlug).maybeSingle().then(({ data }) => {
      setSeo((data as any) ?? { page_slug: seoSlug });
      setSeoId((data as any)?.id ?? null);
    });
  }, [seoSlug]);

  // ── Section operations ──────────────────────────────────────────────────────

  const startEdit = (section: CMSSection) => {
    const fields = SECTION_FIELDS[section.section_type] ?? [];
    const form: Record<string, any> = {};
    for (const f of fields) {
      const v = section.config[f.key];
      form[f.key] = f.type === 'json' && v !== undefined
        ? JSON.stringify(v, null, 2)
        : (v ?? '');
    }
    setEditForm(form);
    setEditingId(section.id);
  };

  const saveSection = async (section: CMSSection) => {
    const fields = SECTION_FIELDS[section.section_type] ?? [];
    const config = { ...section.config };
    for (const f of fields) {
      const raw = editForm[f.key];
      if (f.type === 'json') {
        try { config[f.key] = JSON.parse(raw); } catch { /* keep old value */ }
      } else if (f.type === 'number') {
        config[f.key] = Number(raw) || 0;
      } else if (f.type === 'boolean') {
        config[f.key] = raw === true || raw === 'true';
      } else {
        config[f.key] = raw ?? '';
      }
    }
    const { error } = await supabase
      .from('website_sections')
      .update({ config, updated_at: new Date().toISOString() })
      .eq('id', section.id);
    if (error) { toast.error('Save failed'); return; }
    toast.success('Section saved');
    setEditingId(null);
    loadSections();
  };

  const toggleVisible = async (section: CMSSection) => {
    await supabase.from('website_sections').update({ is_visible: !section.is_visible }).eq('id', section.id);
    loadSections();
  };

  const moveSection = async (section: CMSSection, dir: 'up' | 'down') => {
    const idx = sections.findIndex((s) => s.id === section.id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sections.length) return;
    const swap = sections[swapIdx];
    await Promise.all([
      supabase.from('website_sections').update({ position: swap.position }).eq('id', section.id),
      supabase.from('website_sections').update({ position: section.position }).eq('id', swap.id),
    ]);
    loadSections();
  };

  const deleteSection = async (section: CMSSection) => {
    if (section.is_locked) { toast.error('This section is locked'); return; }
    if (!confirm(`Delete "${section.label || section.section_type}"?`)) return;
    await supabase.from('website_sections').delete().eq('id', section.id);
    toast.success('Section deleted');
    loadSections();
  };

  const addSection = async () => {
    if (!newType) return;
    const maxPos = sections.reduce((m, s) => Math.max(m, s.position), 0);
    await supabase.from('website_sections').insert({
      page_slug: pageSlug,
      section_type: newType,
      label: SECTION_META[newType]?.label ?? newType,
      config: {},
      position: maxPos + 10,
      is_visible: true,
      is_locked: false,
    });
    setAddingSection(false);
    setNewType('');
    loadSections();
  };

  // ── Theme / Brand / SEO saves ───────────────────────────────────────────────

  const saveTheme = async () => {
    const { id: _id, ...rest } = theme as any;
    if (themeId) {
      await supabase.from('theme_settings').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', themeId);
    } else {
      await supabase.from('theme_settings').insert(rest);
    }
    toast.success('Theme saved');
  };

  const saveBrand = async () => {
    const { id: _id, ...rest } = brand as any;
    if (brandId) {
      await supabase.from('brand_settings').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', brandId);
    } else {
      await supabase.from('brand_settings').insert(rest);
    }
    toast.success('Brand settings saved');
  };

  const saveSeo = async () => {
    const payload = { ...seo, page_slug: seoSlug };
    if (seoId) {
      await supabase.from('seo_settings').update(payload).eq('id', seoId);
    } else {
      const { data } = await supabase.from('seo_settings').insert(payload).select().single();
      if (data) setSeoId((data as any).id);
    }
    toast.success('SEO settings saved');
  };

  // ── Media upload ────────────────────────────────────────────────────────────

  const uploadMedia = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', 'vault26_unsigned');
      const res = await fetch('https://api.cloudinary.com/v1_1/dsqeawg67/image/upload', {
        method: 'POST', body: fd,
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error.message);
      await supabase.from('media_assets').insert({
        cloudinary_public_id: d.public_id,
        url: d.url,
        secure_url: d.secure_url,
        resource_type: d.resource_type,
        format: d.format ?? null,
        width: d.width ?? null,
        height: d.height ?? null,
        tags: d.tags ?? [],
      });
      const { data } = await supabase.from('media_assets').select('*').order('created_at', { ascending: false }).limit(50);
      setMedia((data as unknown as MediaAsset[]) ?? []);
      toast.success('Image uploaded');
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Website Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Control every section of your storefront without touching code.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
            <ExternalLink className="h-3 w-3" /> Preview Site
          </a>
        </Button>
      </div>

      <Tabs defaultValue="pages">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="theme">Theme</TabsTrigger>
          <TabsTrigger value="brand">Brand</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
        </TabsList>

        {/* ── PAGES ────────────────────────────────────────────────────────── */}
        <TabsContent value="pages">
          <div className="flex items-center gap-3 mb-6">
            <Label className="text-sm font-medium whitespace-nowrap">Page slug</Label>
            <Input
              value={pageSlug}
              onChange={(e) => setPageSlug(e.target.value)}
              className="w-40 text-sm"
              placeholder="home"
              onBlur={loadSections}
            />
            <Button variant="ghost" size="sm" onClick={loadSections}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          {sectionsLoading ? (
            <p className="text-muted-foreground text-sm py-4">Loading sections…</p>
          ) : sections.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No sections found for "{pageSlug}". Add one below.
            </p>
          ) : (
            <div className="space-y-3">
              {sections.map((s, idx) => (
                <div key={s.id} className="border rounded-lg overflow-hidden">
                  <div className="flex items-center gap-3 p-4 bg-card">
                    <Badge
                      variant={s.is_visible ? 'default' : 'secondary'}
                      className="text-[10px] uppercase tracking-wider shrink-0"
                    >
                      {SECTION_META[s.section_type]?.label ?? s.section_type}
                    </Badge>
                    <span className="flex-1 text-sm font-medium truncate">
                      {s.label || s.section_type}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        title={s.is_visible ? 'Hide section' : 'Show section'}
                        onClick={() => toggleVisible(s)}
                        className="p-1.5 hover:bg-muted rounded transition-colors"
                      >
                        {s.is_visible
                          ? <Eye className="h-3.5 w-3.5" />
                          : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                      <button
                        title="Move up"
                        onClick={() => moveSection(s, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 hover:bg-muted rounded transition-colors disabled:opacity-30"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        title="Move down"
                        onClick={() => moveSection(s, 'down')}
                        disabled={idx === sections.length - 1}
                        className="p-1.5 hover:bg-muted rounded transition-colors disabled:opacity-30"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-3"
                        onClick={() => editingId === s.id ? setEditingId(null) : startEdit(s)}
                      >
                        {editingId === s.id ? 'Close' : 'Edit'}
                      </Button>
                      {!s.is_locked && (
                        <button
                          title="Delete section"
                          onClick={() => deleteSection(s)}
                          className="p-1.5 hover:bg-destructive/10 text-destructive rounded transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {editingId === s.id && (
                    <div className="border-t bg-muted/30 p-5">
                      {(SECTION_FIELDS[s.section_type] ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No configurable fields for this section type.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                          {(SECTION_FIELDS[s.section_type] ?? []).map((f) => (
                            <div
                              key={f.key}
                              className={f.type === 'json' || f.type === 'textarea' ? 'md:col-span-2' : ''}
                            >
                              {f.type !== 'boolean' && (
                                <Label className="text-xs font-medium mb-1.5 block text-muted-foreground uppercase tracking-wider">
                                  {f.label}
                                </Label>
                              )}
                              <FieldEditor
                                field={f}
                                value={editForm[f.key]}
                                onChange={(v) => setEditForm((prev) => ({ ...prev, [f.key]: v }))}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveSection(s)}>
                          <Save className="h-3.5 w-3.5 mr-2" /> Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 border-t pt-6">
            {addingSection ? (
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as SectionType)}
                  className="flex-1 min-w-[200px] h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select section type…</option>
                  {Object.entries(SECTION_META).map(([k, v]) => (
                    <option key={k} value={k}>{v.label} — {v.description}</option>
                  ))}
                </select>
                <Button size="sm" onClick={addSection} disabled={!newType}>Add</Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setAddingSection(false); setNewType(''); }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setAddingSection(true)}>
                <Plus className="h-3.5 w-3.5 mr-2" /> Add Section
              </Button>
            )}
          </div>
        </TabsContent>

        {/* ── CONTENT ──────────────────────────────────────────────────────── */}
        <TabsContent value="content">
          <ContentTab
            testimonials={testimonials}
            setTestimonials={setTestimonials}
            faqs={faqs}
            setFaqs={setFaqs}
          />
        </TabsContent>

        {/* ── MARKETING ────────────────────────────────────────────────────── */}
        <TabsContent value="marketing">
          <MarketingTab bars={bars} setBars={setBars} />
        </TabsContent>

        {/* ── THEME ────────────────────────────────────────────────────────── */}
        <TabsContent value="theme">
          <div className="max-w-2xl space-y-6">
            <h2 className="text-lg font-semibold">Theme Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Accent Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={(theme as any).accent_color || '#000000'}
                    onChange={(e) => setTheme((t) => ({ ...t, accent_color: e.target.value }))}
                    className="h-9 w-12 rounded border cursor-pointer"
                  />
                  <Input
                    value={(theme as any).accent_color ?? ''}
                    onChange={(e) => setTheme((t) => ({ ...t, accent_color: e.target.value }))}
                    placeholder="#000000"
                    className="text-sm"
                  />
                </div>
              </div>
              {(['font_display', 'font_ui', 'font_elegant', 'border_radius'] as const).map((k) => (
                <div key={k}>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    {k.replace('_', ' ')}
                  </Label>
                  <Input
                    value={(theme as any)[k] ?? ''}
                    onChange={(e) => setTheme((t) => ({ ...t, [k]: e.target.value }))}
                    className="text-sm"
                  />
                </div>
              ))}
              <div className="flex items-center gap-3 pt-2">
                <Switch
                  id="animations_enabled"
                  checked={(theme as any).animations_enabled !== false}
                  onCheckedChange={(v) => setTheme((t) => ({ ...t, animations_enabled: v }))}
                />
                <Label htmlFor="animations_enabled">Animations enabled</Label>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Custom CSS</Label>
                <Textarea
                  value={(theme as any).custom_css ?? ''}
                  onChange={(e) => setTheme((t) => ({ ...t, custom_css: e.target.value }))}
                  rows={6}
                  className="font-mono text-xs"
                  placeholder="/* Custom CSS */"
                />
              </div>
            </div>
            <Button onClick={saveTheme}><Save className="h-4 w-4 mr-2" /> Save Theme</Button>
          </div>
        </TabsContent>

        {/* ── BRAND ────────────────────────────────────────────────────────── */}
        <TabsContent value="brand">
          <div className="max-w-2xl space-y-6">
            <h2 className="text-lg font-semibold">Brand Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {([
                ['site_name', 'Site Name'], ['tagline', 'Tagline'],
                ['logo_url', 'Logo URL'], ['favicon_url', 'Favicon URL'],
                ['og_default_image', 'Default OG Image URL'],
                ['social_instagram', 'Instagram URL'], ['social_twitter', 'Twitter URL'],
                ['social_facebook', 'Facebook URL'],
                ['contact_email', 'Contact Email'], ['contact_phone', 'Contact Phone'],
              ] as [string, string][]).map(([k, lbl]) => (
                <div key={k}>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">{lbl}</Label>
                  <Input
                    value={(brand as any)[k] ?? ''}
                    onChange={(e) => setBrand((b) => ({ ...b, [k]: e.target.value }))}
                    className="text-sm"
                  />
                </div>
              ))}
              <div className="md:col-span-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Address</Label>
                <Textarea
                  value={(brand as any).address ?? ''}
                  onChange={(e) => setBrand((b) => ({ ...b, address: e.target.value }))}
                  rows={3}
                  className="text-sm"
                />
              </div>
            </div>
            <Button onClick={saveBrand}><Save className="h-4 w-4 mr-2" /> Save Brand</Button>
          </div>
        </TabsContent>

        {/* ── SEO ──────────────────────────────────────────────────────────── */}
        <TabsContent value="seo">
          <div className="max-w-2xl space-y-6">
            <div className="flex items-center gap-4 flex-wrap">
              <h2 className="text-lg font-semibold">SEO Settings</h2>
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Page slug</Label>
                <Input
                  value={seoSlug}
                  onChange={(e) => setSeoSlug(e.target.value)}
                  className="w-32 text-sm"
                  placeholder="home"
                  onBlur={() => {}}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {([
                ['title', 'Page Title'], ['og_title', 'OG Title'],
                ['canonical_url', 'Canonical URL'], ['og_image', 'OG Image URL'],
              ] as [string, string][]).map(([k, lbl]) => (
                <div key={k}>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">{lbl}</Label>
                  <Input
                    value={(seo as any)[k] ?? ''}
                    onChange={(e) => setSeo((s) => ({ ...s, [k]: e.target.value }))}
                    className="text-sm"
                  />
                </div>
              ))}
              <div className="md:col-span-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Meta Description</Label>
                <Textarea
                  value={(seo as any).description ?? ''}
                  onChange={(e) => setSeo((s) => ({ ...s, description: e.target.value }))}
                  rows={3}
                  className="text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">OG Description</Label>
                <Textarea
                  value={(seo as any).og_description ?? ''}
                  onChange={(e) => setSeo((s) => ({ ...s, og_description: e.target.value }))}
                  rows={3}
                  className="text-sm"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="no_index"
                  checked={!!(seo as any).no_index}
                  onCheckedChange={(v) => setSeo((s) => ({ ...s, no_index: v }))}
                />
                <Label htmlFor="no_index">No-index (exclude from search engines)</Label>
              </div>
            </div>
            <Button onClick={saveSeo}><Save className="h-4 w-4 mr-2" /> Save SEO</Button>
          </div>
        </TabsContent>

        {/* ── MEDIA ────────────────────────────────────────────────────────── */}
        <TabsContent value="media">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Media Library</h2>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMedia(f); }}
              />
              <Button size="sm" disabled={uploading} asChild>
                <span>
                  <Upload className="h-3.5 w-3.5 mr-2" />
                  {uploading ? 'Uploading…' : 'Upload Image'}
                </span>
              </Button>
            </label>
          </div>
          {media.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No media uploaded yet. Upload images to use in section configs.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {media.map((m) => (
                <div key={m.id} className="group relative aspect-square rounded-lg overflow-hidden bg-muted border">
                  <img
                    src={m.secure_url || m.url}
                    alt={m.alt_text || ''}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => copyUrl(m.secure_url || m.url)}
                      className="text-white p-2 hover:bg-white/20 rounded transition-colors"
                      title="Copy URL"
                    >
                      {copied === (m.secure_url || m.url)
                        ? <Check className="h-4 w-4" />
                        : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  {m.width && m.height && (
                    <span className="absolute bottom-1 left-1 right-1 text-[9px] text-white/60 text-center bg-black/40 px-1 rounded truncate">
                      {m.width}×{m.height}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Content Tab ─────────────────────────────────────────────────────────────

function ContentTab({ testimonials, setTestimonials, faqs, setFaqs }: {
  testimonials: Testimonial[];
  setTestimonials: (t: Testimonial[]) => void;
  faqs: FAQItem[];
  setFaqs: (f: FAQItem[]) => void;
}) {
  const [tForm, setTForm] = useState({ name: '', role: '', body: '', rating: 5, position: 0 });
  const [editingT, setEditingT] = useState<string | null>(null);
  const [fForm, setFForm] = useState({ question: '', answer: '', category: '', position: 0 });
  const [editingF, setEditingF] = useState<string | null>(null);

  const reloadT = () =>
    supabase.from('testimonials').select('*').order('position').then(({ data }) =>
      setTestimonials((data as unknown as Testimonial[]) ?? []));

  const reloadF = () =>
    supabase.from('faq_items').select('*').order('position').then(({ data }) =>
      setFaqs((data as unknown as FAQItem[]) ?? []));

  const saveT = async () => {
    if (editingT) {
      await supabase.from('testimonials').update(tForm).eq('id', editingT);
    } else {
      await supabase.from('testimonials').insert({ ...tForm, is_active: true });
    }
    toast.success('Testimonial saved');
    setEditingT(null);
    setTForm({ name: '', role: '', body: '', rating: 5, position: 0 });
    reloadT();
  };

  const deleteT = async (id: string) => {
    if (!confirm('Delete this testimonial?')) return;
    await supabase.from('testimonials').delete().eq('id', id);
    reloadT();
  };

  const toggleT = async (t: Testimonial) => {
    await supabase.from('testimonials').update({ is_active: !t.is_active }).eq('id', t.id);
    reloadT();
  };

  const saveF = async () => {
    if (editingF) {
      await supabase.from('faq_items').update(fForm).eq('id', editingF);
    } else {
      await supabase.from('faq_items').insert({ ...fForm, is_active: true });
    }
    toast.success('FAQ saved');
    setEditingF(null);
    setFForm({ question: '', answer: '', category: '', position: 0 });
    reloadF();
  };

  const deleteF = async (id: string) => {
    if (!confirm('Delete this FAQ?')) return;
    await supabase.from('faq_items').delete().eq('id', id);
    reloadF();
  };

  const toggleF = async (f: FAQItem) => {
    await supabase.from('faq_items').update({ is_active: !f.is_active }).eq('id', f.id);
    reloadF();
  };

  return (
    <div className="space-y-12">
      {/* Testimonials */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Testimonials</h2>
          <Button size="sm" variant="outline" onClick={() => {
            setEditingT(null);
            setTForm({ name: '', role: '', body: '', rating: 5, position: 0 });
          }}>
            <Plus className="h-3.5 w-3.5 mr-2" /> Add
          </Button>
        </div>
        <div className="border rounded-lg overflow-hidden mb-5">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-muted-foreground hidden md:table-cell">Role</th>
                <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Review</th>
                <th className="text-center px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-muted-foreground">Active</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {testimonials.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground text-sm">No testimonials yet.</td></tr>
              )}
              {testimonials.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{t.role}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell max-w-xs truncate">"{t.body}"</td>
                  <td className="px-4 py-3 text-center">
                    <Switch checked={t.is_active} onCheckedChange={() => toggleT(t)} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => {
                        setEditingT(t.id);
                        setTForm({ name: t.name, role: t.role || '', body: t.body, rating: t.rating, position: t.position });
                      }}>Edit</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-destructive hover:text-destructive" onClick={() => deleteT(t.id)}>Del</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border rounded-lg p-5 bg-muted/20 space-y-4">
          <h3 className="text-sm font-medium">{editingT ? 'Edit Testimonial' : 'New Testimonial'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Name *</Label>
              <Input value={tForm.name} onChange={(e) => setTForm((f) => ({ ...f, name: e.target.value }))} className="text-sm" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Role / Title</Label>
              <Input value={tForm.role} onChange={(e) => setTForm((f) => ({ ...f, role: e.target.value }))} className="text-sm" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Rating (1–5)</Label>
              <Input type="number" min={1} max={5} value={tForm.rating} onChange={(e) => setTForm((f) => ({ ...f, rating: Number(e.target.value) }))} className="text-sm" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Position</Label>
              <Input type="number" value={tForm.position} onChange={(e) => setTForm((f) => ({ ...f, position: Number(e.target.value) }))} className="text-sm" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Review *</Label>
              <Textarea value={tForm.body} onChange={(e) => setTForm((f) => ({ ...f, body: e.target.value }))} rows={3} className="text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveT} disabled={!tForm.name || !tForm.body}>
              <Save className="h-3.5 w-3.5 mr-2" /> Save
            </Button>
            {editingT && (
              <Button size="sm" variant="outline" onClick={() => {
                setEditingT(null);
                setTForm({ name: '', role: '', body: '', rating: 5, position: 0 });
              }}>Cancel</Button>
            )}
          </div>
        </div>
      </div>

      {/* FAQs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">FAQs</h2>
          <Button size="sm" variant="outline" onClick={() => {
            setEditingF(null);
            setFForm({ question: '', answer: '', category: '', position: 0 });
          }}>
            <Plus className="h-3.5 w-3.5 mr-2" /> Add
          </Button>
        </div>
        <div className="border rounded-lg overflow-hidden mb-5">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-muted-foreground">Question</th>
                <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-muted-foreground hidden md:table-cell">Category</th>
                <th className="text-center px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-muted-foreground">Active</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {faqs.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground text-sm">No FAQs yet.</td></tr>
              )}
              {faqs.map((f) => (
                <tr key={f.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 max-w-xs truncate">{f.question}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{f.category || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <Switch checked={f.is_active} onCheckedChange={() => toggleF(f)} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => {
                        setEditingF(f.id);
                        setFForm({ question: f.question, answer: f.answer, category: f.category, position: f.position });
                      }}>Edit</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-destructive hover:text-destructive" onClick={() => deleteF(f.id)}>Del</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border rounded-lg p-5 bg-muted/20 space-y-4">
          <h3 className="text-sm font-medium">{editingF ? 'Edit FAQ' : 'New FAQ'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Question *</Label>
              <Input value={fForm.question} onChange={(e) => setFForm((f) => ({ ...f, question: e.target.value }))} className="text-sm" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Category (optional)</Label>
              <Input value={fForm.category} onChange={(e) => setFForm((f) => ({ ...f, category: e.target.value }))} className="text-sm" placeholder="shipping, returns…" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Position</Label>
              <Input type="number" value={fForm.position} onChange={(e) => setFForm((f) => ({ ...f, position: Number(e.target.value) }))} className="text-sm" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Answer *</Label>
              <Textarea value={fForm.answer} onChange={(e) => setFForm((f) => ({ ...f, answer: e.target.value }))} rows={4} className="text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveF} disabled={!fForm.question || !fForm.answer}>
              <Save className="h-3.5 w-3.5 mr-2" /> Save
            </Button>
            {editingF && (
              <Button size="sm" variant="outline" onClick={() => {
                setEditingF(null);
                setFForm({ question: '', answer: '', category: '', position: 0 });
              }}>Cancel</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Marketing Tab ────────────────────────────────────────────────────────────

function MarketingTab({ bars, setBars }: {
  bars: AnnouncementBar[];
  setBars: (b: AnnouncementBar[]) => void;
}) {
  const [form, setForm] = useState({
    message: '', cta_label: '', cta_href: '',
    bg_color: '#000000', text_color: '#ffffff',
    starts_at: '', ends_at: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const reload = () =>
    supabase.from('announcement_bars').select('*').order('position').then(({ data }) =>
      setBars((data as unknown as AnnouncementBar[]) ?? []));

  const save = async () => {
    const payload = {
      message: form.message,
      cta_label: form.cta_label || null,
      cta_href: form.cta_href || null,
      bg_color: form.bg_color,
      text_color: form.text_color,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
    };
    if (editingId) {
      await supabase.from('announcement_bars').update(payload).eq('id', editingId);
    } else {
      await supabase.from('announcement_bars').insert({ ...payload, is_active: true, position: 0 });
    }
    toast.success('Announcement bar saved');
    setEditingId(null);
    setForm({ message: '', cta_label: '', cta_href: '', bg_color: '#000000', text_color: '#ffffff', starts_at: '', ends_at: '' });
    reload();
  };

  const toggle = async (bar: AnnouncementBar) => {
    await supabase.from('announcement_bars').update({ is_active: !bar.is_active }).eq('id', bar.id);
    reload();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this bar?')) return;
    await supabase.from('announcement_bars').delete().eq('id', id);
    reload();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Announcement Bars</h2>
        <Button size="sm" variant="outline" onClick={() => {
          setEditingId(null);
          setForm({ message: '', cta_label: '', cta_href: '', bg_color: '#000000', text_color: '#ffffff', starts_at: '', ends_at: '' });
        }}>
          <Plus className="h-3.5 w-3.5 mr-2" /> Add Bar
        </Button>
      </div>
      <div className="border rounded-lg overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-muted-foreground">Message</th>
              <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-muted-foreground hidden md:table-cell">Colors</th>
              <th className="text-center px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-muted-foreground">Active</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {bars.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground text-sm">No announcement bars yet.</td></tr>
            )}
            {bars.map((b) => (
              <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 max-w-xs truncate">{b.message}</td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="flex gap-1.5">
                    <span className="h-4 w-4 rounded border inline-block" style={{ backgroundColor: b.bg_color }} title="Background" />
                    <span className="h-4 w-4 rounded border inline-block" style={{ backgroundColor: b.text_color }} title="Text" />
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <Switch checked={b.is_active} onCheckedChange={() => toggle(b)} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => {
                      setEditingId(b.id);
                      setForm({
                        message: b.message,
                        cta_label: b.cta_label || '',
                        cta_href: b.cta_href || '',
                        bg_color: b.bg_color,
                        text_color: b.text_color,
                        starts_at: b.starts_at || '',
                        ends_at: b.ends_at || '',
                      });
                    }}>Edit</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-destructive hover:text-destructive" onClick={() => del(b.id)}>Del</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border rounded-lg p-5 bg-muted/20 space-y-4">
        <h3 className="text-sm font-medium">{editingId ? 'Edit Bar' : 'New Bar'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Message *</Label>
            <Input value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} className="text-sm" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">CTA Label</Label>
            <Input value={form.cta_label} onChange={(e) => setForm((f) => ({ ...f, cta_label: e.target.value }))} className="text-sm" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">CTA Link</Label>
            <Input value={form.cta_href} onChange={(e) => setForm((f) => ({ ...f, cta_href: e.target.value }))} className="text-sm" placeholder="/shop" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Background Color</Label>
            <div className="flex gap-2 items-center">
              <input type="color" value={form.bg_color} onChange={(e) => setForm((f) => ({ ...f, bg_color: e.target.value }))} className="h-9 w-12 rounded border cursor-pointer" />
              <Input value={form.bg_color} onChange={(e) => setForm((f) => ({ ...f, bg_color: e.target.value }))} className="text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Text Color</Label>
            <div className="flex gap-2 items-center">
              <input type="color" value={form.text_color} onChange={(e) => setForm((f) => ({ ...f, text_color: e.target.value }))} className="h-9 w-12 rounded border cursor-pointer" />
              <Input value={form.text_color} onChange={(e) => setForm((f) => ({ ...f, text_color: e.target.value }))} className="text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Start Date</Label>
            <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))} className="text-sm" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">End Date</Label>
            <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))} className="text-sm" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={!form.message}>
            <Save className="h-3.5 w-3.5 mr-2" /> Save
          </Button>
          {editingId && (
            <Button size="sm" variant="outline" onClick={() => {
              setEditingId(null);
              setForm({ message: '', cta_label: '', cta_href: '', bg_color: '#000000', text_color: '#ffffff', starts_at: '', ends_at: '' });
            }}>Cancel</Button>
          )}
        </div>
      </div>
    </div>
  );
}
