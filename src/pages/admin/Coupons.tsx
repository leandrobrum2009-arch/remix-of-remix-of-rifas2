import AdminLayout from "@/components/AdminLayout";
import { useAdminCoupons } from "@/hooks/useAdmin";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Percent, Plus, Pencil, Trash2, Calendar, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminCoupons() {
  const { data: coupons, isLoading, refetch } = useAdminCoupons();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    discount_type: "percentage",
    discount_value: "10",
    max_uses: "",
    expires_at: "",
    is_active: true
  });

  const handleCreate = async () => {
    if (!formData.code) {
      toast.error("Insira o código do cupom");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("coupons").insert({
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
        is_active: formData.is_active
      });

      if (error) throw error;

      toast.success("Cupom criado com sucesso!");
      setIsDialogOpen(false);
      refetch();
      setFormData({ code: "", discount_type: "percentage", discount_value: "10", max_uses: "", expires_at: "", is_active: true });
    } catch (error: any) {
      toast.error("Erro ao criar cupom: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cupom?")) return;
    
    try {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
      toast.success("Cupom excluído!");
      refetch();
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">Cupons de Desconto</h1>
          <p className="text-muted-foreground mt-1">Crie códigos promocionais para aumentar suas vendas.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-foreground font-bold shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] border-none">
              <Plus className="mr-2 h-4 w-4" /> Novo Cupom
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Novo Cupom de Desconto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Código do Cupom</Label>
                <Input 
                  placeholder="Ex: PROMO20" 
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select 
                    value={formData.discount_type}
                    onValueChange={v => setFormData({...formData, discount_type: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                      <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input 
                    type="number"
                    value={formData.discount_value}
                    onChange={e => setFormData({...formData, discount_value: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Limite de Usos</Label>
                  <Input 
                    type="number"
                    placeholder="Deixe vazio para ilimitado"
                    value={formData.max_uses}
                    onChange={e => setFormData({...formData, max_uses: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expira em</Label>
                  <Input 
                    type="date"
                    value={formData.expires_at}
                    onChange={e => setFormData({...formData, expires_at: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Criar Cupom
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border bg-card/50 backdrop-blur-xl">
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
          ) : (
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Código</TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Desconto</TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Uso</TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Expira em</TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Status</TableHead>
                  <TableHead className="text-right text-muted-foreground font-bold uppercase text-[10px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons?.map((c) => (
                  <TableRow key={c.id} className="border-border hover:bg-secondary/20 transition-colors group">
                    <TableCell>
                      <code className="bg-primary/10 px-3 py-1.5 rounded-lg text-primary text-sm font-bold tracking-widest border border-primary/20">
                        {c.code}
                      </code>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-foreground tracking-tight">
                        {c.discount_type === 'percentage' ? `${c.discount_value}%` : `R$ ${Number(c.discount_value).toFixed(2)}`}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground">{c.current_uses} / {c.max_uses || '∞'}</span>
                        <div className="h-1 w-16 bg-secondary/20 rounded-full mt-1">
                          <div 
                            className="h-full bg-emerald-500" 
                            style={{ width: c.max_uses ? `${(c.current_uses / c.max_uses) * 100}%` : '0%' }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {c.expires_at ? (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(c.expires_at), 'dd/MM/yy')}
                        </div>
                      ) : 'Nunca'}
                    </TableCell>
                    <TableCell>
                      <Badge className={c.is_active ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/20" : "bg-secondary/500/20 text-muted-foreground border-slate-500/20"}>
                        {c.is_active ? "ATIVO" : "INATIVO"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-card/10">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                        onClick={() => handleDelete(c.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {coupons?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground font-medium italic">
                      Nenhum cupom de desconto encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
