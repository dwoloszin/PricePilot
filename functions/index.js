// ──────────────────────────────────────────────────────────
// Bem na Mosca — DARIO WOLOSZIN
// https://github.com/dwoloszin
// ──────────────────────────────────────────────────────────
// Firebase Cloud Functions — EFI Bank PIX payment integration
//
// REQUIRED secrets (set via: npm run sync-firebase):
//   EFI_CLIENT_ID      → API > Minhas Aplicações > Produção > Credenciais
//   EFI_CLIENT_SECRET  → same as above
//   EFI_PIX_KEY        → Minha Conta > Minhas Chaves PIX
//   EFI_CERT_PEM       → base64-encoded .pem certificate (from .p12)
//   EFI_CERT_KEY       → base64-encoded private key (from .p12)
//   EFI_SANDBOX        → "true" for homologation, "false" for production
//   PROMO_CODES        → "CODE1:50,CODE2:20" (code:discountPercent)
//
// Convert .p12 to PEM (run in terminal):
//   openssl pkcs12 -in cert.p12 -nokeys -out cert.pem
//   openssl pkcs12 -in cert.p12 -nocerts -nodes -out cert.key
//   Then base64-encode each file before storing as secret.
//
// EFI Bank PIX API (BACEN standard):
//   Auth:   POST /oauth/token  (Basic Auth + mTLS)
//   Charge: PUT  /v2/cob/{txid}
//   Status: GET  /v2/cob/{txid}
//   QR:     GET  /v2/loc/{locId}/qrcode
// ──────────────────────────────────────────────────────────

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const axios = require('axios');
const https = require('https');
const crypto = require('crypto');

admin.initializeApp();
const db = admin.firestore();

// ── Secrets ─────────────────────────────────────────────────
const EFI_CLIENT_ID     = defineSecret('EFI_CLIENT_ID');      // Production
const EFI_CLIENT_SECRET = defineSecret('EFI_CLIENT_SECRET');  // Production
const EFI_CLIENT_ID_H   = defineSecret('EFI_CLIENT_ID_H');    // Homologação
const EFI_CLIENT_SECRET_H = defineSecret('EFI_CLIENT_SECRET_H'); // Homologação
const EFI_PIX_KEY       = defineSecret('EFI_PIX_KEY');
const EFI_CERT_PEM      = defineSecret('EFI_CERT_PEM');       // Production cert (base64)
const EFI_CERT_KEY      = defineSecret('EFI_CERT_KEY');       // Production key (base64)
const EFI_CERT_PEM_H    = defineSecret('EFI_CERT_PEM_H');     // Homologação cert (base64)
const EFI_CERT_KEY_H    = defineSecret('EFI_CERT_KEY_H');     // Homologação key (base64)
const EFI_SANDBOX       = defineSecret('EFI_SANDBOX');        // "true" | "false"
const PROMO_CODES       = defineSecret('PROMO_CODES');        // "CODE1:50,CODE2:20"

// ── Constants ───────────────────────────────────────────────
const EFI_BASE_URL_PROD    = 'https://pix.api.efipay.com.br';
const EFI_BASE_URL_SANDBOX = 'https://pix-h.api.efipay.com.br';
const SUBSCRIPTION_AMOUNT  = '9.90';
const SUBSCRIPTION_DAYS    = 30;

