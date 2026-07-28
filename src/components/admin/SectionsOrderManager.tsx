import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const SECTION_LABELS: Record<string, string> = {
  gallery: "Galeria de Imagens",
  features: "Selos de Confiança",
  header: "Título e Informações",
  timer: "Cronômetro / Tempo Restante",
  live_stream: "Transmissão ao Vivo",
  steps: "Como Participar (3 passos)",
  progress: "Barra de Progresso",
  purchase: "Área de Compra",
  live_draw: "Sorteio ao Vivo",
  events: "Hora Premiada / Próximos Eventos",
  prizes: "Cotas Premiadas",
  ranking: "Ranking de Compradores",
  description: "Descrição da Ação",
  social_proof: "Depoimentos e Prova Social",
  faq: "Dúvidas Frequentes (FAQ)",
  cta: "Chamada Final (CTA)",
  roulette_footer: "Roleta - Prêmios e Ganhadores",
  scratch_footer: "Raspadinha - Prêmios e Ganhadores",
  box_footer: "Caixas Surpresas - Prêmios e Ganhadores",
  winners: "Histórico de Ganhadores",
};

const DEFAULT_ORDER = ["gallery", "features", "header", "timer", "live_stream", "steps", "progress", "purchase", "live_draw", "events", "prizes", "ranking", "winners", "description", "social_proof", "faq", "cta", "roulette_footer", "scratch_footer", "box_footer"];
const ALL_SECTIONS = DEFAULT_ORDER.filter((section) => SECTION_LABELS[section]);

function SortableRow({ id, index, onToggle }: { id: string; index: number; onToggle: (id: string, enabled: boolean) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl shadow-sm"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground p-1 -ml-1"
        {...attributes}
        {...listeners}
        aria-label="Arrastar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground font-bold text-xs">
        {index + 1}
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold">{SECTION_LABELS[id] ?? id}</p>
      </div>
      <Switch checked onCheckedChange={() => onToggle(id, false)} />
    </div>
  );
}

export default function SectionsOrderManager({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const enabled = value.filter((s) => ALL_SECTIONS.includes(s));
  const disabled = ALL_SECTIONS.filter((s) => !enabled.includes(s));

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = enabled.indexOf(String(active.id));
    const newIndex = enabled.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(enabled, oldIndex, newIndex));
  };

  const toggle = (id: string, on: boolean) => {
    if (on) onChange([...enabled, id]);
    else onChange(enabled.filter((s) => s !== id));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-base font-bold">Seções Ativas</Label>
        <p className="text-xs text-muted-foreground">
          Arraste pelo ícone à esquerda para reordenar. Use o interruptor para ocultar uma seção da página da campanha.
        </p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={enabled} strategy={verticalListSortingStrategy}>
          <div className="grid gap-2">
            {enabled.map((id, index) => (
              <SortableRow key={id} id={id} index={index} onToggle={toggle} />
            ))}
            {enabled.length === 0 && (
              <p className="text-xs text-muted-foreground italic p-3 border border-dashed border-border rounded-xl">
                Nenhuma seção ativa. Habilite ao menos uma abaixo.
              </p>
            )}
          </div>
        </SortableContext>
      </DndContext>

      {disabled.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-border">
          <Label className="text-base font-bold">Seções Ocultas</Label>
          <p className="text-xs text-muted-foreground">Ative para incluir na página da campanha.</p>
          <div className="grid gap-2">
            {disabled.map((id) => (
              <div
                key={id}
                className="flex items-center gap-3 p-3 bg-card/50 border border-dashed border-border rounded-xl"
              >
                <div className="h-8 w-8 rounded-lg bg-secondary/50 flex items-center justify-center text-muted-foreground/60">
                  —
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-muted-foreground">{SECTION_LABELS[id] ?? id}</p>
                </div>
                <Switch checked={false} onCheckedChange={() => toggle(id, true)} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}