"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '../../components/layout/Navbar';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { useAuth } from '../../firebase/index';
import { initiatePasswordReset, completePasswordReset } from '../../firebase/non-blocking-login';
import { Mail, Key, ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useLanguage } from '../../components/providers/LanguageContext';
import Link from 'next/link';

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  const oobCode = searchParams.get('oobCode');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await initiatePasswordReset(auth, email);
      setIsSent(true);
      toast({
        title: "Success",
        description: t('resetEmailSent'),
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Invalid Password",
        description: "Password must be at least 6 characters long.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await completePasswordReset(auth, oobCode!, newPassword);
      toast({
        title: t('passwordUpdated'),
        description: "You can now log in with your new password.",
      });
      router.push('/login');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // State 3: Reset State (oobCode present)
  if (oobCode) {
    return (
      <Card className="w-full max-w-md border-none bg-card shadow-2xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
            <ShieldCheck className="h-10 w-10 text-accent" />
          </div>
          <CardTitle className="font-headline text-3xl font-bold">{t('resetPassword')}</CardTitle>
          <CardDescription>
            Enter your new password below to regain access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">{t('newPassword')}</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                className="rounded-xl border-none bg-secondary/50"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full gap-2 rounded-xl bg-accent font-bold text-accent-foreground"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
              {t('updatePassword')}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  // State 2: Success State (Instruction vibe)
  if (isSent) {
    return (
      <Card className="w-full max-w-md border-none bg-card shadow-2xl text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="font-headline text-3xl font-bold">{t('checkEmail')}</CardTitle>
          <CardDescription className="text-lg">
            {t('resetEmailSent')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Please click the link in the email to set a new password. If you don't see it, check your spam folder.
          </p>
          <Button 
            variant="outline" 
            className="w-full gap-2 rounded-xl"
            onClick={() => setIsSent(false)}
          >
            <ArrowLeft className="h-4 w-4" />
            Use a different email
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-6">
          <Link href="/login" className="text-sm font-medium text-accent hover:underline">
            {t('backToLogin')}
          </Link>
        </CardFooter>
      </Card>
    );
  }

  // State 1: Request State
  return (
    <Card className="w-full max-w-md border-none bg-card shadow-2xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="font-headline text-3xl font-bold">{t('forgotPassword')}</CardTitle>
        <CardDescription>
          Enter your email and we'll send you a link to reset your password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSendReset} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              className="rounded-xl border-none bg-secondary/50"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button 
            type="submit" 
            className="w-full gap-2 rounded-xl bg-accent font-bold text-accent-foreground"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {t('sendResetLink')}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-accent flex items-center gap-2">
          <ArrowLeft className="h-3 w-3" />
          {t('backToLogin')}
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12">
        <Suspense fallback={<div className="flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
          <ForgotPasswordContent />
        </Suspense>
      </main>
    </div>
  );
}
