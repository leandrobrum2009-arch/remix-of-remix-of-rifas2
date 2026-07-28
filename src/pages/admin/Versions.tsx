import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { APP_VERSION, CHANGELOG } from "@/lib/version";
import { CheckCircle2, AlertTriangle, Code, Database, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/useAdmin";

interface VersionRow {
  id: string;
  version: string;
  type: "code" | "database";
  notes: string | null;
  released_at: string;
}

export default function AdminVersions() {
  const { data: isAdmin } = useIsAdmin();
  const [rows, setRows] = useState<VersionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ version: "", type: "code" as "code" | "database", notes: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("app_versions")
      .select("*")
      .order("released_at", { ascending: false });
    if (error) toast.error("Erro ao carregar versões");
    else setRows((data as VersionRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const latestCode = rows.find((r) => r.type === "code");
  const latestDb = rows.find((r) => r.type === "database");

  const codeSynced = latestCode?.version === APP_VERSION;

  const submit = async () => {
    if (!form.version.trim()) return toast.error("Informe a versão");
    const { error } = await supabase.from("app_versions").insert({
      version: form.version.trim(),
      type: form.type,
      notes: form.notes.trim() || null,
    });
    if (error) return toast.error("Erro ao registrar: " + error.message);
    toast.success("Versão registrada");
    setForm({ version: "", type: "code", notes: "" });
    load();
  };

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-black">Versionamento</h1>
            <p className="text-sm text-muted-foreground">Acompanhe as versões do código e do banco de dados.</p>
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <Code className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Código</CardTitle>
                <CardDescription>Versão que este domínio está executando</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black">{APP_VERSION}</span>
                {codeSynced ? (
                  <Badge className="bg-green-500 gap-1"><CheckCircle2 className="h-3 w-3" /> Atualizado</Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Desatualizado</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Última versão registrada: <strong>{latestCode?.version ?? "—"}</strong>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <Database className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Banco de Dados</CardTitle>
                <CardDescription>Última migração registrada</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black">{latestDb?.version ?? "—"}</span>
                <Badge className="bg-green-500 gap-1"><CheckCircle2 className="h-3 w-3" /> Ativo</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Lançado em {latestDb ? new Date(latestDb.released_at).toLocaleString("pt-BR") : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Registrar nova versão</CardTitle>
              <CardDescription>Use após publicar mudanças de código ou migrações de banco.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <Label>Versão</Label>
                <Input placeholder="1.0.1" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as "code" | "database" })}
                >
                  <option value="code">Código</option>
                  <option value="database">Banco de dados</option>
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Notas</Label>
                <Textarea rows={1} placeholder="O que mudou nesta versão?" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="md:col-span-4">
                <Button onClick={submit}>Registrar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico</CardTitle>
            <CardDescription>Todas as versões registradas no banco.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma versão registrada.</p>}
            {rows.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                <div className="flex items-start gap-3">
                  {r.type === "code" ? <Code className="h-4 w-4 mt-0.5 text-primary" /> : <Database className="h-4 w-4 mt-0.5 text-primary" />}
                  <div>
                    <p className="font-bold text-sm">v{r.version} <span className="text-xs font-normal text-muted-foreground">— {r.type === "code" ? "Código" : "Banco de dados"}</span></p>
                    {r.notes && <p className="text-xs text-muted-foreground mt-0.5">{r.notes}</p>}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(r.released_at).toLocaleDateString("pt-BR")}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Changelog do código (build atual)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {CHANGELOG.map((c) => (
              <div key={c.version} className="rounded-md border border-border p-3">
                <p className="text-sm font-bold">v{c.version} <span className="text-xs font-normal text-muted-foreground">— {c.date}</span></p>
                <p className="text-xs text-muted-foreground mt-1">{c.notes}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}