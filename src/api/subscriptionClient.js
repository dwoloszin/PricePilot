// ──────────────────────────────────────────────────────────
// Bem na Mosca — DARIO WOLOSZIN
// https://github.com/dwoloszin
// ──────────────────────────────────────────────────────────
// Subscription & PIX payment client (React side)
// Calls Firebase Cloud Functions and reads Firestore directly.

import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { app, db } from './firebaseClient';

const functions = getFunctions(app, 'southamerica-east1'); // São Paulo region

// ── Callable wrappers ────────────────────────────────────────
const _createPixCharge  = httpsCallable(functions, 'createPixCharge');
const _checkPixPayment  = httpsCallable(functions, 'checkPixPayment');
const _validateCoupon   = httpsCallable(functions, 'validateCoupon');

/**
 * Validate a promo coupon code.
 * Returns { code, discountPct, originalAmount, finalAmount }
 */
export async function validateCoupon(code) {
  const result = await _validateCoupon({ code });
  return result.data;
}

/**
 * Ask the Cloud Function to create a PIX charge.
 * @param {string|null} couponCode  Optional validated coupon code
 * Returns { txid, pixCopiaECola, qrCodeBase64, amount, originalAmount, discountPct, expiresAt }
 */
export async function createPixCharge(couponCode = null) {
  const result = await _createPixCharge({ couponCode });
  return result.data;
}

/**
 * Check if a specific txid has been paid.
 * Returns { status: 'pending' | 'paid' | 'expired', paidAt? }
 */
export async function checkPixPayment(txid) {
  const result = await _checkPixPayment({ txid });
  return result.data;
}

/**
 * Get the current user's subscription from Firestore (one-time read).
 * Returns the subscription doc data or null.
 */
export async function getSubscription(userId) {
  const ref  = doc(db, 'Subscription', userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...data,
    expiresAt:     data.expiresAt?.toDate()     ?? null,
    lastPaymentAt: data.lastPaymentAt?.toDate() ?? null,
  };
}

/**
 * Subscribe to real-time subscription updates.
 * Calls onChange(subscription | null) whenever Firestore changes.
 * Returns an unsubscribe function.
 */
export function subscribeToSubscription(userId, onChange) {
  const ref = doc(db, 'Subscription', userId);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) { onChange(null); return; }
    const data = snap.data();
    onChange({
      ...data,
      expiresAt:     data.expiresAt?.toDate()     ?? null,
      lastPaymentAt: data.lastPaymentAt?.toDate() ?? null,
    });
  });
}

/**
 * Returns true if the subscription is currently active.
 */
export function isSubscriptionActive(subscription) {
  if (!subscription) return false;
  if (subscription.status !== 'active') return false;
  if (!subscription.expiresAt) return false;
  return subscription.expiresAt > new Date();
}

/**
 * Returns how many days remain in the subscription (0 if expired).
 */
export function daysRemaining(subscription) {
  if (!isSubscriptionActive(subscription)) return 0;
  const diff = subscription.expiresAt - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
