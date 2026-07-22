import { useState, useMemo } from 'react';
import { useListDeals } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import { formatCurrency } from '@/lib/utils';
import { Users, TrendingDown, ArrowUpRight, DollarSign, CalendarDays } from 'lucide-react';
import { format, subMonths, startOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MonthlyPipelinePage() {
  const currentDate = new Date();
  const currentMonthStr = format(currentDate, 'yyyy-MM');

  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  const months = useMemo(() => {
    const arr = [];
    for (let i = 0; i <= 12; i++) {
      const d = subMonths(startOfMonth(currentDate), i);
      arr.push({
        value: format(d, 'yyyy-MM'),
        label: format(d, 'MMMM yyyy', { locale: ptBR })
      });
    }
    return arr;
  }, [currentDate]);

  // Fetch both active and closed deals, limit 500
  const { data: activeDealsResponse, isLoading: isLoadingActive } = useListDeals({ 
    stage: 'ativo', 
    limit: 500 
  } as any);
  
  const { data: churnedDealsResponse, isLoading: isLoadingChurn } = useListDeals({ 
    stage: 'encerrado', 
    limit: 500 
  } as any);

  const activeDeals = useMemo(() => {
    if (!activeDealsResponse?.data) return [];
    return activeDealsResponse.data.filter((d: any) => d.activeMonth === selectedMonth);
  }, [activeDealsResponse, selectedMonth]);

  const churnedDeals = useMemo(() => {
    if (!churnedDealsResponse?.data) return [];
    return churnedDealsResponse.data.filter((d: any) => d.churnMonth === selectedMonth);
  }, [churnedDealsResponse, selectedMonth]);

  const totalActive = activeDeals.length;
  const totalChurn = churnedDeals.length;
  const churnRate = totalActive + totalChurn > 0 ? (totalChurn / (totalActive + totalChurn)) * 100 : 0;
  
  const activeValue = activeDeals.reduce((sum, d) => sum + (d.estimatedValue || 0), 0);
  const avgTicket = totalActive > 0 ? activeValue / totalActive : 0;

  const isLoading = isLoadingActive || isLoadingChurn;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <CalendarDays className="mr-3 h-8 w-8 text-primary" />
            Pipeline Mensal
          </h1>
          <p className="text-muted-foreground mt-1">Visão de clientes ativos e churn no mês selecionado.</p>
        </div>
        <div className="w-64">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="h-10 font-medium">
              <SelectValue placeholder="Selecione o mês" />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m.value} value={m.value} className="capitalize">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Ativos no Mês</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Churn</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{totalChurn}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Taxa de Churn</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{churnRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Ticket Médio (Ativos)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgTicket)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-t-4 border-t-primary shadow-sm flex flex-col">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center">
                Clientes Ativos
                <Badge variant="secondary" className="ml-2">{totalActive}</Badge>
              </CardTitle>
              <div className="text-sm font-medium text-primary">
                {formatCurrency(activeValue)}
              </div>
            </div>
          </CardHeader>
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Vendedor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : activeDeals.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">Nenhum cliente ativo neste mês.</TableCell></TableRow>
                ) : activeDeals.map((deal: any) => (
                  <TableRow key={deal.id} className="hover:bg-muted/20">
                    <TableCell className="font-medium">
                      <Link href={`/deals/${deal.id}`} className="hover:underline text-primary">
                        {deal.clientName || deal.title}
                      </Link>
                    </TableCell>
                    <TableCell><span className="text-xs">{deal.platform || '-'}</span></TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCurrency(deal.estimatedValue)}</TableCell>
                    <TableCell><span className="text-xs text-muted-foreground">{deal.ownerName || '-'}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Card className="border-t-4 border-t-destructive shadow-sm flex flex-col">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center">
                Churn no Mês
                <Badge variant="destructive" className="ml-2">{totalChurn}</Badge>
              </CardTitle>
            </div>
          </CardHeader>
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Vendedor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : churnedDeals.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">Nenhum churn registrado neste mês.</TableCell></TableRow>
                ) : churnedDeals.map((deal: any) => (
                  <TableRow key={deal.id} className="hover:bg-destructive/5">
                    <TableCell className="font-medium">
                      <Link href={`/deals/${deal.id}`} className="hover:underline text-primary">
                        {deal.clientName || deal.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-normal max-w-[150px] truncate" title={deal.rentalStatus || '-'}>
                        {deal.rentalStatus || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell><span className="text-xs text-muted-foreground">{deal.ownerName || '-'}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
