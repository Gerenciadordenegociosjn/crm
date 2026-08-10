import { useState, useMemo } from 'react';
import {
  useGetPipelineBoard,
  useUpdateDealStage,
  useListSuppliers,
  Deal,
  DealStageUpdateStage,
  getGetPipelineBoardQueryKey,
} from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { formatCurrency } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  MessageSquare,
  LayoutDashboard,
  FileText,
  CheckCircle2,
  RefreshCw,
  Archive,
  UserPlus,
  Zap,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Users as UsersIcon,
  Building2,
} from 'lucide-react';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  addWeeks,
  addMonths,
  addYears,
  subWeeks,
  subMonths,
  subYears,
  getISOWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPaymentFrequencyLabel(val: string): string {
  switch (val) {
    case 'daily': return 'Diário';
    case 'weekly': return 'Semanal';
    case 'biweekly': return 'Quinzenal';
    case 'monthly': return 'Mensal';
    default: return val;
  }
}

// ── Stage metadata ────────────────────────────────────────────────────────────

const STAGE_ICONS: Record<string, React.ComponentType<any>> = {
  lead_captado: UserPlus,
  qualificacao: MessageSquare,
  proposta: FileText,
  negociacao: RefreshCw,
  fechamento: CheckCircle2,
  onboarding: LayoutDashboard,
  ativo: Zap,
  renovacao: RefreshCw,
  encerrado: Archive,
};

const STAGE_COLORS: Record<string, string> = {
  lead_captado: 'bg-slate-100 text-slate-700 border-slate-200',
  qualificacao: 'bg-primary/10 text-primary border-primary/20',
  proposta: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  negociacao: 'bg-violet-100 text-violet-700 border-violet-200',
  fechamento: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  onboarding: 'bg-teal-100 text-teal-700 border-teal-200',
  ativo: 'bg-green-100 text-green-700 border-green-200',
  renovacao: 'bg-orange-100 text-orange-700 border-orange-200',
  encerrado: 'bg-gray-100 text-gray-700 border-gray-200',
};

const STAGE_LABELS: Record<string, string> = {
  lead_captado: 'Lead Captado',
  qualificacao: 'Qualificação',
  proposta: 'Proposta',
  negociacao: 'Negociação',
  fechamento: 'Fechamento',
  onboarding: 'Onboarding',
  ativo: 'Ativo',
  renovacao: 'Renovação',
  encerrado: 'Encerrado',
};

// Supplier pill colors — cycles through a palette
const SUPPLIER_PILL_COLORS = [
  'bg-orange-500 text-white',
  'bg-emerald-600 text-white',
  'bg-violet-600 text-white',
  'bg-sky-600 text-white',
  'bg-rose-600 text-white',
  'bg-amber-500 text-white',
  'bg-teal-600 text-white',
  'bg-indigo-600 text-white',
  'bg-pink-600 text-white',
  'bg-cyan-600 text-white',
];

// ── Period helpers ────────────────────────────────────────────────────────────

type PeriodMode = 'week' | 'month' | 'year';

function getDateRange(mode: PeriodMode, cursor: Date) {
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

  if (mode === 'week') {
    const start = startOfWeek(cursor, { weekStartsOn: 1 });
    const end = endOfWeek(cursor, { weekStartsOn: 1 });
    const weekNum = getISOWeek(cursor);
    const weekLabel = `Sem. ${weekNum} · ${format(start, 'd', { locale: ptBR })}–${format(end, 'd MMM yyyy', { locale: ptBR })}`;
    return { start: fmt(start), end: fmt(end), label: weekLabel };
  }

  if (mode === 'month') {
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    const label = format(start, 'MMMM yyyy', { locale: ptBR });
    return { start: fmt(start), end: fmt(end), label: label.charAt(0).toUpperCase() + label.slice(1) };
  }

  // year
  const start = startOfYear(cursor);
  const end = endOfYear(cursor);
  return { start: fmt(start), end: fmt(end), label: format(start, 'yyyy') };
}

