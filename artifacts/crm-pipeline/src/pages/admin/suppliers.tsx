import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useListSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  getListSuppliersQueryKey,
} from '@workspace/api-client-react';
import { Plus, Pencil, Trash2, Building2, X } from 'lucide-react';

const supplierSchema = z.object({
  companyName: z.string().min(1, 'Nome obrigatório'),
  nickname: z.string().min(1, 'Apelido obrigatório'),
  licenseCountry: z.string().min(1, 'País da licença obrigatório'),
  operatingCountries: z.array(z.string()).default([]),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

// Country tag input component
function CountryTagInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState('');

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput('');
  };

  const remove = (country: string) => {
    onChange(value.filter((c) => c !== country));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex: Brasil, Portugal..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); add(); }
          }}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>
          Adicionar
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {value.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
            >
              {c}
              <button
                type="button"
                onClick={() => remove(c)}
                className="ml-0.5 hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SuppliersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: suppliers = [], isLoading } = useListSuppliers();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      companyName: '',
      nickname: '',
      licenseCountry: '',
      operatingCountries: [],
    },
  });

  const openNew = () => {
    setEditingId(null);
    form.reset({ companyName: '', nickname: '', licenseCountry: '', operatingCountries: [] });
    setIsModalOpen(true);
  };

  const openEdit = (s: any) => {
    setEditingId(s.id);
    form.reset({
      companyName: s.companyName,
      nickname: s.nickname,
      licenseCountry: s.licenseCountry,
      operatingCountries: s.operatingCountries ?? [],
    });
    setIsModalOpen(true);
  };

  const onSubmit = (data: SupplierFormData) => {
    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() });

    if (editingId) {
      updateSupplier.mutate(
        { id: editingId, data },
        {
          onSuccess: () => {
            toast({ title: 'Fornecedor atualizado' });
            setIsModalOpen(false);
            invalidate();
          },
          onError: () => toast({ title: 'Erro ao atualizar', variant: 'destructive' }),
        },
      );
    } else {
      createSupplier.mutate(
        { data },
        {
          onSuccess: () => {
            toast({ title: 'Fornecedor criado' });
            setIsModalOpen(false);
            invalidate();
          },
          onError: () => toast({ title: 'Erro ao criar', variant: 'destructive' }),
        },
      );
    }
  };

  const confirmDelete = (id: number) => {
    deleteSupplier.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: 'Fornecedor removido' });
          setDeletingId(null);
          queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
        },
        onError: () => toast({ title: 'Erro ao remover', variant: 'destructive' }),
      },
    );
  };

  const isPending = createSupplier.isPending || updateSupplier.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Fornecedores</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie os fornecedores de licença disponíveis para ativação de clientes.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Fornecedor
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16 text-muted-foreground text-sm">Carregando...</div>
      ) : suppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">Nenhum fornecedor cadastrado.</p>
          <Button variant="outline" className="mt-4 gap-2" onClick={openNew}>
            <Plus className="h-4 w-4" /> Cadastrar primeiro fornecedor
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Apelido</TableHead>
                <TableHead>País da Licença</TableHead>
                <TableHead>Países de Operação</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(suppliers as any[]).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.companyName}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{s.nickname}</Badge>
                  </TableCell>
                  <TableCell>{s.licenseCountry}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(s.operatingCountries ?? []).map((c: string) => (
                        <span
                          key={c}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeletingId(s.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Empresa</FormLabel>
                    <FormControl><Input placeholder="Ex: Acme Corp" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apelido</FormLabel>
                    <FormControl><Input placeholder="Ex: ACME" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="licenseCountry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>País da Licença</FormLabel>
                    <FormControl><Input placeholder="Ex: Estados Unidos" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="operatingCountries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Países onde a licença funciona</FormLabel>
                    <FormControl>
                      <CountryTagInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar fornecedor'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deletingId !== null} onOpenChange={() => setDeletingId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover fornecedor?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta ação não pode ser desfeita. O fornecedor será removido permanentemente.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && confirmDelete(deletingId)}
              disabled={deleteSupplier.isPending}
            >
              {deleteSupplier.isPending ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
