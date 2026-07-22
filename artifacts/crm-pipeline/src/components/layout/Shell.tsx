import React, { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  CreditCard, 
  BarChart, 
  Settings, 
  LogOut,
  Menu,
  CalendarDays
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { href: '/', label: 'Pipeline', icon: Briefcase },
    { href: '/pipeline-mensal', label: 'Pipeline Mensal', icon: CalendarDays },
    { href: '/clients', label: 'Clientes', icon: Users },
    { href: '/ad-accounts', label: 'Contas de Anúncio', icon: CreditCard },
    { href: '/reports', label: 'Relatórios', icon: BarChart },
  ];

  if (user?.role === 'admin') {
    navItems.push({ href: '/admin/users', label: 'Usuários', icon: Settings });
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r flex flex-col transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-14 flex items-center px-6 border-b font-bold text-lg tracking-tight">
          <span className="text-primary mr-2">█</span>
          <span>CRM<span className="font-light text-muted-foreground">Pipeline</span></span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
                <item.icon className={`mr-3 h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t space-y-4">
          <div className="flex items-center px-3">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase mr-3">
              {user?.name?.substring(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={logout}>
            <LogOut className="mr-3 h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 flex items-center justify-between px-4 border-b bg-card md:hidden">
          <div className="flex items-center font-bold tracking-tight">
            <span className="text-primary mr-2">█</span>
            CRM
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <Menu className="h-5 w-5" />
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
          {children}
        </div>
      </main>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