// ── Helper: build mTLS axios instance + get OAuth token ─────
async function buildEFIClient(secrets) {
  const cert    = Buffer.from(secrets.certPem, 'base64').toString('utf8');
  const key     = Buffer.from(secrets.certKey, 'base64').toString('utf8');
  const sandbox = secrets.sandbox === 'true';
  const baseURL = sandbox ? EFI_BASE_URL_SANDBOX : EFI_BASE_URL_PROD;

  const agent = new https.Agent({ cert, key, rejectUnauthorized: true });
  const http  = axios.create({ baseURL, httpsAgent: agent });

  // EFI uses Basic Auth for OAuth (client_id:client_secret in Authorization header)
  const basicAuth = Buffer.from(`${secrets.clientId}:${secrets.clientSecret}`).toString('base64');

  const tokenRes = await http.post(
    '/oauth/token',
    { grant_type: 'client_credentials' },
    {
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const token = tokenRes.data.access_token;
  http.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  return { http };
}

// ── Helper: generate txid (32 alphanumeric chars, BACEN spec) ─
function generateTxid() {
  return crypto.randomBytes(16).toString('hex'); // 32 hex chars
}

// ── Helper: parse PROMO_CODES secret ────────────────────────
// Format: "CODE1:50,CODE2:20,FREEMONTH:100"
function parsePromoCodes(raw) {
  const map = {};
  if (!raw) return map;
  raw.split(',').forEach(entry => {
    const [code, pct] = entry.trim().split(':');
    if (code && pct) map[code.toUpperCase()] = parseInt(pct, 10);
  });
  return map;
}

// ── Helper: apply discount ───────────────────────────────────
function applyDiscount(baseAmount, discountPct) {
  const discount = Math.min(100, Math.max(0, discountPct));
  const result   = parseFloat(baseAmount) * (1 - discount / 100);
  return result.toFixed(2);
}

// ── EFI secrets bundle — picks prod or homologação based on EFI_SANDBOX ─
function efiSecrets() {
  const sandbox = (EFI_SANDBOX.value() || 'true') === 'true';
  return {
    clientId:     sandbox ? EFI_CLIENT_ID_H.value()     : EFI_CLIENT_ID.value(),
    clientSecret: sandbox ? EFI_CLIENT_SECRET_H.value() : EFI_CLIENT_SECRET.value(),
    certPem:      sandbox ? EFI_CERT_PEM_H.value()      : EFI_CERT_PEM.value(),
    certKey:      sandbox ? EFI_CERT_KEY_H.value()      : EFI_CERT_KEY.value(),
    sandbox:      sandbox ? 'true' : 'false',
  };
}

// ────────────────────────────────────────────────────────────
// FUNCTION 0 — validateCoupon
// ────────────────────────────────────────────────────────────
exports.validateCoupon = onCall(
  { secrets: [PROMO_CODES] },
  async (request) => {
    const userId = request.auth?.uid;
    if (!userId) throw new HttpsError('unauthenticated', 'Login required');

    const code = (request.data?.code || '').trim().toUpperCase();
    if (!code) throw new HttpsError('invalid-argument', 'Código inválido');

    const codes      = parsePromoCodes(PROMO_CODES.value());
    const discountPct = codes[code];
    if (discountPct === undefined) throw new HttpsError('not-found', 'Cupom não encontrado ou inválido');

    const usedSnap = await db.collection('Transaction')
      .where('userId', '==', userId)
      .where('couponCode', '==', code)
      .where('status', '==', 'paid')
      .limit(1).get();
    if (!usedSnap.empty) throw new HttpsError('already-exists', 'Você já usou este cupom');

    const finalAmount = applyDiscount(SUBSCRIPTION_AMOUNT, discountPct);
    return { code, discountPct, originalAmount: SUBSCRIPTION_AMOUNT, finalAmount };
  }
);

// ────────────────────────────────────────────────────────────
// FUNCTION 1 — createPixCharge
// ────────────────────────────────────────────────────────────
exports.createPixCharge = onCall(
  { secrets: [EFI_CLIENT_ID, EFI_CLIENT_SECRET, EFI_CLIENT_ID_H, EFI_CLIENT_SECRET_H, EFI_PIX_KEY, EFI_CERT_PEM, EFI_CERT_KEY, EFI_CERT_PEM_H, EFI_CERT_KEY_H, EFI_SANDBOX, PROMO_CODES] },
  async (request) => {
    const userId     = request.auth?.uid;
    if (!userId) throw new HttpsError('unauthenticated', 'Login required');

    const couponCode = (request.data?.couponCode || '').trim().toUpperCase() || null;
    const txid       = generateTxid();
    const pixKey     = EFI_PIX_KEY.value();

    // Resolve amount
    let amount = SUBSCRIPTION_AMOUNT, discountPct = 0;
    if (couponCode) {
      const codes = parsePromoCodes(PROMO_CODES.value());
      const pct   = codes[couponCode];
      if (pct === undefined) throw new HttpsError('not-found', 'Cupom inválido');

      const usedSnap = await db.collection('Transaction')
        .where('userId', '==', userId)
        .where('couponCode', '==', couponCode)
        .where('status', '==', 'paid')
        .limit(1).get();
      if (!usedSnap.empty) throw new HttpsError('already-exists', 'Você já usou este cupom');

      discountPct = pct;
      amount      = applyDiscount(SUBSCRIPTION_AMOUNT, discountPct);
    }

    // Check if already active
    const subDoc = await db.collection('Subscription').doc(userId).get();
    if (subDoc.exists) {
      const sub = subDoc.data();
      if (sub.status === 'active' && sub.expiresAt?.toDate() > new Date()) {
        throw new HttpsError('already-exists', 'Subscription already active');
      }
    }

    // Reuse recent pending charge (avoid duplicates)
    const existingTx = await db.collection('Transaction')
      .where('userId', '==', userId)
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .limit(1).get();

    if (!existingTx.empty) {
      const tx  = existingTx.docs[0].data();
      const age = Date.now() - tx.createdAt.toDate().getTime();
      if (age < 30 * 60 * 1000) {
        return {
          txid:          tx.txid,
          pixCopiaECola: tx.pixCopiaECola,
          qrCodeBase64:  tx.qrCodeBase64,
          amount:        tx.amount,
          expiresAt:     tx.expiresAt?.toDate().toISOString(),
        };
      }
    }

    try {
      const { http } = await buildEFIClient(efiSecrets());
      const expiresIn = 1800; // 30 minutes

      // PUT /v2/cob/{txid} — BACEN standard
      const cobRes = await http.put(`/v2/cob/${txid}`, {
        calendario: { expiracao: expiresIn },
        valor:      { original: amount },
        chave:      pixKey,
        solicitacaoPagador: 'Assinatura mensal Bem na Mosca',
        infoAdicionais: [
          { nome: 'userId', valor: userId },
          { nome: 'plan',   valor: 'monthly' },
        ],
      });

      const locId = cobRes.data.loc?.id;

      // GET /v2/loc/{locId}/qrcode
      const qrRes         = await http.get(`/v2/loc/${locId}/qrcode`);
      const pixCopiaECola = qrRes.data.qrcode;          // EFI field name
      const qrCodeBase64  = qrRes.data.imagemQrcode;    // base64 PNG

      const chargeExpiresAt = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + expiresIn * 1000)
      );

      await db.collection('Transaction').doc(txid).set({
        txid,
        userId,
        amount,
        originalAmount: SUBSCRIPTION_AMOUNT,
        discountPct,
        couponCode:    couponCode || null,
        status:        'pending',
        pixCopiaECola,
        qrCodeBase64,
        createdAt:     admin.firestore.FieldValue.serverTimestamp(),
        expiresAt:     chargeExpiresAt,
        paidAt:        null,
        e2eid:         null,
        locId:         String(locId),
      });

      return {
        txid, pixCopiaECola, qrCodeBase64, amount,
        originalAmount: SUBSCRIPTION_AMOUNT,
        discountPct, couponCode,
        expiresAt: chargeExpiresAt.toDate().toISOString(),
      };

    } catch (err) {
      console.error('[createPixCharge] EFI API error:', err.response?.data || err.message);
      throw new HttpsError('internal', 'Failed to create PIX charge. Try again.');
    }
  }
);

