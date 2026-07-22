import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full bg-destructive/10 p-6">
        <AlertCircle className="h-12 w-12 text-destructive" />
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight">Página não encontrada</h1>
      <p className="text-muted-foreground max-w-md">
        A página que você está tentando acessar não existe, foi removida ou você não tem permissão para vê-la.
      </p>
      <Link href="/">
        <Button size="lg" className="mt-4">
          Voltar ao Início
        </Button>
      </Link>
    </div>
  );
}