function moveCursor(cursor: Date, mode: PeriodMode, dir: 1 | -1): Date {
  if (mode === 'week') return dir === 1 ? addWeeks(cursor, 1) : subWeeks(cursor, 1);
  if (mode === 'month') return dir === 1 ? addMonths(cursor, 1) : subMonths(cursor, 1);
  return dir === 1 ? addYears(cursor, 1) : subYears(cursor, 1);
}

// ── Component ─────────────────────────────────────────────────────────────────

type PendingDrop = {
  dealId: number;
  newStage: DealStageUpdateStage;
  /** optimistic board state to revert on cancel */
  prevBoardSnapshot: any;
};

export default function PipelinePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [search, setSearch] = useState('');
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [cursor, setCursor] = useState<Date>(new Date());

  // Supplier selection modal state
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { start, end, label } = useMemo(
    () => getDateRange(periodMode, cursor),
    [periodMode, cursor],
  );

  const params = {
    search: search || undefined,
    start_date: start,
    end_date: end,
  } as any;

  const { data: board, isLoading } = useGetPipelineBoard(params, {
    query: { queryKey: getGetPipelineBoardQueryKey(params) },
  });

  const { data: suppliers = [] } = useListSuppliers();

  const updateStage = useUpdateDealStage();

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId) return;

    const dealId = parseInt(draggableId, 10);
    const newStage = destination.droppableId as DealStageUpdateStage;

    // Sales cannot move to 'ativo'
    if (newStage === 'ativo' && !isAdmin) {
      toast({
        title: 'Acesso negado',
        description: 'Somente administradores podem mover negócios para Ativo.',
        variant: 'destructive',
      });
      return;
    }

    // Apply optimistic update
    const prevSnapshot = queryClient.getQueryData(getGetPipelineBoardQueryKey(params));
    queryClient.setQueryData(getGetPipelineBoardQueryKey(params), (old: any) => {
      if (!old) return old;
      const newStages = JSON.parse(JSON.stringify(old.stages));
      let movedDeal: Deal | undefined;

      const sourceStage = newStages.find((s: any) => s.stage === source.droppableId);
      if (sourceStage) {
        const idx = sourceStage.deals.findIndex((d: any) => d.id === dealId);
        if (idx !== -1) {
          movedDeal = sourceStage.deals[idx];
          if (movedDeal) movedDeal.stage = newStage;
          sourceStage.deals.splice(idx, 1);
        }
      }

      const destStage = newStages.find((s: any) => s.stage === newStage);
      if (destStage && movedDeal) destStage.deals.splice(destination.index, 0, movedDeal);

      return { stages: newStages };
    });

    // For 'ativo', pause and ask admin to pick a supplier
    if (newStage === 'ativo') {
      setSelectedSupplierId(null);
      setPendingDrop({ dealId, newStage, prevBoardSnapshot: prevSnapshot });
      return;
    }

    // All other stages: persist immediately
    updateStage.mutate(
      { id: dealId, data: { stage: newStage } },
      {
        onError: () => {
          toast({ title: 'Erro ao mover negócio', variant: 'destructive' });
          queryClient.invalidateQueries({ queryKey: getGetPipelineBoardQueryKey(params) });
        },
      },
    );
  };

  const handleSupplierConfirm = () => {
    if (!pendingDrop) return;
    const { dealId, newStage } = pendingDrop;

    updateStage.mutate(
      {
        id: dealId,
        data: {
          stage: newStage,
          supplierId: selectedSupplierId ?? undefined,
        } as any,
      },
      {
        onSuccess: () => {
          toast({ title: 'Negócio ativado com sucesso!' });
          setPendingDrop(null);
          setSelectedSupplierId(null);
          queryClient.invalidateQueries({ queryKey: getGetPipelineBoardQueryKey(params) });
        },
        onError: () => {
          toast({ title: 'Erro ao mover negócio', variant: 'destructive' });
          // Revert optimistic update
          if (pendingDrop.prevBoardSnapshot) {
            queryClient.setQueryData(getGetPipelineBoardQueryKey(params), pendingDrop.prevBoardSnapshot);
          }
          setPendingDrop(null);
          setSelectedSupplierId(null);
        },
      },
    );
  };

  const handleSupplierCancel = () => {
    if (pendingDrop?.prevBoardSnapshot) {
      queryClient.setQueryData(getGetPipelineBoardQueryKey(params), pendingDrop.prevBoardSnapshot);
    }
    setPendingDrop(null);
    setSelectedSupplierId(null);
  };

  const columns = useMemo(() => {
    const allStages = Object.keys(STAGE_LABELS);
    return allStages.map((stageKey) => {
      const existing = board?.stages.find((s) => s.stage === stageKey);
      return {
        id: stageKey,
        title: STAGE_LABELS[stageKey],
        deals: existing ? existing.deals : [],
        count: existing ? existing.deals.length : 0,
        value: existing ? existing.deals.reduce((sum, d) => sum + (d.estimatedValue || 0), 0) : 0,
      };
    });
  }, [board]);

  const totalDeals = columns.reduce((s, c) => s + c.count, 0);
  const totalValue = columns.reduce((s, c) => s + c.value, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Supplier selection modal */}
      <Dialog open={pendingDrop !== null} onOpenChange={(open) => { if (!open) handleSupplierCancel(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Selecionar Fornecedor
            </DialogTitle>
            <DialogDescription>
              Escolha o fornecedor que irá atender este cliente na ativação.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {(suppliers as any[]).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum fornecedor cadastrado. Acesse <strong>Fornecedores</strong> no menu para adicionar.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(suppliers as any[]).map((s, idx) => {
                  const colorClass = SUPPLIER_PILL_COLORS[idx % SUPPLIER_PILL_COLORS.length];
                  const isSelected = selectedSupplierId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSupplierId(isSelected ? null : s.id)}
                      className={`
                        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold
                        transition-all border-2
                        ${colorClass}
                        ${isSelected
                          ? 'ring-2 ring-offset-2 ring-foreground scale-105 border-transparent'
                          : 'border-transparent opacity-80 hover:opacity-100 hover:scale-105'}
                      `}
                    >
                      {s.nickname || s.companyName}
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedSupplierId && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              Fornecedor selecionado:{' '}
              <span className="font-semibold text-foreground">
                {(suppliers as any[]).find((s) => s.id === selectedSupplierId)?.companyName}
              </span>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleSupplierCancel}>
              Cancelar
            </Button>
            <Button
              onClick={handleSupplierConfirm}
              disabled={updateStage.isPending}
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              {updateStage.isPending ? 'Ativando...' : 'Confirmar Ativação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="shrink-0 mb-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Pipeline de Vendas</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Negócios captados no período · <span className="font-semibold text-foreground">{totalDeals}</span> negócios ·{' '}
              <span className="font-semibold text-primary font-mono">{formatCurrency(totalValue)}</span>
            </p>
          </div>

          {/* Search */}
          <div className="flex w-full sm:w-auto items-center gap-2">
            <Input
              placeholder="Buscar negócio ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-60 bg-background"
            />
          </div>
        </div>

        {/* Period controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode tabs */}
          <div className="flex rounded-lg border bg-muted/40 p-0.5 gap-0.5">
            {(['week', 'month', 'year'] as PeriodMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setPeriodMode(m); setCursor(new Date()); }}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  periodMode === m
                    ? 'bg-background shadow text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'week' ? 'Semana' : m === 'month' ? 'Mês' : 'Ano'}
              </button>
            ))}
          </div>

          {/* Navigator */}
          <div className="flex items-center gap-1 rounded-lg border bg-background px-2 py-1 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setCursor((c) => moveCursor(c, periodMode, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="flex items-center gap-1.5 px-2 text-sm font-semibold min-w-[160px] justify-center capitalize">
              <CalendarDays className="h-3.5 w-3.5 text-primary shrink-0" />
              {label}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setCursor((c) => moveCursor(c, periodMode, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Today shortcut */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setCursor(new Date())}
          >
            Hoje
          </Button>
        </div>
      </div>

      {/* Kanban board */}
      {isLoading ? (
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-72 shrink-0 bg-muted/30 rounded-lg border p-3 flex flex-col gap-3">
              <div className="flex justify-between items-center px-1">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-8 rounded-full" />
              </div>
              <Skeleton className="h-[100px] w-full rounded-md" />
              <Skeleton className="h-[100px] w-full rounded-md" />
            </div>
          ))}
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
            {columns.map((col) => {
              const Icon = STAGE_ICONS[col.id] || FileText;
              // Mark the 'ativo' column as admin-only visually for non-admins
              const isAtivo = col.id === 'ativo';
              const isDropDisabled = isAtivo && !isAdmin;
              return (
                <div key={col.id} className="w-72 shrink-0 flex flex-col max-h-full">
                  {/* Column header */}
                  <div
                    className={`mb-2 px-3 py-2 rounded-md border ${STAGE_COLORS[col.id]} flex items-center justify-between shadow-sm shrink-0`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      <h3 className="font-bold text-xs">{col.title}</h3>
                      {isAtivo && !isAdmin && (
                        <span className="text-[9px] bg-black/10 px-1 py-0.5 rounded font-medium">Admin</span>
                      )}
                    </div>
                    <Badge variant="outline" className="bg-white/50 text-xs px-1.5 py-0">
                      {col.count}
                    </Badge>
                  </div>

                  {/* Total value */}
                  <div className="text-[11px] text-muted-foreground px-1 mb-1.5 shrink-0 flex justify-between">
                    <span>Total</span>
                    <span className="font-mono font-semibold text-foreground">{formatCurrency(col.value)}</span>
                  </div>

                  {/* Drop zone */}
                  <Droppable droppableId={col.id} isDropDisabled={isDropDisabled}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex-1 overflow-y-auto min-h-[120px] p-1 -mx-1 rounded-md transition-colors ${
                          snapshot.isDraggingOver
                            ? 'bg-primary/5 border border-primary/20'
                            : isDropDisabled
                            ? 'bg-muted/5 opacity-60'
                            : 'bg-muted/10'
                        }`}
                      >
                        {col.deals.length === 0 && !snapshot.isDraggingOver && (
                          <div className="flex items-center justify-center h-20 text-[11px] text-muted-foreground/50 italic">
                            Nenhum negócio
                          </div>
                        )}
                        {col.deals.map((deal, index) => (
                          <Draggable
                            key={deal.id.toString()}
                            draggableId={deal.id.toString()}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`mb-2 last:mb-0 transition-transform ${
                                  snapshot.isDragging ? 'rotate-1 scale-105 z-50' : ''
                                }`}
                                style={provided.draggableProps.style}
                              >
                                <Card
                                  className={`cursor-grab hover:border-primary/40 transition-colors ${
                                    snapshot.isDragging ? 'shadow-lg border-primary' : 'shadow-sm'
                                  }`}
                                >
                                  <div className="p-2.5">
                                    <Link
                                      href={`/deals/${deal.id}`}
                                      className="font-semibold text-xs hover:text-primary hover:underline line-clamp-2 block mb-2"
                                    >
                                      {deal.title}
                                    </Link>

                                    <div className="space-y-1.5">
                                      <div className="flex items-center text-[11px] text-muted-foreground">
                                        <UsersIcon className="h-3 w-3 mr-1 shrink-0" />
                                        <span className="truncate">{(deal as any).clientName || 'Sem cliente'}</span>
                                      </div>

                                      {(deal as any).supplierName && (
                                        <div className="flex items-center text-[11px] text-muted-foreground">
                                          <Building2 className="h-3 w-3 mr-1 shrink-0" />
                                          <span className="truncate font-medium text-green-700">{(deal as any).supplierName}</span>
                                        </div>
                                      )}

                                      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t">
                                        <div className="flex items-center gap-1 min-w-0">
                                          <span className="font-mono font-semibold text-primary shrink-0">
                                            {formatCurrency(deal.estimatedValue)}
                                          </span>
                                          {(deal as any).paymentFrequency && (
                                            <span className="text-[9px] font-medium text-primary/70 bg-primary/10 px-1 py-0.5 rounded shrink-0">
                                              {getPaymentFrequencyLabel((deal as any).paymentFrequency)}
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0 ml-1">
                                          {deal.platform || 'N/A'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}
    </div>
  );
}
