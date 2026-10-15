import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Field, Notice } from '../components/ui.jsx';
import AuthShell from './AuthShell.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(form.email, form.password);
      navigate(user.role === 'owner' ? '/owner' : '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const fill = (email) => setForm({ email, password: '123456' });

  return (
    <AuthShell>
      <h2 className="text-3xl font-extrabold tracking-tight">Sign in</h2>
      <p className="text-sm text-muted mt-1 mb-8">
        New here?{' '}
        <Link to="/register" className="text-accent font-semibold hover:underline">
          Create an account
        </Link>
      </p>

      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" name="email" type="email" value={form.email} onChange={change} placeholder="you@example.com" required />
        <Field label="Password" name="password" type="password" value={form.password} onChange={change} placeholder="••••••" required />
        {error && <Notice>{error}</Notice>}
        <Button type="submit" disabled={busy} className="w-full" size="lg">
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="mt-8 rounded-2xl border border-line bg-soft p-4">
        <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Demo accounts</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={() => fill('owner@rentbook.in')}>Owner</Button>
          <Button variant="ghost" size="sm" type="button" onClick={() => fill('tenant@rentbook.in')}>Tenant</Button>
          <Link to="/status" className="ml-auto text-xs text-accent font-semibold self-center hover:underline">
            Service status
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
