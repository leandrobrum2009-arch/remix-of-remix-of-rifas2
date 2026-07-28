import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminBanners } from "@/hooks/useAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Image as ImageIcon, Plus, Pencil, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-upload";

type BannerRow = {
  id?: string;
  title: string;
  subtitle?: string | null;
  image_url: string;
  link_url?: string | null;
  is_active?: boolean | null;
  order_index?: number | null;
};

const emptyBanner: BannerRow = {
  title: "",
  subtitle: "",
  image_url: "",
  link_url: "",
  is_active: true,
  order_index: 0,
};

export default function AdminBanners() {
  const { data: banners, isLoading } = useAdminBanners();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<BannerRow>(emptyBanner);

  const openNew = () => {
    setForm({ ...emptyBanner, order_index: (banners?.length || 0) });
    setOpen(true);
  };
  const openEdit = (b: any) => {
    setForm({ ...b });
    setOpen(true);
  };

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      const compressed = await compressImage(file);
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const tryBuckets = ["site-assets", "campaigns"];
      let publicUrl = "";
      let lastErr: any = null;
      for (const bucket of tryBuckets) {
        const { error } = await supabase.storage.from(bucket).upload(path, compressed, {
          cacheControl: "3600",
          upsert: false,
          contentType: compressed.type,
        });
        if (!error) {
          publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
          break;
        }
        lastErr = error;
      }
      if (!publicUrl) throw lastErr || new Error("Falha no upload");
      setForm((f) => ({ ...f, image_url: publicUrl }));
      toast.success("Imagem enviada");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title || !form.image_url) {
      toast.error("Título e imagem são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        subtitle: form.subtitle || null,
        image_url: form.image_url,
        link_url: form.link_url || null,
        is_active: !!form.is_active,
        order_index: Number(form.order_index) || 0,
      };
      if (form.id) {
        const { error } = await supabase.from("banners").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("banners").insert(payload);
        if (error) throw error;
      }
      toast.success("Banner salvo");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-banners"] });
      qc.invalidateQueries({ queryKey: ["active-banners"] });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este banner?")) return;
    const { error } = await supabase.from("banners").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Banner excluído");
    qc.invalidateQueries({ queryKey: ["admin-banners"] });
    qc.invalidateQueries({ queryKey: ["active-banners"] });
  };

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">Banners Promocionais</h1>
          <p className="text-muted-foreground mt-1">Slides da home. Tamanho recomendado: 1600x800px.</p>
        </div>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
          <Plus className="mr-2 h-4 w-4" /> Novo Banner
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
        ) : banners?.map((banner: any) => (
          <Card key={banner.id} className="border-border bg-card/50 backdrop-blur-xl overflow-hidden group">
            <div className="aspect-[2/1] w-full relative overflow-hidden bg-slate-900">
              <img src={banner.image_url} alt={banner.title} className="h-full w-full object-cover" />
              <div className="absolute top-2 right-2">
                <Badge className={banner.is_active ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/20" : "bg-slate-500/20 text-muted-foreground border-slate-500/20"}>
                  {banner.is_active ? "ATIVO" : "INATIVO"}
                </Badge>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-foreground truncate">{banner.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{banner.subtitle || "Sem subtítulo"}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button onClick={() => openEdit(banner)} variant="ghost" size="icon" className="h-8 w-8">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => handleDelete(banner.id)} variant="ghost" size="icon" className="h-8 w-8 hover:text-rose-400">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="mt-3 text-[10px] text-muted-foreground uppercase tracking-widest truncate">
                Ordem: {banner.order_index} · Link: {banner.link_url || "—"}
              </p>
            </CardContent>
          </Card>
        ))}
        {!isLoading && banners?.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-border rounded-3xl">
            <ImageIcon className="h-12 w-12 text-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum banner cadastrado.</p>
            <Button variant="link" onClick={openNew} className="text-primary mt-2">Criar o primeiro</Button>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar Banner" : "Novo Banner"}</DialogTitle>
            <DialogDescription>Recomendado 1600x800px (proporção 2:1).</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Imagem do Banner *</Label>
              {form.image_url && (
                <img src={form.image_url} alt="preview" className="mt-2 w-full aspect-[2/1] object-cover rounded-lg border border-border" />
              )}
              <div className="mt-2 flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                />
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              <Input
                className="mt-2"
                placeholder="Ou cole a URL da imagem"
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              />
            </div>

            <div>
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Subtítulo</Label>
              <Textarea value={form.subtitle || ""} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>Link (URL ao clicar)</Label>
              <Input placeholder="/campanha/slug ou https://…" value={form.link_url || ""} onChange={(e) => setForm({ ...form, link_url: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ordem</Label>
                <Input type="number" value={form.order_index ?? 0} onChange={(e) => setForm({ ...form, order_index: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-end gap-3">
                <div className="flex items-center gap-2">
                  <Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <span className="text-sm">Ativo</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || uploading}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4 mr-2" />Salvar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}