import { useGetDashboardSummary, useGetRecentActivity } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Activity, Briefcase, CreditCard, DollarSign, TrendingUp, Clock, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ReportsPage() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: recentActivities, isLoading: isLoadingActivities } = useGetRecentActivity({ limit: 10 });

  if (isLoadingSummary || !summary) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Dashboard & Relatórios</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  // Format data for chart
  const chartData = summary.dealsByStage.map(s => ({
    name: s.stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    quantidade: s.count,
    valor: s.totalValue,
  }));

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
          <TrendingUp className="mr-3 h-8 w-8 text-primary" /> Visão Geral
        </h1>
        <p className="text-muted-foreground mt-1">Métricas de performance e estado do pipeline.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-t-4 border-t-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Negócios</CardTitle>
            <Briefcase className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{summary.totalDeals}</div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-emerald-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor em Pipeline</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-600">{formatCurrency(summary.totalPipelineValue)}</div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-indigo-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle>
            <Activity className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{formatCurrency(summary.avgTicket)}</div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-orange-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contas Ativas</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{summary.activeAdAccounts} <span className="text-sm font-normal text-muted-foreground ml-1">/ {summary.totalAdAccounts}</span></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="shadow-md border-border h-full">
            <CardHeader>
              <CardTitle>Negócios por Etapa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      yAxisId="left" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(val) => val}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(val) => `R$ ${val/1000}k`}
                    />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                    />
                    <Bar yAxisId="left" dataKey="quantidade" name="Qtd. Negócios" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="shadow-md border-border h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Atividades Recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <div className="space-y-4">
                {isLoadingActivities ? (
                  Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                ) : !recentActivities || recentActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atividade recente.</p>
                ) : (
                  recentActivities.map(act => (
                    <div key={act.id} className="flex gap-3 text-sm">
                      <div className="mt-0.5">
                        {act.type === 'note' ? (
                          <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                            <MessageSquare className="h-3 w-3 text-blue-600" />
                          </div>
                        ) : act.type === 'stage_change' ? (
                          <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                            <Briefcase className="h-3 w-3 text-green-600" />
                          </div>
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center">
                            <Activity className="h-3 w-3 text-slate-600" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{act.dealTitle || 'Negócio Desconhecido'}</p>
                        <p className="text-muted-foreground line-clamp-2 mt-0.5">{act.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                          {formatDateTime(act.createdAt)} • {act.userName || 'Sistema'}
                        </p>
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
