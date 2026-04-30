'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  confirmPasswordReset,
  UserCredential,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  verifyBeforeUpdateEmail,
} from 'firebase/auth';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): Promise<UserCredential> {
  return signInAnonymously(authInstance);
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): Promise<UserCredential> {
  return createUserWithEmailAndPassword(authInstance, email, password);
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(authInstance, email, password);
}

/** Sends a verification email to the current user. */
export async function sendVerification(authInstance: Auth): Promise<void> {
  if (authInstance.currentUser) {
    await sendEmailVerification(authInstance.currentUser);
  }
}

/** Sends a password reset email. */
export function initiatePasswordReset(authInstance: Auth, email: string): Promise<void> {
  const actionCodeSettings = {
    url: window.location.origin + '/forgot-password',
    handleCodeInApp: true,
  };
  return sendPasswordResetEmail(authInstance, email, actionCodeSettings);
}

/** Completes the password reset process. */
export function completePasswordReset(authInstance: Auth, oobCode: string, newPassword: string): Promise<void> {
  return confirmPasswordReset(authInstance, oobCode, newPassword);
}

/** 
 * Re-authenticates the user and updates their password.
 * Required because password updates are sensitive and require a recent login.
 */
export async function updateUserPassword(authInstance: Auth, currentPass: string, newPass: string): Promise<void> {
  const user = authInstance.currentUser;
  if (!user || !user.email) throw new Error("Authentication failed: No active session found.");
  
  const credential = EmailAuthProvider.credential(user.email, currentPass);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPass);
}

/** 
 * Re-authenticates the user and initiates an email update.
 * Sends a verification link to the new email. 
 * The email is only changed in Auth after the user clicks the link.
 */
export async function initiateEmailUpdate(authInstance: Auth, currentPass: string, newEmail: string): Promise<void> {
  const user = authInstance.currentUser;
  if (!user || !user.email) throw new Error("Authentication failed: No active session found.");
  
  const credential = EmailAuthProvider.credential(user.email, currentPass);
  await reauthenticateWithCredential(user, credential);
  await verifyBeforeUpdateEmail(user, newEmail);
}
