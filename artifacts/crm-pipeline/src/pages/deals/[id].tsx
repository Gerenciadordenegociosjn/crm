import { useParams } from 'wouter';
import { useGetDeal, useUpdateDeal, useListActivities, useCreateActivity, ActivityInputType, getGetDealQueryKey, getListActivitiesQueryKey } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Clock, MessageSquare, Briefcase, Plus, Send, AlertTriangle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const updateSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  estimatedValue: z.coerce.number().optional(),
  paymentFrequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).optional(),
  platform: z.string().optional(),
  niche: z.string().optional(),
  riskLevel: z.string().optional(),
  leadSource: z.string().optional(),
  hasBlockHistory: z.boolean().optional(),
  blockDescription: z.string().optional(),
  rentalStatus: z.string().optional(),
  stage: z.enum(['lead_captado', 'qualificacao', 'proposta', 'negociacao', 'fechamento', 'onboarding', 'ativo', 'renovacao', 'encerrado']),
});

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const dealId = parseInt(id, 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: dealData, isLoading } = useGetDeal(dealId, { query: { enabled: !!dealId, queryKey: getGetDealQueryKey(dealId) } });
  const { data: activitiesData } = useListActivities(dealId, { query: { enabled: !!dealId, queryKey: getListActivitiesQueryKey(dealId) } });
  
  const updateDeal = useUpdateDeal();
  const createActivity = useCreateActivity();

  const [noteText, setNoteText] = useState('');

  const form = useForm<z.infer<typeof updateSchema>>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      title: '',
      estimatedValue: 0,
      paymentFrequency: undefined,
      platform: '',
      niche: '',
      riskLevel: '',
      leadSource: '',
      hasBlockHistory: false,
      blockDescription: '',
      rentalStatus: '',
      stage: 'lead_captado' as any,
    }
  });

  const initializedForId = useRef<number | null>(null);

  useEffect(() => {
    if (dealData?.deal && initializedForId.current !== dealId) {
      initializedForId.current = dealId;
      const d = dealData.deal;
      form.reset({
        title: d.title || '',
        estimatedValue: d.estimatedValue || 0,
        paymentFrequency: (d as any).paymentFrequency || undefined,
        platform: d.platform || '',
        niche: d.niche || '',
        riskLevel: d.riskLevel || '',
        leadSource: d.leadSource || '',
        hasBlockHistory: d.hasBlockHistory || false,
        blockDescription: d.blockDescription || '',
        rentalStatus: d.rentalStatus || '',
        stage: d.stage as any,
      });
    }
  }, [dealData, dealId, form]);

  const onSubmit = (data: z.infer<typeof updateSchema>) => {
    updateDeal.mutate({ id: dealId, data: data as any }, {
      onSuccess: () => {
        toast({ title: 'Negócio atualizado com sucesso' });
        queryClient.invalidateQueries({ queryKey: getGetDealQueryKey(dealId) });
      },
      onError: (err) => {
        toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' });
      }
    });
  };

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    
    createActivity.mutate({
      dealId: dealId,
      data: {
        type: ActivityInputType.note,
        description: noteText.trim()
      }
    }, {
      onSuccess: () => {
        setNoteText('');
        queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey(dealId) });
        queryClient.invalidateQueries({ queryKey: getGetDealQueryKey(dealId) });
      }
    });
  };

  if (isLoading || !dealData) {
    return <div className="p-8 text-center">Carregando negócio...</div>;
  }

  const deal = dealData.deal;
  const activities = dealData.activities || activitiesData || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{deal.title}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            {deal.clientName && (
              <span className="flex items-center"><Briefcase className="h-3 w-3 mr-1" /> {deal.clientName}</span>
            )}
            <span>•</span>
            <Badge variant="secondary" className="uppercase text-[10px] font-bold tracking-wider">{deal.stage.replace('_', ' ')}</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-t-4 border-t-primary shadow-md">
            <CardHeader>
              <CardTitle>Detalhes do Negócio</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="title" render={({ field }) => (
                      <FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="stage" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Etapa</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="font-semibold text-primary"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="lead_captado">Lead Captado</SelectItem>
                            <SelectItem value="qualificacao">Qualificação</SelectItem>
                            <SelectItem value="proposta">Proposta</SelectItem>
                            <SelectItem value="negociacao">Negociação</SelectItem>
                            <SelectItem value="fechamento">Fechamento</SelectItem>
                            <SelectItem value="onboarding">Onboarding</SelectItem>
                            <SelectItem value="ativo">Ativo</SelectItem>
                            <SelectItem value="renovacao">Renovação</SelectItem>
                            <SelectItem value="encerrado">Encerrado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="estimatedValue" render={({ field }) => (
                      <FormItem><FormLabel>Valor Estimado</FormLabel><FormControl><Input type="number" step="0.01" {...field} className="font-mono" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="paymentFrequency" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequência de Pagamento</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="daily">Diário</SelectItem>
                            <SelectItem value="weekly">Semanal</SelectItem>
                            <SelectItem value="biweekly">Quinzenal</SelectItem>
                            <SelectItem value="monthly">Mensal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="platform" render={({ field }) => (
                      <FormItem><FormLabel>Plataforma</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="niche" render={({ field }) => (
                      <FormItem><FormLabel>Nicho</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="riskLevel" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nível de Risco</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="baixo">Baixo</SelectItem>
                            <SelectItem value="medio">Médio</SelectItem>
                            <SelectItem value="alto">Alto</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="rentalStatus" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status Locação</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="ativo">Ativo</SelectItem>
                            <SelectItem value="suspenso">Suspenso</SelectItem>
                            <SelectItem value="encerrado">Encerrado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="leadSource" render={({ field }) => (
                      <FormItem><FormLabel>Origem do Lead</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>

                  <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-md space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        <h4 className="font-semibold text-destructive">Histórico de Bloqueios</h4>
                      </div>
                      <FormField control={form.control} name="hasBlockHistory" render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          <FormLabel className="!mt-0">Possui Histórico?</FormLabel>
                        </FormItem>
                      )} />
                    </div>
                    {form.watch('hasBlockHistory') && (
                      <FormField control={form.control} name="blockDescription" render={({ field }) => (
                        <FormItem><FormLabel>Descrição dos Bloqueios</FormLabel><FormControl><Textarea {...field} className="resize-none" rows={3} /></FormControl><FormMessage /></FormItem>
                      )} />
                    )}
                  </div>

                  <div className="flex justify-end pt-2 border-t">
                    <Button type="submit" disabled={updateDeal.isPending}>{updateDeal.isPending ? 'Salvando...' : 'Salvar Alterações'}</Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-lg">Atividades</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4 border-b bg-card">
                <form onSubmit={handleAddActivity} className="flex flex-col gap-3">
                  <Textarea 
                    placeholder="Adicionar uma anotação..." 
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="min-h-[80px] resize-none text-sm"
                  />
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" disabled={!noteText.trim() || createActivity.isPending}>
                      <Send className="h-3 w-3 mr-2" />
                      {createActivity.isPending ? 'Salvando...' : 'Anotar'}
                    </Button>
                  </div>
                </form>
              </div>
              
              <div className="max-h-[500px] overflow-y-auto p-4 space-y-6">
                {activities.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">Nenhuma atividade registrada.</p>
                ) : (
                  activities.map((act) => (
                    <div key={act.id} className="relative pl-6">
                      {/* Timeline line */}
                      <div className="absolute left-[11px] top-6 bottom-[-24px] w-[2px] bg-border last:hidden" />
                      
                      <div className="absolute left-0 top-1">
                        {act.type === 'note' ? (
                          <div className="h-6 w-6 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center z-10 relative">
                            <MessageSquare className="h-3 w-3 text-blue-600" />
                          </div>
                        ) : act.type === 'stage_change' ? (
                          <div className="h-6 w-6 rounded-full bg-green-100 border border-green-200 flex items-center justify-center z-10 relative">
                            <Briefcase className="h-3 w-3 text-green-600" />
                          </div>
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center z-10 relative">
                            <Clock className="h-3 w-3 text-slate-600" />
                          </div>
                        )}
                      </div>
                      
                      <div className="bg-muted/30 border rounded-md p-3 shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-semibold">{act.userName || 'Sistema'}</span>
                          <span className="text-[10px] text-muted-foreground">{formatDateTime(act.createdAt)}</span>
                        </div>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{act.description}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
