import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Field, Notice } from '../components/ui.jsx';
import AuthShell from './AuthShell.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'tenant' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) return setError('Use at least 6 characters for your password.');
    setBusy(true);
    try {
      const user = await register(form);
      navigate(user.role === 'owner' ? '/owner' : '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h2 className="text-3xl font-extrabold tracking-tight">Create your account</h2>
      <p className="text-sm text-muted mt-1 mb-8">
        Already registered?{' '}
        <Link to="/login" className="text-accent font-semibold hover:underline">
          Sign in
        </Link>
      </p>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <span className="block text-xs font-semibold text-muted mb-1.5">I am a</span>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['tenant', 'Tenant', 'I rent a room'],
              ['owner', 'Owner', 'I manage properties'],
            ].map(([value, title, sub]) => (
              <button
                type="button"
                key={value}
                onClick={() => setForm({ ...form, role: value })}
                className={`text-left rounded-xl border p-3 transition ${
                  form.role === value ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:bg-soft'
                }`}
              >
                <p className="font-bold text-sm">{title}</p>
                <p className="text-[11px] text-muted">{sub}</p>
              </button>
            ))}
          </div>
        </div>
        <Field label="Full name" name="name" value={form.name} onChange={change} required />
        <Field label="Email" name="email" type="email" value={form.email} onChange={change} required />
        <Field label="Password" name="password" type="password" value={form.password} onChange={change} hint="At least 6 characters" required />
        {error && <Notice>{error}</Notice>}
        <Button type="submit" disabled={busy} className="w-full" size="lg">
          {busy ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  );
}
