import AdminLayout from "@/components/AdminLayout";
import { useAdminNotifications } from "@/hooks/useAdmin";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Bell, Send, Trash2, Users, User, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminNotifications() {
  const { data: notifications, isLoading, refetch } = useAdminNotifications();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    body: "",
    target_type: "all",
    user_id: ""
  });

  const handleSend = async () => {
    if (!formData.title || !formData.body) {
      toast.error("Preencha o título e a mensagem");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("push_notifications").insert({
        title: formData.title,
        body: formData.body,
        target_type: formData.target_type,
        target_user_id: formData.target_type === 'specific' ? formData.user_id : null,
        sent_by: user?.id,
        sent_at: new Date().toISOString()
      } as any);

      if (error) throw error;

      toast.success("Notificação enviada!");
      setIsDialogOpen(false);
      refetch();
      setFormData({ title: "", body: "", target_type: "all", user_id: "" });
    } catch (error: any) {
      toast.error("Erro ao enviar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover do histórico?")) return;
    try {
      const { error } = await supabase.from("push_notifications").delete().eq("id", id);
      if (error) throw error;
      toast.success("Removida!");
      refetch();
    } catch (error: any) {
      toast.error("Erro ao remover: " + error.message);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">Notificações Push</h1>
          <p className="text-muted-foreground mt-1">Envie mensagens instantâneas para seus usuários.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-foreground font-bold shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] border-none">
              <Send className="mr-2 h-4 w-4" /> Nova Mensagem
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Enviar Notificação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input 
                  placeholder="Título da mensagem" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea 
                  placeholder="Conteúdo da notificação..." 
                  value={formData.body}
                  onChange={e => setFormData({...formData, body: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Público Alvo</Label>
                <Select 
                  value={formData.target_type}
                  onValueChange={v => setFormData({...formData, target_type: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Usuários</SelectItem>
                    <SelectItem value="specific">Usuário Específico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.target_type === 'specific' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label>ID do Usuário</Label>
                  <Input 
                    placeholder="UUID do usuário" 
                    value={formData.user_id}
                    onChange={e => setFormData({...formData, user_id: e.target.value})}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSend} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Enviar Agora
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
            <Table className="min-w-[500px]">
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Mensagem</TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Alvo</TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Data Envio</TableHead>
                  <TableHead className="text-right text-muted-foreground font-bold uppercase text-[10px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications?.map((n) => (
                  <TableRow key={n.id} className="border-border hover:bg-secondary/20 transition-colors group">
                    <TableCell>
                      <div className="flex flex-col max-w-md">
                        <span className="font-bold text-foreground tracking-tight">{n.title}</span>
                        <span className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.body}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {n.target_type === 'all' ? <Users className="h-3.5 w-3.5 text-blue-600" /> : <User className="h-3.5 w-3.5 text-purple-400" />}
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest border-border text-foreground">
                          {n.target_type === 'all' ? 'Todos os Usuários' : 'Usuário Específico'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {n.sent_at ? format(new Date(n.sent_at), 'dd MMM, HH:mm') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                        onClick={() => handleDelete(n.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {notifications?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground font-medium italic">
                      Nenhuma notificação enviada ainda.
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
