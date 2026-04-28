
"use client";

import { useState, useEffect } from 'react';
import { Navbar } from '../../components/layout/Navbar';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../../components/ui/select";
import { useUser, useFirestore, useDoc, useMemoFirebase } from '../../firebase/index';
import { doc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '../../firebase/non-blocking-updates';
import { 
  User, 
  Mail, 
  Shield, 
  ShieldCheck, 
  Copy, 
  CheckCircle2, 
  Edit3, 
  Save, 
  X,
  Settings2,
  Globe,
  Palette,
  Sparkles,
  Zap,
  Loader2,
  Lock
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useLanguage } from '../../components/providers/LanguageContext';
import { useTheme } from '../../components/providers/ThemeContext';
import { Badge } from '../../components/ui/badge';
import { PayPalButtons } from "@paypal/react-paypal-js";

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { language, setLanguage } = useLanguage();
  const { toggleTheme } = useTheme();
  
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    username: '',
    languagePreference: 'en',
    themePreference: 'dark'
  });

  const profileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);

  const adminRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'admins', user.uid);
  }, [user, db]);

  const { data: profile } = useDoc(profileRef);
  const { data: adminDoc } = useDoc(adminRef);

  const isAdmin = !!adminDoc;
  const isPremium = profile?.isPremium === true;

  useEffect(() => {
    if (profile) {
      setEditData({
        username: profile.username || '',
        languagePreference: profile.languagePreference || 'en',
        themePreference: profile.themePreference || 'dark'
      });
    }
  }, [profile]);

  const handleSave = () => {
    if (!profileRef || !editData.username.trim()) {
      toast({
        title: "Error",
        description: "Username cannot be empty.",
        variant: "destructive"
      });
      return;
    }

    updateDocumentNonBlocking(profileRef, {
      username: editData.username,
      languagePreference: editData.languagePreference,
      themePreference: editData.themePreference,
      updatedAt: new Date().toISOString()
    });

    if (editData.languagePreference !== language) {
      setLanguage(editData.languagePreference as any);
    }
    
    setIsEditing(false);
    toast({
      title: "Profile Updated",
      description: "Your changes have been saved successfully."
    });
  };

  const handleActivatePremium = () => {
    if (!profileRef) return;
    updateDocumentNonBlocking(profileRef, {
      isPremium: true,
      updatedAt: new Date().toISOString()
    });
    toast({
      title: "Premium Activated!",
      description: "Welcome to the elite side of ShadowStream. Enjoy your ad-free experience!",
    });
  };

  const handleCancelSubscription = () => {
    if (!profileRef) return;
    
    updateDocumentNonBlocking(profileRef, {
      isPremium: false,
      updatedAt: new Date().toISOString()
    });

    toast({
      title: "Subscription Cancelled",
      description: "You will see ads again starting now."
    });
  };

  const copyUid = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.uid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto flex h-[80vh] flex-col items-center justify-center gap-4 px-4">
          <h1 className="text-2xl font-bold">Please log in to view your profile</h1>
          <Button asChild>
            <a href="/login">Go to Login</a>
          </Button>
        </main>
      </div>
    );
  }

  const userInitial = profile?.username?.[0] || user.email?.[0] || 'U';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto max-w-4xl px-4 py-12">
        <div className="space-y-8">
          <div className="flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
            <div className="relative">
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary/20 text-4xl font-bold text-primary ring-4 ring-background shadow-xl">
                {userInitial.toUpperCase()}
              </div>
              {isPremium && (
                <div className="absolute -bottom-2 -right-2 rounded-full bg-accent p-2 text-accent-foreground shadow-lg">
                  <Sparkles className="h-5 w-5" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-center gap-3 md:justify-start">
                <h1 className="font-headline text-4xl font-bold">{profile?.username || 'User'}</h1>
                {isAdmin && <ShieldCheck className="h-6 w-6 text-accent" />}
                {isPremium && (
                  <Badge className="bg-accent text-accent-foreground gap-1 px-3 py-1 font-bold">
                    PREMIUM
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 text-muted-foreground md:justify-start">
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  {isAdmin ? 'System Administrator' : 'Standard Account'}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant={isEditing ? "outline" : "default"} 
                className="rounded-xl gap-2"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </Button>
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {isEditing ? (
              <Card className="rounded-2xl border-none bg-card shadow-xl md:col-span-2">
                <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2">
                    <Settings2 className="h-5 w-5" />
                    Edit Your Settings
                  </CardTitle>
                  <CardDescription>Update your public identity and app preferences.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="username">Display Username</Label>
                      <Input 
                        id="username"
                        value={editData.username}
                        onChange={(e) => setEditData({...editData, username: e.target.value})}
                        className="rounded-xl border-none bg-secondary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lang">Interface Language</Label>
                      <Select 
                        value={editData.languagePreference}
                        onValueChange={(val) => setEditData({...editData, languagePreference: val})}
                      >
                        <SelectTrigger className="rounded-xl border-none bg-secondary/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="ar">العربية (Arabic)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="justify-end gap-3">
                  <Button variant="ghost" onClick={() => setIsEditing(false)}>Discard</Button>
                  <Button className="rounded-xl gap-2 bg-accent text-accent-foreground" onClick={handleSave}>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              <>
                <Card className="rounded-2xl border-none bg-card shadow-xl">
                  <CardHeader>
                    <CardTitle className="font-headline">Account Details</CardTitle>
                    <CardDescription>Your unique identifier and status.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-muted-foreground">User ID (UID)</label>
                      <div className="flex items-center gap-2 rounded-xl bg-secondary/50 p-3">
                        <code className="flex-1 truncate text-sm">{user.uid}</code>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyUid}>
                          {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-xs font-bold uppercase text-muted-foreground">Role</span>
                        <p className="font-medium capitalize">{profile?.role || 'User'}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-bold uppercase text-muted-foreground">Language</span>
                        <p className="font-medium">{profile?.languagePreference === 'ar' ? 'Arabic' : 'English'}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase text-muted-foreground">Subscription Status</span>
                      <div className="flex items-center gap-2">
                        {isPremium ? (
                          <Badge className="bg-accent text-accent-foreground font-bold">ACTIVE PREMIUM</Badge>
                        ) : (
                          <Badge variant="secondary">FREE PLAN</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-none bg-accent/10 border-accent/20 shadow-xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Zap className="h-24 w-24 text-accent fill-current" />
                  </div>
                  <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-accent" />
                      Premium Subscription
                    </CardTitle>
                    <CardDescription>Remove all advertisements and support the platform.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-accent" />
                        <span>Ad-free streaming experience</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-accent" />
                        <span>Early access to new releases</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-accent" />
                        <span>Exclusive profile badges</span>
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      {isPremium ? (
                        <div className="space-y-4">
                          <p className="text-sm font-medium text-accent">Enjoy your ad-free journey!</p>
                          <Button 
                            variant="outline" 
                            className="w-full rounded-xl border-accent/20" 
                            onClick={handleCancelSubscription}
                          >
                            Manage Subscription
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold">$0.49</span>
                            <span className="text-muted-foreground">/month</span>
                          </div>
                          
                          <div className="space-y-4">
                            <p className="text-xs text-muted-foreground italic">Unlock all features instantly with PayPal:</p>
                            <PayPalButtons 
                              style={{ layout: "vertical", shape: "pill", label: "subscribe" }}
                              createOrder={(data, actions) => {
                                return actions.order.create({
                                  purchase_units: [{
                                    amount: { value: "0.49" },
                                    description: "ShadowStream Premium - 1 Month"
                                  }]
                                });
                              }}
                              onApprove={async (data, actions) => {
                                if (actions.order) {
                                  await actions.order.capture();
                                  handleActivatePremium();
                                }
                              }}
                              onError={(err) => {
                                toast({
                                  variant: "destructive",
                                  title: "Payment Error",
                                  description: "Something went wrong with the PayPal transaction."
                                });
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-none bg-card shadow-xl md:col-span-2">
                  <CardHeader>
                    <CardTitle className="font-headline">Quick Actions</CardTitle>
                    <CardDescription>Management and shortcuts.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {isAdmin && (
                        <Button 
                          variant="outline" 
                          className="gap-2 rounded-xl border-accent text-accent hover:bg-accent/10"
                          asChild
                        >
                          <a href="/admin">
                            <ShieldCheck className="h-5 w-5" />
                            Admin
                          </a>
                        </Button>
                      )}
                      <Button variant="secondary" className="rounded-xl gap-2" onClick={toggleTheme}>
                        <Palette className="h-4 w-4" />
                        Theme
                      </Button>
                      <Button variant="secondary" className="rounded-xl gap-2" asChild>
                        <a href="/watchlist">
                          <User className="h-4 w-4" />
                          Library
                        </a>
                      </Button>
                      <Button variant="secondary" className="rounded-xl gap-2" asChild>
                        <a href="/">
                          <Globe className="h-4 w-4" />
                          Explore
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
