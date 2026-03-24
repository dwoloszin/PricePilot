import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Check, Loader2, AlertCircle, MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import TargetLogo from '@/components/ui/TargetLogo';

export default function UsernameSetup() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername]       = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]             = useState('');

  // CEP & address
  const [cep, setCep]               = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError]     = useState('');
  const [cepFound, setCepFound]     = useState(false);
  const [logradouro, setLogradouro] = useState('');
  const [bairro, setBairro]         = useState('');
  const [cidade, setCidade]         = useState('');
  const [estado, setEstado]         = useState('');
  const [numero, setNumero]         = useState('');
  const [observacao, setObservacao] = useState('');

  // If user already has a username, skip setup
  useEffect(() => {
    if (isAuthenticated && user?.username) {
      navigate('/');
    }
  }, [user, isAuthenticated, navigate]);

  // ────────────────────────────────────────────────
  // CEP helpers
  // ────────────────────────────────────────────────
  const rawCep = cep.replace(/\D/g, '');

  const formatCep = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  const handleCepChange = (e) => {
    const formatted = formatCep(e.target.value);
    setCep(formatted);
    setCepError('');
    setCepFound(false);
    // Clear address fields when CEP changes
    if (formatted.replace(/\D/g, '').length < 8) {
      setLogradouro('');
      setBairro('');
      setCidade('');
      setEstado('');
    }
  };

  const fetchCep = async () => {
    if (rawCep.length !== 8) return;
    setCepLoading(true);
    setCepError('');
    setCepFound(false);
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError('CEP não encontrado. Verifique e tente novamente.');
        setLogradouro(''); setBairro(''); setCidade(''); setEstado('');
      } else {
        setLogradouro(data.logradouro || '');
        setBairro(data.bairro       || '');
        setCidade(data.localidade   || '');
        setEstado(data.uf           || '');
        setCepFound(true);
      }
    } catch {
      setCepError('Erro ao buscar CEP. Verifique sua conexão.');
    } finally {
      setCepLoading(false);
    }
  };

  // Auto-fetch when 8 digits are typed
  useEffect(() => {
    if (rawCep.length === 8) {
      fetchCep();
    }
  }, [rawCep]);

  // ────────────────────────────────────────────────
  // Form submit
  // ────────────────────────────────────────────────
  const isFormValid =
    username.trim().length >= 3 &&
    rawCep.length === 8 &&
    !cepError &&
    cepFound &&
    numero.trim().length > 0 &&
    observacao.length <= 50;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid || !user) return;

    setIsSubmitting(true);
    setError('');

    try {
      const allUsers = JSON.parse(localStorage.getItem('pricepilot_all_users') || '[]');
      const isTaken  = allUsers.some(
        u => u.username.toLowerCase() === username.toLowerCase() && u.id !== user.id
      );

      if (isTaken) {
        setError('Este nome de usuário já está em uso. Tente outro.');
        setIsSubmitting(false);
        return;
      }

      const updatedUser = {
        ...user,
        username:   username.trim(),
        cep:        rawCep,
        logradouro: logradouro.trim(),
        bairro:     bairro.trim(),
        cidade:     cidade.trim(),
        estado:     estado.trim(),
        numero:     numero.trim(),
        observacao: observacao.trim(),
      };

      localStorage.setItem('pricepilot_user', JSON.stringify(updatedUser));

      const userIndex = allUsers.findIndex(u => u.id === user.id);
      if (userIndex !== -1) {
        allUsers[userIndex] = { ...allUsers[userIndex], username: username.trim() };
      } else {
        allUsers.push({ id: user.id, username: username.trim() });
      }
      localStorage.setItem('pricepilot_all_users', JSON.stringify(allUsers));

      window.dispatchEvent(new Event('storage'));
      toast.success('Cadastro concluído!');

      setTimeout(() => navigate('/'), 500);
    } catch (err) {
      console.error('Error setting username:', err);
      setError('Algo deu errado. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
            <TargetLogo className="w-11 h-11" color="white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Bem na Mosca</h1>
          <p className="text-slate-500">
            Olá, {user?.full_name}! Complete seu cadastro para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-5">

          {/* ── Username ── */}
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-slate-700 font-medium">
              Nome de usuário <span className="text-red-500">*</span>
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              placeholder="ex: caçador_de_preços"
              className="h-12 bg-slate-50 border-slate-200 focus:bg-white"
              required
              minLength={3}
              maxLength={20}
            />
            <p className="text-[10px] text-slate-400">Apenas letras, números e underscores. Mínimo 3 caracteres.</p>
          </div>

          {/* ── Divider ── */}
          <div className="flex items-center gap-2 text-slate-400">
            <div className="flex-1 h-px bg-slate-100" />
            <MapPin className="w-3.5 h-3.5" />
            <span className="text-xs">Endereço</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* ── CEP ── */}
          <div className="space-y-1.5">
            <Label htmlFor="cep" className="text-slate-700 font-medium">
              CEP <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="cep"
                value={cep}
                onChange={handleCepChange}
                onBlur={fetchCep}
                placeholder="00000-000"
                className="h-12 bg-slate-50 border-slate-200 focus:bg-white pr-10"
                maxLength={9}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {cepLoading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
                {!cepLoading && cepFound && <Check className="w-4 h-4 text-emerald-500" />}
                {!cepLoading && !cepFound && rawCep.length === 8 && cepError && (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
            </div>
            {cepError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {cepError}
              </p>
            )}
          </div>

          {/* ── Address fields (shown after successful lookup) ── */}
          {cepFound && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">

              {/* Logradouro + Número */}
              <div className="flex gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-slate-700 font-medium text-sm">Rua / Logradouro</Label>
                  <Input
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                    placeholder="Nome da rua"
                    className="h-11 bg-emerald-50/50 border-slate-200 text-sm"
                  />
                </div>
                <div className="w-24 space-y-1.5">
                  <Label className="text-slate-700 font-medium text-sm">
                    Número <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="Nº"
                    className="h-11 border-slate-200 text-sm"
                    required
                  />
                </div>
              </div>

              {/* Bairro + UF */}
              <div className="flex gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-slate-700 font-medium text-sm">Bairro</Label>
                  <Input
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    placeholder="Bairro"
                    className="h-11 bg-emerald-50/50 border-slate-200 text-sm"
                  />
                </div>
                <div className="w-16 space-y-1.5">
                  <Label className="text-slate-700 font-medium text-sm">UF</Label>
                  <Input
                    value={estado}
                    onChange={(e) => setEstado(e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="UF"
                    className="h-11 bg-emerald-50/50 border-slate-200 text-sm text-center uppercase"
                    maxLength={2}
                  />
                </div>
              </div>

              {/* Cidade */}
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-medium text-sm">Cidade</Label>
                <Input
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Cidade"
                  className="h-11 bg-emerald-50/50 border-slate-200 text-sm"
                />
              </div>
            </div>
          )}

          {/* ── Observação ── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="observacao" className="text-slate-700 font-medium">
                Observação
              </Label>
              <span className={`text-xs ${observacao.length > 50 ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                {observacao.length}/50
              </span>
            </div>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Alguma observação? (opcional)"
              className="bg-slate-50 border-slate-200 focus:bg-white resize-none text-sm"
              rows={2}
              maxLength={50}
            />
            {observacao.length > 50 && (
              <p className="text-xs text-red-500">Limite de 50 caracteres atingido.</p>
            )}
          </div>

          {/* ── Global error ── */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Submit ── */}
          <Button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Concluir Cadastro
              </>
            )}
          </Button>
        </form>

        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => logout()}
            className="text-slate-400 hover:text-red-500"
          >
            Sair e tentar mais tarde
          </Button>
        </div>
      </div>
    </div>
  );
}
