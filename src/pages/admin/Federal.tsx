 import { useState } from "react";
 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import AdminLayout from "@/components/AdminLayout";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Trophy, Plus, Trash2, Pencil, Calendar, Hash, Target, Save } from "lucide-react";
 import { format } from "date-fns";
 
 export default function AdminFederal() {
   const queryClient = useQueryClient();
   const { toast } = useToast();
    const [fetching, setFetching] = useState(false);
     const [open, setOpen] = useState(false);
     const [editingId, setEditingId] = useState<string | null>(null);
    const [manualResult, setManualResult] = useState({
      concurso: "",
      data_sorteio: "",
      p1: "", p2: "", p3: "", p4: "", p5: ""
    });
    const handleEdit = (r: any) => {
      setEditingId(r.id);
      setManualResult({
        concurso: r.concurso,
        data_sorteio: r.data_sorteio.split('T')[0],
        p1: r.premios.find((p: any) => p.premio === "1")?.numero || "",
        p2: r.premios.find((p: any) => p.premio === "2")?.numero || "",
        p3: r.premios.find((p: any) => p.premio === "3")?.numero || "",
        p4: r.premios.find((p: any) => p.premio === "4")?.numero || "",
        p5: r.premios.find((p: any) => p.premio === "5")?.numero || "",
      });
      setOpen(true);
    };

    const handleAdd = () => {
      setEditingId(null);
      setManualResult({ concurso: "", data_sorteio: "", p1: "", p2: "", p3: "", p4: "", p5: "" });
      setOpen(true);
    };

    const saveResult = async () => {
      setFetching(true);
      try {
        const premios = [
          { premio: "1", numero: manualResult.p1 },
          { premio: "2", numero: manualResult.p2 },
          { premio: "3", numero: manualResult.p3 },
          { premio: "4", numero: manualResult.p4 },
          { premio: "5", numero: manualResult.p5 },
        ];

        const payload = {
          concurso: manualResult.concurso,
          data_sorteio: manualResult.data_sorteio,
          premios
        };

        const { error } = editingId 
          ? await supabase.from("federal_lottery_results").update(payload).eq("id", editingId)
          : await supabase.from("federal_lottery_results").insert(payload);

        if (error) throw error;
        toast({ title: editingId ? "Resultado atualizado" : "Resultado adicionado" });
        setOpen(false);
        setEditingId(null);
        queryClient.invalidateQueries({ queryKey: ["federal-results"] });
      } catch (err: any) {
        toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
      } finally {
        setFetching(false);
      }
    };
  
    const deleteResult = async (id: string) => {
      if (!confirm("Excluir este resultado?")) return;
      const { error } = await supabase.from("federal_lottery_results").delete().eq("id", id);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Resultado excluído" });
      queryClient.invalidateQueries({ queryKey: ["federal-results"] });
    };

 
   const { data: results, isLoading } = useQuery({
     queryKey: ["federal-results"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("federal_lottery_results")
         .select("*")
         .order("concurso", { ascending: false });
       if (error) throw error;
       return data;
     },
   });
 
   const fetchLatest = async () => {
     setFetching(true);
     try {
       const { data, error } = await supabase.functions.invoke("federal-lottery", {
         body: { concurso: manualResult.concurso || undefined }
       });
       
       if (error) throw error;
       if (data.error) throw new Error(data.error);

       toast({ title: `Concurso ${data.concurso} importado com sucesso!` });
       queryClient.invalidateQueries({ queryKey: ["federal-results"] });
     } catch (err: any) {
       console.error("Fetch latest error:", err);
       toast({ title: "Erro ao buscar resultado", description: err.message, variant: "destructive" });
     } finally {
       setFetching(false);
     }
   };
 
   return (
     <AdminLayout>
       <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
         <div>
           <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">Loteria Federal</h1>
           <p className="text-muted-foreground mt-1">Sincronize ou registre resultados oficiais para as ações.</p>
         </div>
          <div className="flex gap-2">
             <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditingId(null); }}>
               <Button variant="outline" onClick={handleAdd}><Plus className="mr-2 h-4 w-4" /> Adicionar Manual</Button>
               <DialogContent className="sm:max-w-md">
                 <DialogHeader className="p-6 pb-0"><DialogTitle className="text-xl font-bold">{editingId ? "Editar Resultado" : "Novo Resultado Manual"}</DialogTitle></DialogHeader>
                <div className="grid gap-6 p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Concurso</Label>
                       <Input placeholder="0000" className="bg-secondary/20 border-border h-12 rounded-xl" value={manualResult.concurso} onChange={e => setManualResult(p => ({ ...p, concurso: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Data do Sorteio</Label>
                       <Input type="date" className="bg-secondary/20 border-border h-12 rounded-xl" value={manualResult.data_sorteio} onChange={e => setManualResult(p => ({ ...p, data_sorteio: e.target.value }))} />
                    </div>
                  </div>
                   <div className="grid grid-cols-1 gap-3">
                     {[1, 2, 3, 4, 5].map(n => (
                      <div key={n} className="space-y-1">
                         <div className="flex items-center gap-3">
                           <Label className="text-[10px] uppercase font-bold text-muted-foreground min-w-[70px]">{n}º Prêmio</Label>
                           <Input placeholder="000000" className="bg-secondary/20 border-border h-10 rounded-lg flex-1 font-mono font-bold tracking-widest" value={(manualResult as any)[`p${n}`]} onChange={e => setManualResult(p => ({ ...p, [`p${n}`]: e.target.value }))} />
                         </div>
                      </div>
                    ))}
                  </div>
                    <Button onClick={saveResult} disabled={fetching || !manualResult.concurso || !manualResult.data_sorteio} className="h-12 bg-primary hover:bg-primary/90 rounded-xl font-bold">
                     {fetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Salvar Resultado
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
             <Button onClick={fetchLatest} disabled={fetching} variant="outline" className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 h-12 px-6 rounded-xl font-bold">
               {fetching ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <RefreshCw className="mr-2 h-5 w-5" />}
              Sincronizar API
            </Button>
          </div>
       </div>
 
        <Card className="border-border bg-card/50 backdrop-blur-xl overflow-hidden shadow-2xl">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground text-sm font-medium animate-pulse uppercase tracking-widest">Acessando servidores da CEF...</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-card/[0.02]">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground font-bold uppercase text-[9px] tracking-widest pl-8 py-5">Concurso</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase text-[9px] tracking-widest py-5">Data do Sorteio</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase text-[9px] tracking-widest py-5">Premiados (1º ao 5º)</TableHead>
                    <TableHead className="text-right text-muted-foreground font-bold uppercase text-[9px] tracking-widest pr-8 py-5">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results?.map((r: any) => (
                    <TableRow key={r.id} className="border-border hover:bg-card/[0.02] transition-colors group">
                      <TableCell className="pl-8 py-4">
                        <div className="flex items-center gap-2">
                          <Hash className="h-3.5 w-3.5 text-primary" />
                          <span className="text-sm font-bold text-foreground tracking-widest">{r.concurso}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">{format(new Date(r.data_sorteio + "T12:00:00"), "dd MMM, yyyy")}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          {r.premios.map((p: any) => (
                            <div 
                              key={p.premio} 
                              className={`flex flex-col items-center px-3 py-1.5 rounded-lg border ${
                                p.premio === "1" 
                                  ? "bg-primary/20 border-primary/40 shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]" 
                                  : "bg-secondary/20 border-border"
                              }`}
                              title={`${p.premio}º Prêmio`}
                            >
                              <span className={`text-[8px] font-bold uppercase tracking-tighter ${p.premio === "1" ? "text-primary" : "text-muted-foreground"}`}>{p.premio}º</span>
                              <span className={`font-mono text-xs font-bold ${p.premio === "1" ? "text-foreground" : "text-foreground"}`}>{p.numero}</span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl" onClick={() => handleEdit(r)}>
                            <Pencil className="h-4.5 w-4.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-xl" onClick={() => deleteResult(r.id)}>
                            <Trash2 className="h-4.5 w-4.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }