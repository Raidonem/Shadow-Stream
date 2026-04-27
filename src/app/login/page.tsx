
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '../../components/layout/Navbar';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useAuth, useUser, useFirestore } from '../../firebase/index';
import { initiateEmailSignIn, initiateEmailSignUp, sendVerification } from '../../firebase/non-blocking-login';
import { LogIn, UserPlus } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function LoginPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !isUserLoading) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    initiateEmailSignIn(auth, email, password)
      .catch((error: any) => {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: error.message,
        });
        setIsSubmitting(false);
      });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Check if username is unique
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        toast({
          variant: "destructive",
          title: "Username Taken",
          description: "This username is already in use. Please choose another one.",
        });
        setIsSubmitting(false);
        return;
      }

      // 2. Store username for profile creation BEFORE auth call
      localStorage.setItem('pendingUsername', username);

      // 3. Proceed with sign-up (Email uniqueness is handled by Firebase Auth automatically)
      await initiateEmailSignUp(auth, email, password);
      
      // 4. Send verification email
      await sendVerification(auth);
      
      toast({
        title: "Account Created!",
        description: "Please check your email to verify your account.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: error.message,
      });
      setIsSubmitting(false);
    }
  };

  if (isUserLoading) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md border-none bg-card shadow-2xl">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="font-headline text-3xl font-bold">Welcome Back</CardTitle>
              <CardDescription>
                Enter your credentials to access your ShadowStream account
              </CardDescription>
              <TabsList className="mt-6 grid w-full grid-cols-2 rounded-xl bg-secondary p-1">
                <TabsTrigger value="login" className="rounded-lg">Login</TabsTrigger>
                <TabsTrigger value="register" className="rounded-lg">Register</TabsTrigger>
              </TabsList>
            </CardHeader>
            
            <CardContent>
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input 
                      id="login-email" 
                      type="email" 
                      placeholder="name@example.com" 
                      className="rounded-xl border-none bg-secondary/50"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input 
                      id="login-password" 
                      type="password" 
                      className="rounded-xl border-none bg-secondary/50"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                    />
                  </div>
                  <Button type="submit" className="w-full gap-2 rounded-xl bg-accent font-bold text-accent-foreground hover:bg-accent/90" disabled={isSubmitting}>
                    <LogIn className="h-4 w-4" />
                    {isSubmitting ? "Signing In..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-username">Username</Label>
                    <Input 
                      id="reg-username" 
                      placeholder="ShadowMaster" 
                      className="rounded-xl border-none bg-secondary/50"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input 
                      id="reg-email" 
                      type="email" 
                      placeholder="name@example.com" 
                      className="rounded-xl border-none bg-secondary/50"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input 
                      id="reg-password" 
                      type="password" 
                      className="rounded-xl border-none bg-secondary/50"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                    />
                  </div>
                  <Button type="submit" className="w-full gap-2 rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary/90" disabled={isSubmitting}>
                    <UserPlus className="h-4 w-4" />
                    {isSubmitting ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </main>
    </div>
  );
}
