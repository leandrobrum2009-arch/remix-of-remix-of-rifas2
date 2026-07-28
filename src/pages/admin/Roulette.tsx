import AdminLayout from "@/components/AdminLayout";
 import { useAdminRoulette, useAdminRouletteStats } from "@/hooks/useAdmin";
 import { useGlobalRouletteSpins } from "@/hooks/useData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Dices, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

 export default function AdminRoulette() {
   const { data: prizes, isLoading } = useAdminRoulette();
   const { data: stats, isLoading: isLoadingStats } = useAdminRouletteStats();
   const { data: recentSpins } = useGlobalRouletteSpins(10);
 
   return (
     <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
            Roletas Premiadas
          </h1>
          <p className="text-muted-foreground mt-1">Configure prêmios, cores e probabilidades da roleta.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-foreground font-bold shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] border-none">
          <Plus className="mr-2 h-4 w-4" /> Novo Prêmio
         </Button>
       </div>
 
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
         <Card className="border-border bg-card/50 backdrop-blur-xl">
           <CardContent className="p-6">
             <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Total de Giros</p>
             <h3 className="text-2xl font-black text-foreground">{stats?.totalSpins || 0}</h3>
           </CardContent>
         </Card>
         <Card className="border-border bg-card/50 backdrop-blur-xl">
           <CardContent className="p-6">
             <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Prêmios Distribuídos</p>
             <h3 className="text-2xl font-black text-emerald-500">R$ {stats?.totalPrizesValue.toFixed(2) || "0.00"}</h3>
           </CardContent>
         </Card>
         <Card className="border-border bg-card/50 backdrop-blur-xl">
           <CardContent className="p-6">
             <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Giros Grátis / Pagos</p>
             <h3 className="text-2xl font-black text-foreground">
               {stats?.freeSpinsCount || 0} <span className="text-muted-foreground text-sm">/ {stats?.paidSpinsCount || 0}</span>
             </h3>
           </CardContent>
         </Card>
         <Card className="border-border bg-card/50 backdrop-blur-xl">
           <CardContent className="p-6">
             <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Receita Estimada</p>
             <h3 className="text-2xl font-black text-primary">R$ {stats?.estimatedRevenue.toFixed(2) || "0.00"}</h3>
           </CardContent>
         </Card>
       </div>
 
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <Card className="lg:col-span-2 border-border bg-card/50 backdrop-blur-xl">
           <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Prêmio</TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Tipo</TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Valor</TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Chance</TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Cor Visual</TableHead>
                  <TableHead className="text-right text-muted-foreground font-bold uppercase text-[10px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prizes?.map((p) => (
                  <TableRow key={p.id} className="border-border hover:bg-secondary/20 transition-colors group">
                    <TableCell>
                      <span className="font-bold text-foreground tracking-tight">{p.label}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-secondary/20 border-border text-foreground capitalize text-[10px]">
                        {p.prize_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-emerald-500 font-bold font-mono text-xs">
                      R$ {Number(p.value).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-secondary/20 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary" 
                            style={{ width: `${p.chance_percent}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-foreground">{p.chance_percent}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor: p.color }} />
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">{p.color}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-card/10">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {prizes?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground font-medium italic">
                      Nenhum prêmio configurado na roleta.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
           </CardContent>
         </Card>

         <div className="space-y-6">
           <Card className="border-border bg-card/50 backdrop-blur-xl">
             <CardContent className="p-6">
               <h3 className="text-sm font-black uppercase text-foreground tracking-widest mb-4 flex items-center gap-2">
                 <Dices className="h-4 w-4 text-primary" />
                 Atividade Recente
               </h3>
               <div className="space-y-4">
                 {recentSpins?.map((spin, i) => (
                   <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                     <div>
                       <p className="text-xs font-bold text-foreground">{spin.profiles?.name}</p>
                       <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">{spin.campaigns?.title}</p>
                     </div>
                     <div className="text-right">
                       <p className="text-xs font-black text-primary uppercase italic">{spin.prize_label}</p>
                       <p className="text-[10px] text-muted-foreground">{new Date(spin.created_at).toLocaleTimeString()}</p>
                     </div>
                   </div>
                 ))}
                 {(!recentSpins || recentSpins.length === 0) && (
                   <p className="text-xs text-muted-foreground italic text-center py-4">Nenhuma atividade recente.</p>
                 )}
               </div>
             </CardContent>
           </Card>

           <Card className="border-border bg-primary/5 backdrop-blur-xl border-primary/20">
             <CardContent className="p-6">
               <h3 className="text-sm font-black uppercase text-primary tracking-widest mb-2">Saúde do Payout</h3>
               <div className="space-y-4">
                 <div>
                   <div className="flex justify-between text-[10px] uppercase font-bold mb-1">
                     <span className="text-muted-foreground">Taxa de Premiação</span>
                     <span className="text-foreground">
                       {stats?.estimatedRevenue 
                         ? ((stats.totalPrizesValue / stats.estimatedRevenue) * 100).toFixed(1) 
                         : "0.0"}%
                     </span>
                   </div>
                   <div className="h-1.5 w-full bg-secondary/20 rounded-full overflow-hidden">
                     <div 
                       className="h-full bg-primary" 
                       style={{ width: `${Math.min(100, (stats?.estimatedRevenue ? (stats.totalPrizesValue / stats.estimatedRevenue) * 100 : 0))}%` }}
                     />
                   </div>
                 </div>
                 <p className="text-[10px] text-muted-foreground italic">
                   A taxa de premiação ideal deve ser monitorada para garantir a sustentabilidade da roleta.
                 </p>
               </div>
             </CardContent>
           </Card>
         </div>
       </div>
    </AdminLayout>
  );
}
