import AdminLayout from "@/components/AdminLayout";
import { useAdminAffiliates, useUpdateAffiliate, useCreateAffiliate, useAdminUsers } from "@/hooks/useAdmin";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UsersRound, DollarSign, ExternalLink, ShieldCheck, Pencil, Plus, Check, X, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

export default function AdminAffiliates() {
  const { data: affiliates, isLoading } = useAdminAffiliates();
  const { data: users } = useAdminUsers();
  const updateAffiliate = useUpdateAffiliate();
  const createAffiliate = useCreateAffiliate();
  
  const [editingAffiliate, setEditingAffiliate] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const [newAffiliate, setNewAffiliate] = useState({
    user_id: "",
    commission_rate: 0.1,
    type: "common",
    referral_code: ""
  });

  const handleUpdate = () => {
    if (!editingAffiliate) return;
    updateAffiliate.mutate({
      id: editingAffiliate.id,
      commission_rate: Number(editingAffiliate.commission_rate),
      type: editingAffiliate.type,
      is_active: editingAffiliate.is_active
    }, {
      onSuccess: () => setIsEditDialogOpen(false)
    });
  };

  const handleCreate = () => {
    if (!newAffiliate.user_id || !newAffiliate.referral_code) return;
    createAffiliate.mutate(newAffiliate, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
        setNewAffiliate({ user_id: "", commission_rate: 0.1, type: "common", referral_code: "" });
      }
    });
  };

  const totalCommissions = 12450; // Mock or calculate from real data if available

  return (
    <AdminLayout>
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">Afiliados & Influenciadores</h1>
          <p className="text-muted-foreground mt-1">Gerencie a rede de parceiros, influencers e suas comissões.</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="rounded-xl font-bold uppercase italic gap-2 glow-primary">
          <Plus className="h-4 w-4" /> Novo Afiliado
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="border-border bg-emerald-500/5 backdrop-blur-xl group hover:border-emerald-500/30 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-500">
                <DollarSign className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/20">ESTÁVEL</Badge>
            </div>
            <div className="mt-4">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Total Comissões</p>
              <h3 className="text-3xl font-bold text-foreground mt-1">R$ {totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-blue-500/5 backdrop-blur-xl group hover:border-blue-500/30 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-500">
                <UsersRound className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="text-[10px] text-blue-500 border-blue-500/20">ATIVOS</Badge>
            </div>
            <div className="mt-4">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Total Parceiros</p>
              <h3 className="text-3xl font-bold text-foreground mt-1">{affiliates?.length || 0}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-purple-500/5 backdrop-blur-xl group hover:border-purple-500/30 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-500">
                <ExternalLink className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="text-[10px] text-purple-500 border-purple-500/20">REDE</Badge>
            </div>
            <div className="mt-4">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Influenciadores</p>
              <h3 className="text-3xl font-bold text-foreground mt-1">
                {affiliates?.filter(a => a.type === 'influencer').length || 0}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card/50 backdrop-blur-xl">
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Parceiro</TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Tipo</TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Código/Link</TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Comissão</TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Status</TableHead>
                  <TableHead className="text-right text-muted-foreground font-bold uppercase text-[10px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {affiliates?.map((a) => (
                  <TableRow key={a.id} className="border-border hover:bg-secondary/20 transition-colors group">
                    <TableCell>
                      <div className="flex flex-col">
                       <span className="font-bold text-foreground">{(a.profiles as any)?.name || "Sem Nome"}</span>
                       <span className="text-[10px] text-muted-foreground italic">{(a.profiles as any)?.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {a.type === 'influencer' ? (
                        <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30 font-black italic text-[9px]">INFLUENCER</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] font-bold">AFILIADO</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="bg-secondary/20 px-2 py-1 rounded text-primary text-xs font-bold">{a.referral_code}</code>
                    </TableCell>
                    <TableCell className="text-foreground font-medium">{Number(a.commission_rate * 100).toFixed(0)}%</TableCell>
                    <TableCell>
                      {a.is_active ? (
                        <div className="flex items-center gap-1 text-emerald-500 font-bold text-[10px] uppercase tracking-widest">
                          <Check className="h-3 w-3" /> Ativo
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-rose-500 font-bold text-[10px] uppercase tracking-widest">
                          <X className="h-3 w-3" /> Inativo
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => {
                        setEditingAffiliate(a);
                        setIsEditDialogOpen(true);
                      }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase italic tracking-tighter">Editar Parceiro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tipo de Parceiro</Label>
              <Select value={editingAffiliate?.type} onValueChange={(val) => setEditingAffiliate({...editingAffiliate, type: val})}>
                <SelectTrigger className="h-12 rounded-xl bg-secondary/50 border-border font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="common">Afiliado Comum</SelectItem>
                  <SelectItem value="influencer">Influenciador (Especial)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Taxa de Comissão (0.1 = 10%)</Label>
              <Input 
                type="number" 
                step="0.01" 
                value={editingAffiliate?.commission_rate} 
                onChange={(e) => setEditingAffiliate({...editingAffiliate, commission_rate: e.target.value})}
                className="h-12 rounded-xl bg-secondary/50 border-border font-bold"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
              <Label className="text-sm font-bold">Status Ativo</Label>
              <Switch checked={editingAffiliate?.is_active} onCheckedChange={(val) => setEditingAffiliate({...editingAffiliate, is_active: val})} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdate} className="w-full h-12 rounded-xl font-bold uppercase italic glow-primary" disabled={updateAffiliate.isPending}>
              {updateAffiliate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase italic tracking-tighter text-primary">Novo Parceiro</DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest">Cadastre um novo influenciador ou afiliado</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Selecionar Usuário</Label>
              <Select value={newAffiliate.user_id} onValueChange={(val) => setNewAffiliate({...newAffiliate, user_id: val})}>
                <SelectTrigger className="h-12 rounded-xl bg-secondary/50 border-border font-bold">
                  <SelectValue placeholder="Escolha um usuário..." />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {users?.filter(u => !affiliates?.some(a => a.user_id === u.user_id)).map(u => (
                    <SelectItem key={u.user_id} value={u.user_id}>{u.name} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Código de Indicação (ex: influencer10)</Label>
              <Input 
                value={newAffiliate.referral_code} 
                onChange={(e) => setNewAffiliate({...newAffiliate, referral_code: e.target.value})}
                placeholder="Ex: joaosilva"
                className="h-12 rounded-xl bg-secondary/50 border-border font-bold uppercase"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Taxa (0.1 = 10%)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={newAffiliate.commission_rate} 
                  onChange={(e) => setNewAffiliate({...newAffiliate, commission_rate: Number(e.target.value)})}
                  className="h-12 rounded-xl bg-secondary/50 border-border font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tipo</Label>
                <Select value={newAffiliate.type} onValueChange={(val) => setNewAffiliate({...newAffiliate, type: val})}>
                  <SelectTrigger className="h-12 rounded-xl bg-secondary/50 border-border font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="common">Afiliado</SelectItem>
                    <SelectItem value="influencer">Influencer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} className="w-full h-12 rounded-xl font-bold uppercase italic glow-primary" disabled={createAffiliate.isPending}>
              {createAffiliate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Parceiro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
