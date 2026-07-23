import { useState, useEffect } from 'react';
import { useListDeals, useCreateDeal, useListClients, useGetClient, useListUsers, DealStage, DealInputStage, getListDealsQueryKey, getGetClientQueryKey } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Search, ArrowRight } from 'lucide-react';

const dealSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  clientId: z.coerce.number().optional(),
  ownerId: z.coerce.number().optional().nullable(),
  stage: z.enum(['lead_captado', 'qualificacao', 'proposta', 'negociacao', 'fechamento', 'onboarding', 'ativo', 'renovacao', 'encerrado']),
  estimatedValue: z.coerce.number().optional(),
  paymentFrequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).optional(),
  platform: z.string().optional(),
  niche: z.string().optional(),
});

export default function DealsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dealsResponse, isLoading } = useListDeals({ search, page, limit: 20 });
  const { data: clientsResponse } = useListClients({ limit: 100 });
  const { data: users = [] } = useListUsers();
  const salesUsers = users.filter(u => u.role === 'sales');
  
  const createDeal = useCreateDeal();

  const form = useForm<z.infer<typeof dealSchema>>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      title: '',
      stage: 'lead_captado',
      estimatedValue: 0,
      platform: 'Meta Ads',
      niche: '',
      ownerId: null,
    }
  });

  const selectedClientId = useWatch({ control: form.control, name: 'clientId' });
  const { data: selectedClientData } = useGetClient(selectedClientId || 0, { 
    query: { enabled: !!selectedClientId, queryKey: getGetClientQueryKey(selectedClientId || 0) } 
  });

  const [autoFilled, setAutoFilled] = useState(false);

  useEffect(() => {
    if (selectedClientData?.client && (selectedClientData.client as any).assignedSalesId) {
      form.setValue('ownerId', (selectedClientData.client as any).assignedSalesId);
      setAutoFilled(true);
    } else {
      setAutoFilled(false);
    }
  }, [selectedClientData, form]);

  const onSubmit = (data: z.infer<typeof dealSchema>) => {
    createDeal.mutate({ data: data as any }, {
      onSuccess: () => {
        toast({ title: 'Negócio criado com sucesso' });
        queryClient.invalidateQueries({ queryKey: getListDealsQueryKey() });
        setIsNewModalOpen(false);
        form.reset();
        setAutoFilled(false);
      },
      onError: (err) => {
        toast({ title: 'Erro ao criar negócio', description: err.message, variant: 'destructive' });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Negócios</h1>
          <p className="text-muted-foreground mt-1">Lista completa de todos os negócios no sistema.</p>
        </div>
        <Dialog open={isNewModalOpen} onOpenChange={(open) => {
          setIsNewModalOpen(open);
          if (!open) { form.reset(); setAutoFilled(false); }
        }}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Novo Negócio</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Negócio</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="clientId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value?.toString() || ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {clientsResponse?.data.map(c => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="stage" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Etapa Inicial</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="lead_captado">Lead Captado</SelectItem>
                          <SelectItem value="qualificacao">Qualificação</SelectItem>
                          <SelectItem value="proposta">Proposta</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                
                <FormField control={form.control} name="ownerId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <Select onValueChange={(val) => { field.onChange(parseInt(val)); setAutoFilled(false); }} value={field.value?.toString() || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione o responsável" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {salesUsers.map(u => (
                          <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {autoFilled && <FormDescription className="text-[10px] text-primary">Preenchido automaticamente pelo vendedor do cliente.</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="estimatedValue" render={({ field }) => (
                    <FormItem><FormLabel>Valor Estimado (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
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
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="platform" render={({ field }) => (
                    <FormItem><FormLabel>Plataforma</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="niche" render={({ field }) => (
                    <FormItem><FormLabel>Nicho</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createDeal.isPending}>{createDeal.isPending ? 'Salvando...' : 'Salvar'}</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="py-4 border-b">
          <div className="flex items-center">
            <Search className="h-4 w-4 text-muted-foreground mr-2" />
            <Input 
              placeholder="Buscar por título ou cliente..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm h-9 border-none bg-transparent shadow-none focus-visible:ring-0 px-0"
            />
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Negócio</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">Carregando negócios...</TableCell></TableRow>
              ) : dealsResponse?.data.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">Nenhum negócio encontrado.</TableCell></TableRow>
              ) : dealsResponse?.data.map((deal) => (
                <TableRow key={deal.id} className="hover:bg-muted/20">
                  <TableCell className="font-semibold text-primary"><Link href={`/deals/${deal.id}`}>{deal.title}</Link></TableCell>
                  <TableCell>{deal.clientName || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="uppercase text-[10px] tracking-wider font-bold">
                      {deal.stage.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">{formatCurrency(deal.estimatedValue)}</TableCell>
                  <TableCell>{deal.platform || '-'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(deal.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/deals/${deal.id}`} className="inline-flex items-center text-xs font-semibold text-primary hover:underline">
                      Abrir <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
