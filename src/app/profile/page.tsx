
"use client";

import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { Navbar } from '../../components/layout/Navbar';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../../components/ui/select";
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection, useAuth } from '../../firebase/index';
import { doc, collection, query, where, documentId, collectionGroup, getDocs, writeBatch, serverTimestamp, arrayUnion, arrayRemove } from 'firebase/firestore';
import { updateDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from '../../firebase/non-blocking-updates';
import { updateUserPassword, initiateEmailUpdate } from '../../firebase/non-blocking-login';
import { 
  User as UserIcon, 
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
  Lock,
  Unlock,
  Bookmark,
  Heart,
  Eye,
  AlertCircle,
  UserPlus,
  UserMinus,
  Users,
  Clock,
  Check,
  ShieldAlert,
  AtSign,
  Key
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useLanguage } from '../../components/providers/LanguageContext';
import { useTheme } from '../../components/providers/ThemeContext';
import { Badge } from '../../components/ui/badge';
import { usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { useSearchParams } from 'next/navigation';
import { AnimeCard } from '../../components/anime/AnimeCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/alert-dialog";
import { differenceInDays } from 'date-fns';

function PayPalButton({ onApprove }: { onApprove: () => void }) {
  const [{ isResolved }] = usePayPalScriptReducer();
  const renderedRef = useRef(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isResolved && !renderedRef.current) {
      timeoutId = setTimeout(() => {
        const paypal = (window as any).paypal;
        const container = document.getElementById("paypal-container-X3C6F5887MPCG");
        
        if (paypal && paypal.HostedButtons && container) {
          try {
            container.innerHTML = ''; 
            
            renderedRef.current = true;
            paypal.HostedButtons({
              hostedButtonId: "X3C6F5887MPCG",
            }).render("#paypal-container-X3C6F5887MPCG")
              .catch((err: any) => {
                console.warn("PayPal render catch:", err);
                renderedRef.current = false;
              });
          } catch (err) {
            console.error("PayPal button initialization failed:", err);
            renderedRef.current = false;
          }
        }
      }, 500);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      const container = document.getElementById("paypal-container-X3C6F5887MPCG");
      if (container) container.innerHTML = '';
    };
  }, [isResolved]);

  return (
    <div className="space-y-4">
      <div id="paypal-container-X3C6F5887MPCG" className="min-h-[150px] w-full" />
      <Button 
        variant="ghost" 
        size="sm" 
        className="w-full text-[10px] text-muted-foreground hover:bg-transparent"
        onClick={onApprove}
      >
        Click here if Premium doesn't activate after payment
      </Button>
    </div>
  );
}

