import { useParams } from 'wouter';
import { useGetClient, useUpdateClient, getGetClientQueryKey, useListUsers } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Briefcase, CreditCard, Mail, Phone, MapPin, User as UserIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';

const updateClientSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  document: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  assignedSalesId: z.coerce.number().optional().nullable(),
});

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const clientId = parseInt(id, 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: users = [] } = useListUsers();
  const salesUsers = users.filter(u => u.role === 'sales');

  const { data: detailData, isLoading } = useGetClient(clientId, { query: { enabled: !!clientId, queryKey: getGetClientQueryKey(clientId) } });
  const updateClient = useUpdateClient();

  const form = useForm<z.infer<typeof updateClientSchema>>({
    resolver: zodResolver(updateClientSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      document: '',
      type: '',
      status: '',
      notes: '',
      assignedSalesId: null,
    }
  });

  const initializedForId = useRef<number | null>(null);

  useEffect(() => {
    if (detailData?.client && initializedForId.current !== clientId) {
      initializedForId.current = clientId;
      const c = detailData.client as any;
      form.reset({
        name: c.name || '',
        email: c.email || '',
        phone: c.phone || '',
        document: c.document || '',
        type: c.type || '',
        status: c.status || '',
        notes: c.notes || '',
        assignedSalesId: c.assignedSalesId || null,
      });
    }
  }, [detailData, clientId, form]);

  const onSubmit = (data: z.infer<typeof updateClientSchema>) => {
    updateClient.mutate({ id: clientId, data: data as any }, {
      onSuccess: () => {
        toast({ title: 'Cliente atualizado com sucesso' });
        queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(clientId) });
      },
      onError: (err) => {
        toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' });
      }
    });
  };

  if (isLoading || !detailData) {
    return <div className="p-8 text-center">Carregando cliente...</div>;
  }

  const { client, deals, adAccounts } = detailData as any;

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
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/clients">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{client.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <Badge variant={client.status === 'ativo' ? 'success' : 'secondary'} className="uppercase text-[10px]">
              {client.status || 'Ativo'}
            </Badge>
            <span className="font-mono text-xs">{client.document}</span>
            {client.assignedSalesName && (
              <span className="flex items-center gap-1 text-xs border-l pl-3 ml-1">
                <UserIcon className="h-3 w-3" /> Vendedor responsável: <strong className="text-foreground">{client.assignedSalesName}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-t-4 border-t-primary shadow-md">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="text-lg">Dados do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Nome / Razão Social</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="document" render={({ field }) => (
                    <FormItem><FormLabel>CPF / CNPJ</FormLabel><FormControl><Input {...field} className="font-mono" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="assignedSalesId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendedor Responsável</FormLabel>
                      <Select value={field.value ? String(field.value) : ''} onValueChange={(v) => field.onChange(Number(v))}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {salesUsers.map(u => (
                            <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem><FormLabel>Anotações</FormLabel><FormControl><Textarea {...field} rows={4} className="resize-none" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="pt-2">
                    <Button type="submit" className="w-full" disabled={updateClient.isPending}>
                      {updateClient.isPending ? 'Salvando...' : 'Atualizar Dados'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center"><Briefcase className="h-5 w-5 mr-2 text-primary" /> Negócios Associados</CardTitle>
              <Badge variant="outline">{deals.length}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">Nenhum negócio associado.</TableCell></TableRow>
                  ) : deals.map((deal: any) => (
                    <TableRow key={deal.id}>
                      <TableCell className="font-medium text-primary"><Link href={`/deals/${deal.id}`}>{deal.title}</Link></TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{deal.stage.replace('_', ' ')}</Badge></TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(deal.estimatedValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center"><CreditCard className="h-5 w-5 mr-2 text-indigo-600" /> Contas de Anúncio</CardTitle>
              <Badge variant="outline">{adAccounts.length}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Identificador</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Modalidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Limite/Mês</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adAccounts.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Nenhuma conta de anúncio associada.</TableCell></TableRow>
                  ) : adAccounts.map((acc: any) => (
                    <TableRow key={acc.id}>
                      <TableCell className="font-mono text-xs">{acc.accountIdentifier}</TableCell>
                      <TableCell>{acc.platform}</TableCell>
                      <TableCell className="text-sm">{getRentalLabel(acc.rentalPeriodType)}</TableCell>
                      <TableCell>
                        <Badge variant={acc.status === 'ativa' ? 'success' : acc.status === 'bloqueada' ? 'destructive' : 'warning'} className="text-[10px] uppercase">
                          {acc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(acc.monthlyLimit)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
