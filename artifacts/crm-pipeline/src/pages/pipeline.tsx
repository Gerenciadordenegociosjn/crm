import { useState, useMemo } from 'react';
import { useGetPipelineBoard, useUpdateDealStage, Deal, PipelineStage, DealStageUpdateStage } from '@workspace/api-client-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { getGetPipelineBoardQueryKey } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, LayoutDashboard, FileText, CheckCircle2, RefreshCw, Archive, UserPlus, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const STAGE_ICONS: Record<string, any> = {
  'lead_captado': UserPlus,
  'qualificacao': MessageSquare,
  'proposta': FileText,
  'negociacao': RefreshCw,
  'fechamento': CheckCircle2,
  'onboarding': LayoutDashboard,
  'ativo': Zap,
  'renovacao': RefreshCw,
  'encerrado': Archive
};

const STAGE_COLORS: Record<string, string> = {
  'lead_captado': 'bg-slate-100 text-slate-700 border-slate-200',
  'qualificacao': 'bg-blue-100 text-blue-700 border-blue-200',
  'proposta': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'negociacao': 'bg-violet-100 text-violet-700 border-violet-200',
  'fechamento': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'onboarding': 'bg-teal-100 text-teal-700 border-teal-200',
  'ativo': 'bg-green-100 text-green-700 border-green-200',
  'renovacao': 'bg-orange-100 text-orange-700 border-orange-200',
  'encerrado': 'bg-gray-100 text-gray-700 border-gray-200'
};

const STAGE_LABELS: Record<string, string> = {
  'lead_captado': 'Lead Captado',
  'qualificacao': 'Qualificação',
  'proposta': 'Proposta',
  'negociacao': 'Negociação',
  'fechamento': 'Fechamento',
  'onboarding': 'Onboarding',
  'ativo': 'Ativo',
  'renovacao': 'Renovação',
  'encerrado': 'Encerrado'
};

export default function PipelinePage() {
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: board, isLoading } = useGetPipelineBoard(
    { search: search || undefined }, 
    { query: { queryKey: getGetPipelineBoardQueryKey({ search: search || undefined }) } }
  );

  const updateStage = useUpdateDealStage();

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) return;

    const dealId = parseInt(draggableId, 10);
    const newStage = destination.droppableId as DealStageUpdateStage;

    // Optimistic update
    queryClient.setQueryData(getGetPipelineBoardQueryKey({ search: search || undefined }), (old: any) => {
      if (!old) return old;
      
      const newStages = JSON.parse(JSON.stringify(old.stages));
      let movedDeal: Deal | undefined;
      
      // Remove from old stage
      const sourceStage = newStages.find((s: any) => s.stage === source.droppableId);
      if (sourceStage) {
        const dealIndex = sourceStage.deals.findIndex((d: any) => d.id === dealId);
        if (dealIndex !== -1) {
          movedDeal = sourceStage.deals[dealIndex];
          if (movedDeal) movedDeal.stage = newStage;
          sourceStage.deals.splice(dealIndex, 1);
        }
      }
      
      // Add to new stage
      const destStage = newStages.find((s: any) => s.stage === newStage);
      if (destStage && movedDeal) {
        destStage.deals.splice(destination.index, 0, movedDeal);
      }
      
      return { stages: newStages };
    });

    updateStage.mutate({ id: dealId, data: { stage: newStage } }, {
      onError: () => {
        toast({ title: 'Erro ao mover negócio', variant: 'destructive' });
        queryClient.invalidateQueries({ queryKey: getGetPipelineBoardQueryKey({ search: search || undefined }) });
      }
    });
  };

  const columns = useMemo(() => {
    if (!board) return [];
    
    // Ensure all 9 stages are present even if empty
    const allStages = Object.keys(STAGE_LABELS);
    
    return allStages.map(stageKey => {
      const existing = board.stages.find(s => s.stage === stageKey);
      return {
        id: stageKey,
        title: STAGE_LABELS[stageKey],
        deals: existing ? existing.deals : [],
        count: existing ? existing.deals.length : 0,
        value: existing ? existing.deals.reduce((sum, d) => sum + (d.estimatedValue || 0), 0) : 0
      };
    });
  }, [board]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Pipeline de Vendas</h1>
          <p className="text-muted-foreground mt-1">Gerencie e movimente seus negócios através das etapas.</p>
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <Input 
            placeholder="Buscar negócio ou cliente..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 bg-background"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="w-80 shrink-0 bg-muted/30 rounded-lg border p-3 flex flex-col gap-3">
              <div className="flex justify-between items-center px-1">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-8 rounded-full" />
              </div>
              <Skeleton className="h-[120px] w-full rounded-md" />
              <Skeleton className="h-[120px] w-full rounded-md" />
            </div>
          ))}
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
            {columns.map(col => {
              const Icon = STAGE_ICONS[col.id] || FileText;
              return (
                <div key={col.id} className="w-80 shrink-0 flex flex-col max-h-full">
                  <div className={`mb-3 px-3 py-2 rounded-md border ${STAGE_COLORS[col.id]} flex items-center justify-between shadow-sm shrink-0`}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <h3 className="font-bold text-sm">{col.title}</h3>
                    </div>
                    <Badge variant="outline" className="bg-white/50">{col.count}</Badge>
                  </div>
                  
                  <div className="text-xs text-muted-foreground px-1 mb-2 shrink-0 flex justify-between">
                    <span>Total Estimado:</span>
                    <span className="font-mono font-medium text-foreground">{formatCurrency(col.value)}</span>
                  </div>

                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex-1 overflow-y-auto min-h-[150px] p-1 -mx-1 rounded-md transition-colors ${
                          snapshot.isDraggingOver ? 'bg-primary/5 border border-primary/20' : 'bg-muted/10'
                        }`}
                      >
                        {col.deals.map((deal, index) => (
                          <Draggable key={deal.id.toString()} draggableId={deal.id.toString()} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`mb-3 last:mb-0 transition-transform ${
                                  snapshot.isDragging ? 'rotate-2 scale-105 z-50' : ''
                                }`}
                                style={provided.draggableProps.style}
                              >
                                <Card className={`cursor-grab hover:border-primary/50 transition-colors ${snapshot.isDragging ? 'shadow-lg border-primary' : 'shadow-sm'}`}>
                                  <div className="p-3">
                                    <div className="flex justify-between items-start mb-2">
                                      <Link href={`/deals/${deal.id}`} className="font-semibold text-sm hover:text-primary hover:underline line-clamp-2">
                                        {deal.title}
                                      </Link>
                                    </div>
                                    
                                    <div className="space-y-2 mt-3">
                                      <div className="flex items-center text-xs text-muted-foreground">
                                        <UsersIcon className="h-3 w-3 mr-1.5 shrink-0" />
                                        <span className="truncate">{deal.clientName || 'Sem cliente'}</span>
                                      </div>
                                      
                                      <div className="flex items-center justify-between text-xs pt-1 border-t">
                                        <span className="font-mono font-semibold text-primary">
                                          {formatCurrency(deal.estimatedValue)}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
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

function UsersIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