function ProfileContent() {
  const { user: authUser, isUserLoading: isAuthLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const searchParams = useSearchParams();
  
  const targetUid = searchParams.get('uid') || authUser?.uid;
  const isOwnProfile = !searchParams.get('uid') || searchParams.get('uid') === authUser?.uid;

  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isSendingEmailLink, setIsSendingEmailLink] = useState(false);
  
  const [editData, setEditData] = useState({
    username: '',
    displayName: '',
    languagePreference: 'en',
    themePreference: 'dark',
    isPublic: false
  });

  const [passwordData, setPasswordData] = useState({
    current: '',
    new: ''
  });

  const [emailUpdateData, setEmailUpdateData] = useState({
    new: '',
    password: ''
  });

  const profileRef = useMemoFirebase(() => {
    if (!targetUid || !db) return null;
    return doc(db, 'users', targetUid);
  }, [targetUid, db]);

  const authProfileRef = useMemoFirebase(() => {
    if (!authUser || !db) return null;
    return doc(db, 'users', authUser.uid);
  }, [authUser?.uid, db]);

  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef);
  const { data: authProfile } = useDoc(authProfileRef);

  const isBlocked = authProfile?.blockedUserIds?.includes(targetUid || '');
  const amIBlocked = profile?.blockedUserIds?.includes(authUser?.uid || '');

  const friendshipId = useMemo(() => {
    if (!authUser || !targetUid || isOwnProfile) return null;
    return authUser.uid < targetUid 
      ? `${authUser.uid}_${targetUid}` 
      : `${targetUid}_${authUser.uid}`;
  }, [authUser?.uid, targetUid, isOwnProfile]);

  const friendshipRef = useMemoFirebase(() => {
    if (!db || !friendshipId) return null;
    return doc(db, 'friendships', friendshipId);
  }, [db, friendshipId]);

  const { data: friendshipData } = useDoc(friendshipRef);
  const isFriend = !!friendshipData;

  const requestId = useMemo(() => {
    if (!authUser || !targetUid || isOwnProfile) return null;
    return `${authUser.uid}_${targetUid}`;
  }, [authUser?.uid, targetUid, isOwnProfile]);

  const reverseRequestId = useMemo(() => {
    if (!authUser || !targetUid || isOwnProfile) return null;
    return `${targetUid}_${authUser.uid}`;
  }, [authUser?.uid, targetUid, isOwnProfile]);

  const requestRef = useMemoFirebase(() => {
    if (!db || !requestId) return null;
    return doc(db, 'friend_requests', requestId);
  }, [db, requestId]);

  const reverseRequestRef = useMemoFirebase(() => {
    if (!db || !reverseRequestId) return null;
    return doc(db, 'friend_requests', reverseRequestId);
  }, [db, reverseRequestId]);

  const { data: outgoingRequest } = useDoc(requestRef);
  const { data: incomingRequest } = useDoc(reverseRequestRef);

  const watchingQuery = useMemoFirebase(() => {
    if (!db || !profile?.currentlyWatchingAnimeIds?.length) return null;
    return query(collection(db, 'anime'), where(documentId(), 'in', profile.currentlyWatchingAnimeIds.slice(0, 10)));
  }, [db, profile?.currentlyWatchingAnimeIds?.join(',')]);

  const watchlistQuery = useMemoFirebase(() => {
    if (!db || !profile?.watchlistAnimeIds?.length) return null;
    return query(collection(db, 'anime'), where(documentId(), 'in', profile.watchlistAnimeIds.slice(0, 10)));
  }, [db, profile?.watchlistAnimeIds?.join(',')]);

  const favoritesQuery = useMemoFirebase(() => {
    if (!db || !profile?.favoriteAnimeIds?.length) return null;
    return query(collection(db, 'anime'), where(documentId(), 'in', profile.favoriteAnimeIds.slice(0, 10)));
  }, [db, profile?.favoriteAnimeIds?.join(',')]);

  const { data: watchingAnime } = useCollection(watchingQuery);
  const { data: watchlistAnime } = useCollection(watchlistQuery);
  const { data: favoritesAnime } = useCollection(favoritesQuery);

  const isAdmin = profile?.role === 'admin';
  const isPremium = profile?.isPremium === true;

  useEffect(() => {
    if (profile && isOwnProfile) {
      setEditData({
        username: profile.username || '',
        displayName: profile.displayName || profile.username || '',
        languagePreference: profile.languagePreference || 'en',
        themePreference: profile.themePreference || 'dark',
        isPublic: profile.isPublic || false
      });
    }
  }, [profile, isOwnProfile]);

  const handleSave = async () => {
    if (!profileRef || !db || !targetUid || !editData.displayName.trim() || !editData.username.trim()) {
      toast({
        title: "Error",
        description: "Display Name and Username cannot be empty.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      // Reload auth user to check for verification status in case they verified in another tab
      if (auth.currentUser) {
        await auth.currentUser.reload();
      }
      const freshAuthUser = auth.currentUser;

      const usernameChanged = editData.username.toLowerCase() !== profile?.username?.toLowerCase();
      
      if (usernameChanged) {
        const lastChange = profile?.lastUsernameChange?.toDate?.() || new Date(0);
        const now = new Date();
        const daysSinceLastChange = differenceInDays(now, lastChange);
        const requiredCooldown = isPremium ? 2 : 30;

        if (daysSinceLastChange < requiredCooldown) {
          const errorMsg = isPremium 
            ? t('usernamePremiumCooldown') 
            : t('usernameCooldown').replace('{days}', '30');
          toast({ title: "Cooldown Active", description: errorMsg, variant: "destructive" });
          setIsSaving(false);
          return;
        }

        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', editData.username.toLowerCase()));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          toast({ title: "Error", description: t('usernameTaken'), variant: "destructive" });
          setIsSaving(false);
          return;
        }
      }

      const profileUpdate: any = {
        displayName: editData.displayName,
        languagePreference: editData.languagePreference,
        themePreference: editData.themePreference,
        isPublic: editData.isPublic,
        updatedAt: serverTimestamp()
      };

      // Check for verified email mismatch to sync with Firestore
      if (freshAuthUser && freshAuthUser.emailVerified && freshAuthUser.email !== profile?.email) {
        profileUpdate.email = freshAuthUser.email;
      }

      if (usernameChanged) {
        profileUpdate.username = editData.username.toLowerCase();
        profileUpdate.lastUsernameChange = serverTimestamp();
      }

      updateDocumentNonBlocking(profileRef, profileUpdate);

      try {
        const commentsQuery = query(collectionGroup(db, 'comments'), where('userId', '==', targetUid));
        const commentsSnapshot = await getDocs(commentsQuery);
        
        if (!commentsSnapshot.empty) {
          const batch = writeBatch(db);
          commentsSnapshot.docs.forEach((commentDoc) => {
            const commentUpdate: any = {
              userDisplayName: editData.displayName,
              updatedAt: serverTimestamp()
            };
            if (usernameChanged) {
              commentUpdate.userName = editData.username.toLowerCase();
            }
            batch.update(commentDoc.ref, commentUpdate);
          });
          await batch.commit();
        }
      } catch (indexError: any) {
        if (!indexError.message?.includes('index')) {
          console.warn("Activity sync skipped:", indexError.message);
        }
      }

      if (editData.languagePreference !== language) {
        setLanguage(editData.languagePreference as any);
      }
      
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: usernameChanged ? t('usernameChanged') : "Your settings have been synced successfully."
      });
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err.message || "Something went wrong while saving your profile.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.current || !passwordData.new) {
      toast({ title: "Error", description: "All password fields are required.", variant: "destructive" });
      return;
    }
    if (passwordData.new.length < 6) {
      toast({ title: "Error", description: "New password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updateUserPassword(auth, passwordData.current, passwordData.new);
      toast({ title: t('passwordChangeSuccess') });
      setPasswordData({ current: '', new: '' });
    } catch (error: any) {
      toast({ 
        title: "Update Failed", 
        description: error.code === 'auth/wrong-password' ? "Invalid current password." : error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleRequestEmailUpdate = async () => {
    if (!emailUpdateData.new || !emailUpdateData.password) {
      toast({ title: "Error", description: "Email and password are required.", variant: "destructive" });
      return;
    }
    setIsSendingEmailLink(true);
    try {
      await initiateEmailUpdate(auth, emailUpdateData.password, emailUpdateData.new);
      toast({
        title: "Verification Sent",
        description: t('verifyEmailLinkSent')
      });
      setEmailUpdateData({ new: '', password: '' });
    } catch (err: any) {
      toast({
        title: "Request Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsSendingEmailLink(false);
    }
  };

  const handleSendRequest = () => {
    if (!requestRef || !authUser || !targetUid || !db || amIBlocked) {
      if (amIBlocked) toast({ title: "Error", description: "You cannot interact with this user.", variant: "destructive" });
      return;
    }
    setDocumentNonBlocking(requestRef, {
      id: requestId,
      senderId: authUser.uid,
      receiverId: targetUid,
      status: 'pending',
      createdAt: serverTimestamp()
    }, { merge: true });

    addDocumentNonBlocking(collection(db, 'users', targetUid, 'notifications'), {
      type: 'friend_request',
      fromId: authUser.uid,
      fromName: authProfile?.displayName || authProfile?.username,
      link: `/watchlist?tab=friends`,
      messageEn: `${authProfile?.displayName || authProfile?.username} sent you a friend request.`,
      messageAr: `أرسل لك ${authProfile?.displayName || authProfile?.username} طلب صداقة.`,
      read: false,
      createdAt: serverTimestamp()
    });

    toast({ title: "Request Sent", description: "Waiting for them to accept." });
  };

  const handleAcceptRequest = async () => {
    if (!reverseRequestRef || !friendshipRef || !authUser || !targetUid || !db) return;
    
    setDocumentNonBlocking(friendshipRef, {
      id: friendshipId,
      userIds: [authUser.uid, targetUid].sort(),
      createdAt: serverTimestamp()
    }, { merge: true });

    deleteDocumentNonBlocking(reverseRequestRef);

    addDocumentNonBlocking(collection(db, 'users', targetUid, 'notifications'), {
      type: 'friend_accepted',
      fromId: authUser.uid,
      fromName: authProfile?.displayName || authProfile?.username,
      link: `/profile?uid=${authUser.uid}`,
      messageEn: `${authProfile?.displayName || authProfile?.username} accepted your friend request.`,
      messageAr: `قبول ${authProfile?.displayName || authProfile?.username} طلب الصداقة الخاص بك.`,
      read: false,
      createdAt: serverTimestamp()
    });

    toast({ title: "Friend Added", description: "You are now friends!" });
  };

  const handleDeclineRequest = () => {
    if (!reverseRequestRef) return;
    deleteDocumentNonBlocking(reverseRequestRef);
    toast({ title: "Request Declined" });
  };

  const handleRemoveFriend = () => {
    if (!friendshipRef) return;
    deleteDocumentNonBlocking(friendshipRef);
    toast({ title: "Removed Friend" });
  };

  const handleBlock = () => {
    if (!authProfileRef || !targetUid) return;
    handleRemoveFriend();
    deleteDocumentNonBlocking(requestRef);
    deleteDocumentNonBlocking(reverseRequestRef);
    updateDocumentNonBlocking(authProfileRef, {
      blockedUserIds: arrayUnion(targetUid)
    });
    toast({ title: "User Blocked" });
  };

  const handleUnblock = () => {
    if (!authProfileRef || !targetUid) return;
    updateDocumentNonBlocking(authProfileRef, {
      blockedUserIds: arrayRemove(targetUid)
    });
    toast({ title: "User Unblocked" });
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

  const copyUid = () => {
    if (!targetUid) return;
    navigator.clipboard.writeText(targetUid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isAuthLoading || isProfileLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (amIBlocked) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You cannot view this profile.</p>
        <Button variant="outline" asChild>
          <a href="/">Back to Home</a>
        </Button>
      </div>
    );
  }

  const canView = isOwnProfile || profile?.isPublic || isFriend;

  if (!profile || (!canView && !isOwnProfile)) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <Lock className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-bold">This profile is private.</h1>
        <p className="text-muted-foreground">You must be friends with this user to see their library.</p>
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <Button variant="outline" asChild>
              <a href="/">Back to Home</a>
            </Button>
            {!isOwnProfile && authUser && !isFriend && (
              <>
                {incomingRequest ? (
                  <Button onClick={handleAcceptRequest} className="gap-2 bg-green-500 hover:bg-green-600">
                    <Check className="h-4 w-4" /> Accept Request
                  </Button>
                ) : outgoingRequest ? (
                  <Button disabled className="gap-2">
                    <Clock className="h-4 w-4" /> Request Sent
                  </Button>
                ) : (
                  <Button onClick={handleSendRequest} className="gap-2 bg-accent text-accent-foreground">
                    <UserPlus className="h-4 w-4" /> Add Friend
                  </Button>
                )}
              </>
            )}
          </div>
          {!isOwnProfile && authUser && (
            <Button variant="ghost" className="text-destructive hover:bg-destructive/10 gap-2" onClick={handleBlock}>
              <ShieldAlert className="h-4 w-4" /> Block User
            </Button>
          )}
        </div>
      </div>
    );
  }

  const userInitial = (profile.displayName || profile.username || 'U')[0];

  return (
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
          <div className="flex flex-col md:items-start items-center">
            <div className="flex items-center gap-3">
              <h1 className="font-headline text-4xl font-bold">{profile.displayName || profile.username}</h1>
              {isAdmin && <ShieldCheck className="h-6 w-6 text-accent" />}
              {isPremium && (
                <Badge className="bg-accent text-accent-foreground gap-1 px-3 py-1 font-bold">
                  PREMIUM
                </Badge>
              )}
            </div>
            <p className="text-accent font-medium text-lg">@{profile.username}</p>
            {!isOwnProfile && (
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="gap-1">
                  {profile.isPublic ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  {profile.isPublic ? t('publicProfile') : t('privateProfile')}
                </Badge>
                {isFriend && (
                  <Badge className="bg-green-500/20 text-green-500 border-none gap-1">
                    <Users className="h-3 w-3" /> Friend
                  </Badge>
                )}
                {isBlocked && (
                  <Badge className="bg-destructive/20 text-destructive border-none gap-1">
                    <ShieldAlert className="h-3 w-3" /> Blocked
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-muted-foreground md:justify-start">
            {isOwnProfile && (
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {profile.email}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              {isAdmin ? 'System Administrator' : 'Standard Account'}
            </span>
          </div>
        </div>
        {!isOwnProfile && authUser && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              {isFriend ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="rounded-xl gap-2 text-destructive border-destructive/20 hover:bg-destructive/10">
                      <UserMinus className="h-4 w-4" /> Unfriend
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Unfriend User?</AlertDialogTitle>
                      <AlertDialogDescription>Are you sure you want to remove this connection?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRemoveFriend}>Unfriend</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : incomingRequest ? (
                <div className="flex gap-2">
                  <Button onClick={handleAcceptRequest} className="rounded-xl gap-2 bg-green-500 text-white hover:bg-green-600">
                    <Check className="h-4 w-4" /> Accept
                  </Button>
                  <Button onClick={handleDeclineRequest} variant="ghost" className="rounded-xl text-destructive">
                    Decline
                  </Button>
                </div>
              ) : outgoingRequest ? (
                <Button disabled className="rounded-xl gap-2">
                  <Clock className="h-4 w-4" /> Request Sent
                </Button>
              ) : !isBlocked && (
                <Button className="rounded-xl gap-2 bg-accent text-accent-foreground" onClick={handleSendRequest}>
                  <UserPlus className="h-4 w-4" /> Add Friend
                </Button>
              )}
              
              {isBlocked ? (
                <Button variant="outline" className="rounded-xl" onClick={handleUnblock}>Unblock</Button>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="rounded-xl text-destructive h-10 w-10 p-0">
                      <ShieldAlert className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Block User?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Blocking this user will remove any current friendship and prevent them from sending you future requests.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBlock} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Block</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        )}
        {isOwnProfile && (
          <div className="flex gap-2">
            <Button 
              variant={isEditing ? "outline" : "default"} 
              className="rounded-xl gap-2"
              onClick={() => setIsEditing(!isEditing)}
              disabled={isSaving}
            >
              {isEditing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {isEditing && isOwnProfile ? (
          <>
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
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input 
                      id="displayName"
                      value={editData.displayName}
                      onChange={(e) => setEditData({...editData, displayName: e.target.value})}
                      className="rounded-xl border-none bg-secondary/50"
                      disabled={isSaving}
                      placeholder="Shadow King"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username" className="flex items-center gap-2">
                      <AtSign className="h-3 w-3" />
                      Username (Unique handle)
                    </Label>
                    <Input 
                      id="username"
                      value={editData.username}
                      onChange={(e) => setEditData({...editData, username: e.target.value})}
                      className="rounded-xl border-none bg-secondary/50"
                      disabled={isSaving}
                      placeholder="shadowmaster"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {isPremium 
                        ? "Premium: Change every 2 days." 
                        : "Regular: Change every 30 days."}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lang">Interface Language</Label>
                    <Select 
                      value={editData.languagePreference}
                      onValueChange={(val) => setEditData({...editData, languagePreference: val})}
                      disabled={isSaving}
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
                  
                  <div className="space-y-4 rounded-xl bg-secondary/30 p-4 border border-dashed">
                    <Label className="flex items-center gap-2 text-base">
                      <Mail className="h-4 w-4" />
                      {t('changeEmail')}
                    </Label>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input 
                        placeholder={t('newEmail')}
                        value={emailUpdateData.new}
                        onChange={(e) => setEmailUpdateData({ ...emailUpdateData, new: e.target.value })}
                        className="rounded-xl border-none bg-background/50"
                        disabled={isSaving || isSendingEmailLink}
                      />
                      <Input 
                        type="password"
                        placeholder={t('currentPassword')}
                        value={emailUpdateData.password}
                        onChange={(e) => setEmailUpdateData({ ...emailUpdateData, password: e.target.value })}
                        className="rounded-xl border-none bg-background/50"
                        disabled={isSaving || isSendingEmailLink}
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full rounded-xl gap-2"
                      onClick={handleRequestEmailUpdate}
                      disabled={isSendingEmailLink || isSaving || !emailUpdateData.new || !emailUpdateData.password}
                    >
                      {isSendingEmailLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                      {t('sendResetLink')}
                    </Button>
                    <p className="text-[10px] text-muted-foreground italic">
                      Step: Request -> Verify in Inbox -> Save Changes here.
                    </p>
                  </div>

                  <div className="flex flex-col justify-center space-y-2 rounded-xl bg-secondary/30 p-4 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">{t('publicProfile')}</Label>
                        <p className="text-sm text-muted-foreground">
                          {t('profilePrivacyDesc')}
                        </p>
                      </div>
                      <Switch 
                        checked={editData.isPublic}
                        onCheckedChange={(val) => setEditData({...editData, isPublic: val})}
                        disabled={isSaving}
                      />
                    </div>
                  </div>

                  {authUser && authUser.emailVerified && authUser.email !== profile?.email && (
                    <div className="md:col-span-2 bg-accent/10 border border-accent/20 rounded-xl p-4 flex items-center gap-3 animate-pulse">
                      <AlertCircle className="h-5 w-5 text-accent shrink-0" />
                      <p className="text-sm font-medium text-accent">
                        {t('emailSyncNotice')}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="justify-end gap-3">
                <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>Discard</Button>
                <Button className="rounded-xl gap-2 bg-accent text-accent-foreground" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isSaving ? 'Syncing...' : 'Save Changes'}
                </Button>
              </CardFooter>
            </Card>

            <Card className="rounded-2xl border-none bg-card shadow-xl md:col-span-2">
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  {t('security')}
                </CardTitle>
                <CardDescription>Update your account password for enhanced security.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
                    <Input 
                      id="currentPassword"
                      type="password"
                      value={passwordData.current}
                      onChange={(e) => setPasswordData({...passwordData, current: e.target.value})}
                      className="rounded-xl border-none bg-secondary/50"
                      disabled={isUpdatingPassword}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">{t('newPassword')}</Label>
                    <Input 
                      id="newPassword"
                      type="password"
                      value={passwordData.new}
                      onChange={(e) => setPasswordData({...passwordData, new: e.target.value})}
                      className="rounded-xl border-none bg-secondary/50"
                      disabled={isUpdatingPassword}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button 
                  className="rounded-xl gap-2" 
                  onClick={handleChangePassword} 
                  disabled={isUpdatingPassword || !passwordData.current || !passwordData.new}
                >
                  {isUpdatingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  {t('changePassword')}
                </Button>
              </CardFooter>
            </Card>
          </>
        ) : (
          <>
            <Card className="rounded-2xl border-none bg-card shadow-xl">
              <CardHeader>
                <CardTitle className="font-headline">Account Details</CardTitle>
                <CardDescription>Status and identifier.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">User ID (UID)</label>
                  <div className="flex items-center gap-2 rounded-xl bg-secondary/50 p-3">
                    <code className="flex-1 truncate text-sm">{profile.id}</code>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyUid}>
                      {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase text-muted-foreground">Role</span>
                    <p className="font-medium capitalize">{profile.role || 'User'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase text-muted-foreground">Language</span>
                    <p className="font-medium">{profile.languagePreference === 'ar' ? 'Arabic' : 'English'}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase text-muted-foreground">Privacy Status</span>
                  <div className="flex items-center gap-2">
                    {profile.isPublic ? (
                      <Badge className="bg-green-500/10 text-green-500 border-green-500/20">{t('publicProfile')}</Badge>
                    ) : (
                      <Badge variant="secondary">{t('privateProfile')}</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {isOwnProfile && !isPremium && (
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
                  <div className="space-y-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">$0.49</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <PayPalButton onApprove={handleActivatePremium} />
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="md:col-span-2">
              <h2 className="font-headline text-2xl font-bold mb-6 flex items-center gap-2">
                <Bookmark className="h-6 w-6 text-accent" />
                {isOwnProfile ? t('watchlist') : t('userLibrary')}
              </h2>
              <Tabs defaultValue="watching" className="w-full">
                <TabsList className="mb-8 grid w-full max-w-md grid-cols-3 rounded-xl bg-secondary p-1">
                  <TabsTrigger value="watching" className="rounded-lg gap-2">
                    <Eye className="h-4 w-4" />
                    {t('watching')}
                  </TabsTrigger>
                  <TabsTrigger value="watchlist" className="rounded-lg gap-2">
                    <Bookmark className="h-4 w-4" />
                    {t('watchLater')}
                  </TabsTrigger>
                  <TabsTrigger value="favorites" className="rounded-lg gap-2">
                    <Heart className="h-4 w-4" />
                    {t('favorites')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="watching">
                  {watchingAnime && watchingAnime.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                      {watchingAnime.map(anime => (
                        <AnimeCard key={anime.id} anime={anime} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic py-12 text-center bg-secondary/10 rounded-2xl">No items in this category.</p>
                  )}
                </TabsContent>

                <TabsContent value="watchlist">
                  {watchlistAnime && watchlistAnime.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                      {watchlistAnime.map(anime => (
                        <AnimeCard key={anime.id} anime={anime} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic py-12 text-center bg-secondary/10 rounded-2xl">No items in this category.</p>
                  )}
                </TabsContent>

                <TabsContent value="favorites">
                  {favoritesAnime && favoritesAnime.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                      {favoritesAnime.map(anime => (
                        <AnimeCard key={anime.id} anime={anime} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic py-12 text-center bg-secondary/10 rounded-2xl">No items in this category.</p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 py-12">
        <Suspense fallback={<div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
          <ProfileContent />
        </Suspense>
      </main>
    </div>
  );
}
