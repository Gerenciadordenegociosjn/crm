import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Briefcase,
  CalendarDays,
  Users,
  BarChart,
  Settings,
  Building2,
  CreditCard,
  UserCheck,
  ShieldCheck,
  ChevronRight,
  LogIn,
  LayoutDashboard,
  PencilLine,
  Trash2,
  Plus,
  Eye,
} from 'lucide-react';

function Section({ id, title, icon: Icon, children }: { id: string; title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-3 pl-12">{children}</div>
    </section>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="mt-0.5 h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0">{n}</span>
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-sm text-amber-800">
      <span className="shrink-0 font-semibold">Dica:</span>
      <span>{children}</span>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-sm text-blue-800">
      <span className="shrink-0 font-semibold">Importante:</span>
      <span>{children}</span>
    </div>
  );
}

function NavItem({ label, icon: Icon, admin }: { label: string; icon: React.ElementType; admin?: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-3 rounded-md bg-secondary/50 text-sm font-medium w-fit">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span>{label}</span>
      {admin && <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1">Admin</Badge>}
    </div>
  );
}

export default function AjudaPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="max-w-3xl mx-auto space-y-10 pb-16">

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">Guia de Uso — Mapey CRM</h1>
          {isAdmin
            ? <Badge className="bg-primary/10 text-primary border-0">Administrador</Badge>
            : <Badge className="bg-emerald-100 text-emerald-700 border-0">Vendedor</Badge>}
        </div>
        <p className="text-muted-foreground text-sm">
          Tudo o que você precisa saber para usar o sistema no dia a dia.
          {isAdmin ? ' Como administrador, você tem acesso completo a todas as funcionalidades.' : ' Como vendedor, você acessa apenas seus próprios clientes e negócios.'}
        </p>
      </div>

      {/* Índice */}
      <Card className="bg-secondary/30 border-0">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Neste guia</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {[
              { href: '#acesso', label: 'Acesso ao sistema' },
              { href: '#pipeline', label: 'Pipeline (Kanban)' },
              { href: '#pipeline-mensal', label: 'Pipeline Mensal' },
              { href: '#clientes', label: 'Clientes' },
              { href: '#contas', label: 'Contas de Anúncio' },
              { href: '#relatorios', label: 'Relatórios' },
              ...(isAdmin ? [
                { href: '#usuarios', label: 'Usuários (Admin)' },
                { href: '#fornecedores', label: 'Fornecedores (Admin)' },
              ] : []),
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ChevronRight className="h-3.5 w-3.5" />
                {label}
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 1. Acesso */}
      <Section id="acesso" title="Acesso ao sistema" icon={LogIn}>
        <p className="text-sm text-muted-foreground">Acesse pelo navegador com seu e-mail e senha fornecidos pelo administrador.</p>
        <Step n={1}>Abra o sistema e insira seu <strong>e-mail</strong> e <strong>senha</strong> na tela de login.</Step>
        <Step n={2}>Clique em <strong>Entrar</strong>. Você será direcionado ao Pipeline.</Step>
        <Step n={3}>Para sair, clique no botão <strong>Sair</strong> no rodapé do menu lateral.</Step>
        <Tip>Esqueceu a senha? Clique em "Esqueci minha senha" na tela de login para receber um link de redefinição por e-mail.</Tip>

        <div className="pt-2">
          <p className="text-sm font-medium mb-2 text-foreground">Menu lateral disponível para você:</p>
          <div className="flex flex-wrap gap-2">
            <NavItem label="Pipeline" icon={Briefcase} />
            <NavItem label="Pipeline Mensal" icon={CalendarDays} />
            <NavItem label="Clientes" icon={Users} />
            <NavItem label="Relatórios" icon={BarChart} />
            {isAdmin && <>
              <NavItem label="Usuários" icon={Settings} admin />
              <NavItem label="Fornecedores" icon={Building2} admin />
            </>}
          </div>
        </div>
      </Section>

      {/* 2. Pipeline */}
      <Section id="pipeline" title="Pipeline (Kanban)" icon={Briefcase}>
        <p className="text-sm text-muted-foreground">O Pipeline exibe seus negócios em colunas por etapa. Arraste os cards para avançar ou retroceder um negócio no funil.</p>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Como criar um negócio:</p>
          <Step n={1}>Clique no botão <strong>+ Novo Negócio</strong> no canto superior direito.</Step>
          <Step n={2}>Preencha o nome do negócio, selecione o cliente e a etapa inicial.</Step>
          <Step n={3}>Clique em <strong>Criar</strong>. O card aparecerá na coluna correspondente.</Step>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Como mover um negócio:</p>
          <Step n={1}>Clique e segure o card do negócio.</Step>
          <Step n={2}>Arraste até a coluna de destino e solte.</Step>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Como editar ou ver detalhes:</p>
          <Step n={1}>Clique no título do negócio para abrir a ficha completa.</Step>
          <Step n={2}>Na ficha, você pode editar valor, etapa, datas e ver o histórico de atividades.</Step>
        </div>

        {isAdmin && <InfoBox>Como administrador, você vê os negócios de toda a equipe. Vendedores veem apenas os próprios negócios.</InfoBox>}
        {!isAdmin && <InfoBox>Você vê apenas os negócios atribuídos a você. Para criar um negócio para um cliente seu, ele deve estar na sua carteira.</InfoBox>}
        <Tip>Use o filtro no topo do Pipeline para buscar por nome ou cliente.</Tip>
      </Section>

      {/* 3. Pipeline Mensal */}
      <Section id="pipeline-mensal" title="Pipeline Mensal" icon={CalendarDays}>
        <p className="text-sm text-muted-foreground">Visão consolidada do desempenho mês a mês: negócios ativos, encerrados e receita projetada.</p>
        <Step n={1}>Acesse <strong>Pipeline Mensal</strong> no menu lateral.</Step>
        <Step n={2}>Escolha o mês de referência pelo seletor no topo da página.</Step>
        <Step n={3}>Analise os totais por etapa, valor em aberto e negócios encerrados no período.</Step>
        {isAdmin && <InfoBox>Administradores veem o consolidado de toda a equipe. Vendedores veem apenas seus próprios números.</InfoBox>}
      </Section>

      {/* 4. Clientes */}
      <Section id="clientes" title="Clientes" icon={Users}>
        <p className="text-sm text-muted-foreground">Cadastre e gerencie a carteira de clientes. Cada cliente pode ter negócios e contas de anúncio vinculados.</p>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Como cadastrar um cliente:</p>
          <Step n={1}>Acesse <strong>Clientes</strong> no menu lateral.</Step>
          <Step n={2}>Clique em <strong>+ Novo Cliente</strong>.</Step>
          <Step n={3}>Preencha nome, e-mail, telefone e demais dados. Clique em <strong>Salvar</strong>.</Step>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Como acessar a ficha do cliente:</p>
          <Step n={1}>Na lista de clientes, clique no nome para abrir a ficha completa.</Step>
          <Step n={2}>Na ficha você vê os negócios vinculados e as contas de anúncio do cliente.</Step>
          <Step n={3}>Use os botões <PencilLine className="inline h-3 w-3" /> e <Trash2 className="inline h-3 w-3" /> para editar ou remover o cliente.</Step>
        </div>

        {isAdmin && <InfoBox>Administradores podem reatribuir um cliente a outro vendedor editando o campo "Vendedor responsável" na ficha do cliente.</InfoBox>}
        {!isAdmin && <InfoBox>Você vê apenas os clientes atribuídos a você pelo administrador.</InfoBox>}
      </Section>

      {/* 5. Contas de Anúncio */}
      <Section id="contas" title="Contas de Anúncio" icon={CreditCard}>
        <p className="text-sm text-muted-foreground">
          As contas de anúncio ficam dentro da <strong>ficha de cada cliente</strong>. Você pode incluir, alterar e remover contas diretamente por lá.
        </p>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Como incluir uma conta de anúncio:</p>
          <Step n={1}>Abra a ficha do cliente (Clientes → clique no nome).</Step>
          <Step n={2}>No card <strong>Contas de Anúncio</strong>, clique em <strong><Plus className="inline h-3 w-3" /> Incluir Conta</strong>.</Step>
          <Step n={3}>Selecione a plataforma (Meta Ads, Google Ads…), preencha o identificador da conta, limite mensal, status e fornecedor.</Step>
          <Step n={4}>Clique em <strong>Incluir conta</strong>.</Step>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Como alterar ou remover:</p>
          <Step n={1}>Na tabela de contas do cliente, clique em <PencilLine className="inline h-3 w-3" /> para editar ou <Trash2 className="inline h-3 w-3" /> para remover.</Step>
          <Step n={2}>Para <strong>substituir</strong> uma conta, remova a antiga e inclua a nova.</Step>
        </div>

        <div className="mt-1">
          <p className="text-sm font-medium text-foreground mb-2">Status possíveis:</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Ativa', color: 'bg-green-100 text-green-700' },
              { label: 'Bloqueada', color: 'bg-red-100 text-red-700' },
              { label: 'Em Revisão', color: 'bg-yellow-100 text-yellow-700' },
              { label: 'Encerrada', color: 'bg-gray-100 text-gray-600' },
            ].map(({ label, color }) => (
              <span key={label} className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${color}`}>{label}</span>
            ))}
          </div>
        </div>

        <Tip>O campo Fornecedor indica qual empresa fornece a conta de anúncio. Cadastre fornecedores em Fornecedores (menu lateral, Admin).</Tip>
      </Section>

      {/* 6. Relatórios */}
      <Section id="relatorios" title="Relatórios" icon={BarChart}>
        <p className="text-sm text-muted-foreground">Visão analítica do funil: receita fechada, negócios por etapa e churn no período selecionado.</p>
        <Step n={1}>Acesse <strong>Relatórios</strong> no menu lateral.</Step>
        <Step n={2}>Use o filtro de período para selecionar o intervalo desejado.</Step>
        <Step n={3}>Analise os gráficos de negócios por etapa, receita acumulada e taxa de churn.</Step>
        {isAdmin && <InfoBox>Administradores veem dados de toda a operação. Vendedores veem apenas seus próprios números.</InfoBox>}
      </Section>

      {/* 7. Usuários (admin only) */}
      {isAdmin && (
        <Section id="usuarios" title="Usuários" icon={Settings}>
          <Badge variant="outline" className="text-xs mb-2 w-fit">Somente Administrador</Badge>
          <p className="text-sm text-muted-foreground">Gerencie quem tem acesso ao sistema e com qual perfil.</p>

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Como criar um usuário:</p>
            <Step n={1}>Acesse <strong>Usuários</strong> no menu lateral.</Step>
            <Step n={2}>Clique em <strong>+ Novo Usuário</strong>.</Step>
            <Step n={3}>Preencha nome, e-mail, senha inicial e selecione o perfil: <strong>Administrador</strong> ou <strong>Vendedor</strong>.</Step>
            <Step n={4}>Clique em <strong>Criar</strong>. O usuário já poderá fazer login.</Step>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Perfis de acesso:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card className="border shadow-none">
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" /> Administrador
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className="flex items-center gap-1"><Eye className="h-3 w-3" /> Vê todos os clientes e negócios</li>
                    <li className="flex items-center gap-1"><Settings className="h-3 w-3" /> Gerencia usuários e fornecedores</li>
                    <li className="flex items-center gap-1"><BarChart className="h-3 w-3" /> Relatórios completos da operação</li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="border shadow-none">
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-emerald-600" /> Vendedor
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className="flex items-center gap-1"><Eye className="h-3 w-3" /> Vê apenas seus clientes e negócios</li>
                    <li className="flex items-center gap-1"><CreditCard className="h-3 w-3" /> Gerencia contas de anúncio dos seus clientes</li>
                    <li className="flex items-center gap-1"><BarChart className="h-3 w-3" /> Relatórios restritos ao seu portfólio</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          <Tip>Para desativar um usuário sem excluí-lo, edite o cadastro e desmarque "Ativo". O usuário não conseguirá mais fazer login.</Tip>
        </Section>
      )}

      {/* 8. Fornecedores (admin only) */}
      {isAdmin && (
        <Section id="fornecedores" title="Fornecedores" icon={Building2}>
          <Badge variant="outline" className="text-xs mb-2 w-fit">Somente Administrador</Badge>
          <p className="text-sm text-muted-foreground">Cadastre os fornecedores de contas de anúncio. Eles ficam disponíveis para seleção ao incluir ou editar uma conta.</p>

          <div className="space-y-3">
            <Step n={1}>Acesse <strong>Fornecedores</strong> no menu lateral.</Step>
            <Step n={2}>Clique em <strong>+ Novo Fornecedor</strong>.</Step>
            <Step n={3}>Preencha a razão social, CNPJ e contato. Clique em <strong>Salvar</strong>.</Step>
          </div>

          <InfoBox>Ao excluir um fornecedor, as contas de anúncio já vinculadas a ele ficam sem fornecedor (campo em branco). As contas em si não são removidas.</InfoBox>
        </Section>
      )}

      {/* Rodapé */}
      <div className="border-t pt-6 text-center text-xs text-muted-foreground">
        Dúvidas adicionais? Fale com o administrador do sistema.
      </div>
    </div>
  );
}