// ────────────────────────────────────────────────────────────
// FUNCTION 2 — checkPixPayment
// ────────────────────────────────────────────────────────────
exports.checkPixPayment = onCall(
  { secrets: [EFI_CLIENT_ID, EFI_CLIENT_SECRET, EFI_CLIENT_ID_H, EFI_CLIENT_SECRET_H, EFI_CERT_PEM, EFI_CERT_KEY, EFI_CERT_PEM_H, EFI_CERT_KEY_H, EFI_SANDBOX] },
  async (request) => {
    const userId = request.auth?.uid;
    if (!userId) throw new HttpsError('unauthenticated', 'Login required');

    const { txid } = request.data;
    if (!txid) throw new HttpsError('invalid-argument', 'txid required');

    const txDoc = await db.collection('Transaction').doc(txid).get();
    if (!txDoc.exists) throw new HttpsError('not-found', 'Transaction not found');

    const tx = txDoc.data();
    if (tx.userId !== userId) throw new HttpsError('permission-denied', 'Not your transaction');

    if (tx.status === 'paid') {
      return { status: 'paid', paidAt: tx.paidAt?.toDate().toISOString() };
    }

    try {
      const { http } = await buildEFIClient(efiSecrets());
      const cobRes   = await http.get(`/v2/cob/${txid}`);
      const cob      = cobRes.data;

      // BACEN status: ATIVA | CONCLUIDA | REMOVIDA_PELO_USUARIO_RECEBEDOR | REMOVIDA_PELO_PSP
      if (cob.status === 'CONCLUIDA' && cob.pix?.length > 0) {
        const payment = cob.pix[0];
        const paidAt  = admin.firestore.Timestamp.fromDate(new Date(payment.horario));
        await txDoc.ref.update({ status: 'paid', paidAt, e2eid: payment.endToEndId });
        await activateSubscription(userId, txid, paidAt);
        return { status: 'paid', paidAt: paidAt.toDate().toISOString() };
      }

      if (
        cob.status === 'REMOVIDA_PELO_USUARIO_RECEBEDOR' ||
        cob.status === 'REMOVIDA_PELO_PSP'
      ) {
        await txDoc.ref.update({ status: 'expired' });
        return { status: 'expired' };
      }

      return { status: 'pending' };

    } catch (err) {
      console.error('[checkPixPayment] EFI API error:', err.response?.data || err.message);
      throw new HttpsError('internal', 'Failed to check payment status');
    }
  }
);

