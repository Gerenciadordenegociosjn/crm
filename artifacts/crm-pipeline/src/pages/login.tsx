import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLogin } from '@workspace/api-client-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

const forgotSchema = z.object({
  email: z.string().email('E-mail inválido'),
});

export default function LoginPage() {
  const { login: authenticate } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const loginMutation = useLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const forgotForm = useForm<z.infer<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res) => {
        authenticate(res.token, res.user);
        setLocation('/');
      },
      onError: (err) => {
        toast({
          title: 'Erro ao fazer login',
          description: err.message || 'Credenciais inválidas.',
          variant: 'destructive',
        });
      }
    });
  };

  const onForgotSubmit = async (data: z.infer<typeof forgotSchema>) => {
    setForgotLoading(true);
    try {
      await fetch(`${import.meta.env.BASE_URL}api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });
      setForgotSent(true);
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível enviar o e-mail. Tente novamente.', variant: 'destructive' });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotClose = (open: boolean) => {
    setForgotOpen(open);
    if (!open) {
      setForgotSent(false);
      forgotForm.reset();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      <div className="mb-8">
        <img src="/logo.png" alt="Mapey" className="w-80 h-auto object-contain" />
      </div>

      <Card className="w-full max-w-sm border-t-4 border-t-primary shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Acesso Restrito</CardTitle>
          <CardDescription>
            Insira suas credenciais para acessar a plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input placeholder="seu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Senha</FormLabel>
                      <button
                        type="button"
                        onClick={() => setForgotOpen(true)}
                        className="text-xs text-primary hover:underline"
                      >
                        Esqueceu sua senha?
                      </button>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          className="pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(p => !p)}
                          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword
                            ? <EyeOff className="h-4 w-4" />
                            : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <p className="mt-8 text-sm text-muted-foreground max-w-xs text-center">
        Sistema de uso interno para gestão do pipeline.
      </p>

      {/* Forgot password dialog */}
      <Dialog open={forgotOpen} onOpenChange={handleForgotClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Recuperar senha</DialogTitle>
            <DialogDescription>
              {forgotSent
                ? 'Verifique seu e-mail.'
                : 'Informe o e-mail cadastrado e enviaremos um link para redefinição.'}
            </DialogDescription>
          </DialogHeader>

          {forgotSent ? (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Se o e-mail estiver cadastrado, você receberá as instruções em breve.
                Verifique também a caixa de spam.
              </p>
              <Button className="w-full" onClick={() => handleForgotClose(false)}>
                Fechar
              </Button>
            </div>
          ) : (
            <Form {...forgotForm}>
              <form onSubmit={forgotForm.handleSubmit(onForgotSubmit)} className="space-y-4 pt-2">
                <FormField
                  control={forgotForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input placeholder="seu@email.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={forgotLoading}>
                  {forgotLoading ? 'Enviando...' : 'Enviar link de redefinição'}
                </Button>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
