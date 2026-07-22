import { useState } from 'react';
import { useListAdAccounts, useCreateAdAccount, useListClients, getListAdAccountsQueryKey } from '@workspace/api-client-react';
import { Card, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Search, CreditCard, Filter } from 'lucide-react';

const adAccountSchema = z.object({
  clientId: z.coerce.number().optional(),
  platform: z.string().min(1, 'Plataforma é obrigatória'),
  accountIdentifier: z.string().min(1, 'Identificador é obrigatório'),
  monthlyLimit: z.coerce.number().optional(),
  status: z.enum(['ativa', 'bloqueada', 'em_revisao', 'encerrada']),
  rentalPeriodType: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).optional().nullable(),
});

export default function AdAccountsPage() {
  const [platformFilter, setPlatformFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const listParams: any = {};
  if (platformFilter && platformFilter !== 'all') listParams.platform = platformFilter;
  if (statusFilter && statusFilter !== 'all') listParams.status = statusFilter;

  const { data: accountsResponse, isLoading } = useListAdAccounts(listParams);
  const { data: clientsResponse } = useListClients({ limit: 100 });
  const createAccount = useCreateAdAccount();

  const form = useForm<z.infer<typeof adAccountSchema>>({
    resolver: zodResolver(adAccountSchema),
    defaultValues: {
      platform: 'Meta Ads',
      accountIdentifier: '',
      monthlyLimit: 0,
      status: 'em_revisao',
      rentalPeriodType: 'monthly',
    }
  });

  const onSubmit = (data: z.infer<typeof adAccountSchema>) => {
    createAccount.mutate({ data: data as any }, {
      onSuccess: () => {
        toast({ title: 'Conta criada com sucesso' });
        queryClient.invalidateQueries({ queryKey: getListAdAccountsQueryKey() });
        setIsNewModalOpen(false);
        form.reset();
      },
      onError: (err) => {
        toast({ title: 'Erro ao criar conta', description: err.message, variant: 'destructive' });
      }
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ativa': return 'success';
      case 'bloqueada': return 'destructive';
      case 'encerrada': return 'secondary';
      default: return 'warning';
    }
  };

  const getRentalLabel = (val: string) => {
    switch(val) {
      case 'daily': return 'Diário';
      case 'weekly': return 'Semanal';
      case 'biweekly': return 'Quinzenal';
      case 'monthly': return 'Mensal';
      default: return '-';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center"><CreditCard className="mr-3 h-8 w-8 text-primary" /> Contas de Anúncio</h1>
          <p className="text-muted-foreground mt-1">Gerencie os BMs e perfis de locação ativos.</p>
        </div>
        <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Nova Conta</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Conta de Anúncio</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="clientId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente Associado</FormLabel>
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
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="platform" render={({ field }) => (
                    <FormItem><FormLabel>Plataforma</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="accountIdentifier" render={({ field }) => (
                    <FormItem><FormLabel>ID da Conta (BM/Pixel)</FormLabel><FormControl><Input {...field} className="font-mono text-xs" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="monthlyLimit" render={({ field }) => (
                    <FormItem><FormLabel>Limite Mensal (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status Inicial</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="em_revisao">Em Revisão</SelectItem>
                          <SelectItem value="ativa">Ativa</SelectItem>
                          <SelectItem value="bloqueada">Bloqueada</SelectItem>
                          <SelectItem value="encerrada">Encerrada</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="rentalPeriodType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modalidade de Locação</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "monthly"}>
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
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createAccount.isPending}>{createAccount.isPending ? 'Salvando...' : 'Salvar'}</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="py-4 border-b flex flex-row items-center gap-4 bg-muted/20">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros:</span>
          </div>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[180px] h-8 text-xs bg-background"><SelectValue placeholder="Todas Plataformas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Plataformas</SelectItem>
              <SelectItem value="Meta Ads">Meta Ads</SelectItem>
              <SelectItem value="Google Ads">Google Ads</SelectItem>
              <SelectItem value="TikTok Ads">TikTok Ads</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-8 text-xs bg-background"><SelectValue placeholder="Qualquer Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer Status</SelectItem>
              <SelectItem value="ativa">Ativa</SelectItem>
              <SelectItem value="em_revisao">Em Revisão</SelectItem>
              <SelectItem value="bloqueada">Bloqueada</SelectItem>
              <SelectItem value="encerrada">Encerrada</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID / Identificador</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Modalidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Limite Mensal</TableHead>
                <TableHead>Data Início</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">Carregando contas...</TableCell></TableRow>
              ) : accountsResponse?.data.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">Nenhuma conta encontrada.</TableCell></TableRow>
              ) : accountsResponse?.data.map((acc: any) => (
                <TableRow key={acc.id} className="hover:bg-muted/10">
                  <TableCell className="font-mono text-sm font-semibold">{acc.accountIdentifier}</TableCell>
                  <TableCell>
                    {acc.clientId ? (
                      <Link href={`/clients/${acc.clientId}`} className="hover:underline text-primary">{acc.clientName}</Link>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{acc.platform}</TableCell>
                  <TableCell>{getRentalLabel(acc.rentalPeriodType)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(acc.status)} className="uppercase text-[10px] tracking-wider">
                      {acc.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(acc.monthlyLimit)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(acc.startDate || acc.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
