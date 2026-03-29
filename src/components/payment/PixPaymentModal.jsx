// ──────────────────────────────────────────────────────────
// Bem na Mosca — DARIO WOLOSZIN
// https://github.com/dwoloszin
// ──────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createPixCharge, checkPixPayment, validateCoupon } from '@/api/subscriptionClient';
import { Loader2, Copy, Check, RefreshCw, QrCode, CircleCheck, Tag, X } from 'lucide-react';
import { toast } from 'sonner';

const POLL_INTERVAL_MS = 5000; // check every 5 seconds

export default function PixPaymentModal({ open, onOpenChange, onPaymentConfirmed }) {
  const [step, setStep]               = useState('coupon'); // coupon | loading | qr | paid | error
  const [charge, setCharge]           = useState(null);
  const [copied, setCopied]           = useState(false);
  const [timeLeft, setTimeLeft]       = useState(null);
  const [couponInput, setCouponInput] = useState('');
  const [couponData, setCouponData]   = useState(null);  // { code, discountPct, finalAmount }
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const pollRef                       = useRef(null);
  const timerRef                      = useRef(null);

  // Reset when modal opens
  useEffect(() => {
    if (!open) { cleanup(); return; }
    setStep('coupon');
    setCouponInput('');
    setCouponData(null);
    setCouponError('');
    setCharge(null);
  }, [open]);

  async function handleValidateCoupon() {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const data = await validateCoupon(couponInput.trim());
      setCouponData(data);
      toast.success(`Cupom aplicado! ${data.discountPct}% de desconto`);
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('already-exists')) setCouponError('Você já usou este cupom.');
      else setCouponError('Cupom inválido ou expirado.');
    } finally {
      setCouponLoading(false);
    }
  }

  async function loadCharge() {
    setStep('loading');
    setCharge(null);
    try {
      const data = await createPixCharge(couponData?.code || null);
      setCharge(data);
      setStep('qr');
      startCountdown(new Date(data.expiresAt));
      startPolling(data.txid);
    } catch (err) {
      const msg = err?.message || 'Erro ao gerar PIX';
      if (msg.includes('already active') || msg.includes('already-exists')) {
        toast.info('Assinatura já está ativa!');
        onOpenChange(false);
      } else {
        setStep('error');
      }
    }
  }

  function startCountdown(expiresAt) {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const secs = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(secs);
      if (secs === 0) {
        clearInterval(timerRef.current);
        cleanup();
        setStep('error');
      }
    }, 1000);
  }

  function startPolling(txid) {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const result = await checkPixPayment(txid);
        if (result.status === 'paid') {
          cleanup();
          setStep('paid');
          toast.success('Pagamento confirmado! 🎉');
          setTimeout(() => {
            onPaymentConfirmed?.();
            onOpenChange(false);
          }, 2500);
        } else if (result.status === 'expired') {
          cleanup();
          setStep('error');
        }
      } catch { /* silent */ }
    }, POLL_INTERVAL_MS);
  }

  function cleanup() {
    clearInterval(pollRef.current);
    clearInterval(timerRef.current);
  }

  async function handleCopy() {
    if (!charge?.pixCopiaECola) return;
    try {
      await navigator.clipboard.writeText(charge.pixCopiaECola);
      setCopied(true);
      toast.success('Código copiado!');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error('Não foi possível copiar. Copie manualmente.');
    }
  }

  function formatTime(secs) {
    if (secs === null) return '--:--';
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) cleanup(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[400px] rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-500" />
            Assinar — R$ {couponData ? couponData.finalAmount : '9,90'}/mês
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6">

          {/* Coupon step */}
          {step === 'coupon' && (
            <div className="space-y-4">
              {/* Price display */}
              <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
                {couponData ? (
                  <div className="space-y-1">
                    <p className="text-sm text-slate-400 line-through">R$ {couponData.originalAmount}</p>
                    <p className="text-3xl font-bold text-emerald-600">R$ {couponData.finalAmount}</p>
                    <span className="inline-block text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                      {couponData.discountPct}% de desconto · {couponData.code}
                    </span>
                  </div>
                ) : (
                  <p className="text-3xl font-bold text-slate-800">R$ 9,90<span className="text-sm font-normal text-slate-400">/mês</span></p>
                )}
              </div>

              {/* Coupon input */}
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />Cupom de desconto (opcional)
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={couponInput}
                      onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); setCouponData(null); }}
                      placeholder="ex: BEMVINDO50"
                      className="h-11 font-mono uppercase pr-8"
                      onKeyDown={e => e.key === 'Enter' && handleValidateCoupon()}
                    />
                    {couponInput && (
                      <button onClick={() => { setCouponInput(''); setCouponData(null); setCouponError(''); }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <Button variant="outline" onClick={handleValidateCoupon}
                    disabled={!couponInput.trim() || couponLoading}
                    className="h-11 px-4 shrink-0">
                    {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
                  </Button>
                </div>
                {couponData && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Cupom válido!
                  </p>
                )}
                {couponError && (
                  <p className="text-xs text-red-500">{couponError}</p>
                )}
              </div>

              <Button onClick={loadCharge} className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold">
                <QrCode className="w-4 h-4 mr-2" />
                Gerar QR Code PIX
              </Button>
            </div>
          )}

          {/* Loading */}
          {step === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
              <p className="text-slate-500 text-sm">Gerando QR Code PIX...</p>
            </div>
          )}

          {/* QR Code */}
          {step === 'qr' && charge && (
            <div className="space-y-4">
              {/* QR Image */}
              <div className="flex justify-center">
                <div className="bg-white border-2 border-slate-100 rounded-2xl p-3 shadow-inner">
                  {charge.qrCodeBase64 ? (
                    <img
                      src={`data:image/png;base64,${charge.qrCodeBase64}`}
                      alt="QR Code PIX"
                      className="w-48 h-48"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center bg-slate-50 rounded-xl">
                      <QrCode className="w-16 h-16 text-slate-300" />
                    </div>
                  )}
                </div>
              </div>

              {/* Countdown */}
              <div className="text-center">
                <p className="text-xs text-slate-400">QR Code expira em</p>
                <p className={`text-2xl font-bold tabular-nums ${timeLeft !== null && timeLeft < 120 ? 'text-red-500' : 'text-slate-700'}`}>
                  {formatTime(timeLeft)}
                </p>
              </div>

              {/* Copia e cola */}
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200">
                <p className="text-[10px] text-slate-400 font-medium uppercase mb-1">Pix Copia e Cola</p>
                <p className="text-xs text-slate-600 font-mono break-all leading-relaxed line-clamp-3">
                  {charge.pixCopiaECola}
                </p>
              </div>

              <Button
                onClick={handleCopy}
                className={`w-full h-12 rounded-xl font-semibold transition-all ${
                  copied
                    ? 'bg-emerald-500 hover:bg-emerald-500 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {copied ? (
                  <><Check className="w-4 h-4 mr-2" />Copiado!</>
                ) : (
                  <><Copy className="w-4 h-4 mr-2" />Copiar código</>
                )}
              </Button>

              <p className="text-[10px] text-slate-400 text-center">
                Aguardando confirmação de pagamento...
                <span className="inline-flex items-center gap-1 ml-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                </span>
              </p>
            </div>
          )}

          {/* Paid */}
          {step === 'paid' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                <CircleCheck className="w-12 h-12 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Pagamento confirmado!</h3>
              <p className="text-slate-500 text-sm text-center">
                Sua assinatura foi ativada por 30 dias. Obrigado! 🎉
              </p>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-slate-600 text-sm text-center">
                QR Code expirou ou ocorreu um erro. Tente gerar um novo.
              </p>
              <Button
                onClick={loadCharge}
                className="bg-emerald-500 hover:bg-emerald-600 rounded-xl"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Gerar novo QR Code
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
