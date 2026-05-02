
"use client";

import { use, useEffect, useState } from 'react';
import { Navbar } from '../../../components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { useFirestore, useDoc, useUser, useMemoFirebase } from '../../../firebase/index';
import { doc, updateDoc } from 'firebase/firestore';
import { AlertCircle, ShieldAlert, CheckCircle2, ChevronLeft, MessageSquareWarning, Slash, Ban } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '../../../components/providers/LanguageContext';
import { UserNotification } from '../../../lib/types';
import { Loader2 } from 'lucide-react';

export default function WarningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useUser();
  const db = useFirestore();
  const { language, t } = useLanguage();
  
  const notificationRef = useMemoFirebase(() => {
    if (!user || !db || !id) return null;
    return doc(db, 'users', user.uid, 'notifications', id);
  }, [user, db, id]);

  const { data: notification, isLoading } = useDoc<UserNotification>(notificationRef);

  useEffect(() => {
    if (notification && !notification.read && notificationRef) {
      updateDoc(notificationRef, { read: true });
    }
  }, [notification, notificationRef]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  // Allow display for any administrative action notification types
  const isModerationAction = notification && ['warning', 'restriction', 'suspension'].includes(notification.type);

  if (!notification || !isModerationAction) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold">Notice Not Found</h1>
        <p className="text-muted-foreground">The administrative message you are looking for could not be found.</p>
        <Button asChild className="mt-6 rounded-xl"><Link href="/">Back to Home</Link></Button>
      </div>
    );
  }

  const getHeaderIcon = () => {
    switch (notification.type) {
      case 'suspension': return <Ban className="h-10 w-10 text-destructive" />;
      case 'restriction': return <Slash className="h-10 w-10 text-destructive" />;
      default: return <MessageSquareWarning className="h-10 w-10 text-destructive" />;
    }
  };

  const getTitle = () => {
    switch (notification.type) {
      case 'suspension': return language === 'ar' ? 'تعليق الحساب' : 'Account Suspension';
      case 'restriction': return language === 'ar' ? 'تقييد الحساب' : 'Account Restriction';
      default: return t('officialWarning');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-2xl border-none bg-card shadow-2xl overflow-hidden">
          <div className="h-2 bg-destructive" />
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
              {getHeaderIcon()}
            </div>
            <div className="space-y-1">
              <CardTitle className="font-headline text-3xl font-bold text-destructive">
                {getTitle()}
              </CardTitle>
              <CardDescription className="text-lg">
                Please review this message carefully to understand the status of your account.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-8 p-8">
            <div className="rounded-2xl bg-secondary/30 p-8 border border-destructive/10">
              <h3 className="text-xs font-bold uppercase text-muted-foreground mb-4 flex items-center gap-2">
                <ShieldAlert className="h-3 w-3" />
                {t('adminMessage')}
              </h3>
              <p className="text-xl leading-relaxed font-medium">
                {notification.customMessage}
              </p>
            </div>

            <div className="space-y-4 text-sm text-muted-foreground bg-accent/5 p-4 rounded-xl">
              <p className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                ShadowStream is built on respect and immersion. Help us keep it that way.
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                Further violations may lead to permanent termination of service.
              </p>
            </div>
          </CardContent>
          <CardFooter className="bg-secondary/20 p-6 flex justify-between items-center">
            <Button variant="ghost" asChild className="rounded-xl">
              <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> {t('home')}</Link>
            </Button>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
              Ref: {id}
            </p>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