// ────────────────────────────────────────────────────────────
// FUNCTION 3 — pixWebhook
// Register at EFI Bank: PUT /v2/webhook/{pixKey}
// ────────────────────────────────────────────────────────────
exports.pixWebhook = onRequest(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const payments = req.body?.pix || [];

    for (const payment of payments) {
      const { txid, endToEndId, horario } = payment;
      if (!txid) continue;

      const txDoc = await db.collection('Transaction').doc(txid).get();
      if (!txDoc.exists) continue;

      const tx = txDoc.data();
      if (tx.status === 'paid') continue; // idempotent

      const paidAt = admin.firestore.Timestamp.fromDate(new Date(horario));
      await txDoc.ref.update({ status: 'paid', paidAt, e2eid: endToEndId });
      await activateSubscription(tx.userId, txid, paidAt);

      console.log(`[pixWebhook] Payment confirmed: txid=${txid} userId=${tx.userId}`);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[pixWebhook] Error:', err);
    res.status(500).json({ error: 'internal' });
  }
});

// ── Helper: activate / renew subscription ───────────────────
async function activateSubscription(userId, txid, paidAt) {
  const subRef = db.collection('Subscription').doc(userId);
  const subDoc = await subRef.get();

  let baseDate = paidAt.toDate();
  if (subDoc.exists && subDoc.data().status === 'active') {
    const current = subDoc.data().expiresAt?.toDate();
    if (current > baseDate) baseDate = current;
  }

  const expiresAt = new Date(baseDate);
  expiresAt.setDate(expiresAt.getDate() + SUBSCRIPTION_DAYS);

  await subRef.set({
    userId,
    status:        'active',
    plan:          'monthly',
    amount:        SUBSCRIPTION_AMOUNT,
    expiresAt:     admin.firestore.Timestamp.fromDate(expiresAt),
    lastPaymentAt: paidAt,
    lastTxid:      txid,
    updatedAt:     admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}
