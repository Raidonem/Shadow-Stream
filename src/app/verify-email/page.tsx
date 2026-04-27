"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '../../components/layout/Navbar';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { useUser, useAuth } from '../../firebase/index';
import { sendVerification } from '../../firebase/non-blocking-login';
import { Mail, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { signOut } from 'firebase/auth';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!isUserLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.emailVerified) {
        router.push('/');
      }
    }
  }, [user, isUserLoading, router]);

  const handleResend = async () => {
    setIsResending(true);
    try {
      await sendVerification(auth);
      toast({
        title: "Verification Sent",
        description: "Check your inbox for a new verification link.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckStatus = async () => {
    setIsChecking(true);
    if (user) {
      await user.reload();
      if (user.emailVerified) {
        toast({
          title: "Success!",
          description: "Your email has been verified.",
        });
        router.push('/');
      } else {
        toast({
          title: "Not Verified Yet",
          description: "Please check your email and click the verification link.",
        });
      }
    }
    setIsChecking(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md border-none bg-card shadow-2xl text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="font-headline text-3xl font-bold">Verify Your Email</CardTitle>
            <CardDescription className="text-lg">
              We've sent a verification link to <span className="font-bold text-foreground">{user.email}</span>.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              Please click the link in the email to activate your account. If you don't see it, check your spam folder.
            </p>
            
            <div className="grid gap-3">
              <Button 
                onClick={handleCheckStatus} 
                className="w-full gap-2 rounded-xl bg-accent font-bold text-accent-foreground"
                disabled={isChecking}
              >
                {isChecking ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                I've Verified My Email
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleResend} 
                className="w-full gap-2 rounded-xl"
                disabled={isResending}
              >
                {isResending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Resend Verification Email
              </Button>
            </div>
          </CardContent>

          <CardFooter className="flex justify-center border-t pt-6">
            <Button variant="ghost" onClick={handleLogout} className="gap-2 text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}