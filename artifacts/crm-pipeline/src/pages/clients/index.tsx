import { useState } from 'react';
import { useListClients, useCreateClient, getListClientsQueryKey } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Search, ArrowRight, User } from 'lucide-react';

const clientSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  document: z.string().optional(),
  type: z.string().optional(),
  status: z.string().default('ativo'),
});

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clientsResponse, isLoading } = useListClients({ search, page, limit: 20 });
  const createClient = useCreateClient();

  const form = useForm<z.infer<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
    defaultValues: { name: '', email: '', phone: '', document: '', type: 'Pessoa Jurídica', status: 'ativo' }
  });

  const onSubmit = (data: z.infer<typeof clientSchema>) => {
    createClient.mutate({ data: data as any }, {
      onSuccess: () => {
        toast({ title: 'Cliente criado com sucesso' });
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        setIsNewModalOpen(false);
        form.reset();
      },
      onError: (err) => {
        toast({ title: 'Erro ao criar cliente', description: err.message, variant: 'destructive' });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground mt-1">Gestão da base de clientes locatários.</p>
        </div>
        <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
          <DialogTrigger asChild>
            <Button><User className="mr-2 h-4 w-4" /> Novo Cliente</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar Novo Cliente</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Nome / Razão Social</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Telefone / WhatsApp</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="document" render={({ field }) => (
                    <FormItem><FormLabel>CPF / CNPJ</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem><FormLabel>Tipo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createClient.isPending}>{createClient.isPending ? 'Salvando...' : 'Salvar'}</Button>
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
              placeholder="Buscar por nome, email ou telefone..." 
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
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cadastrado em</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Carregando clientes...</TableCell></TableRow>
              ) : clientsResponse?.data.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Nenhum cliente encontrado.</TableCell></TableRow>
              ) : clientsResponse?.data.map((client) => (
                <TableRow key={client.id} className="hover:bg-muted/20">
                  <TableCell className="font-semibold"><Link href={`/clients/${client.id}`}>{client.name}</Link></TableCell>
                  <TableCell>
                    <div className="text-sm">{client.email || '-'}</div>
                    <div className="text-xs text-muted-foreground">{client.phone || '-'}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{client.document || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={client.status === 'ativo' ? 'success' : 'secondary'} className="uppercase text-[10px]">
                      {client.status || 'ativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(client.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/clients/${client.id}`}>
                      <Button variant="ghost" size="sm">Ver Perfil</Button>
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
