'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  createLocalSession,
  ensureDemoAccount,
  persistDemoSession,
  readDemoAccount,
  type DemoUser,
  type DemoSession,
} from '../lib/demo-auth';

const defaultApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';

type LoginState = 'idle' | 'submitting' | 'success' | 'error';

type LoginResponse = {
  user: DemoUser;
  session: DemoSession;
};

export default function LoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState<LoginState>('idle');
  const [message, setMessage] = useState('');
  const [demoCredentials, setDemoCredentials] = useState({
    email: 'usuario.prueba.demo@example.com',
    password: 'PruebaSegura123',
  });

  useEffect(() => {
    const account = ensureDemoAccount();
    if (account) {
      setDemoCredentials({
        email: account.email,
        password: account.password,
      });
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setMessage('');

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    };

    const localAccount = readDemoAccount();

    if (localAccount && localAccount.email === payload.email && localAccount.password === payload.password) {
      const session = createLocalSession();
      persistDemoSession(localAccount.user, session);
      setStatus('success');
      setMessage(`Sesion demo iniciada como ${localAccount.user.fullName}. Redirigiendo al panel...`);
      router.push('/panel');
      return;
    }

    try {
      const response = await fetch(`${defaultApiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Email o password invalidos');
        }

        throw new Error('No se pudo iniciar sesion');
      }

      const data = (await response.json()) as LoginResponse;
  persistDemoSession(data.user, data.session);

      setStatus('success');
      setMessage(`Sesion iniciada como ${data.user.fullName}. Redirigiendo al panel...`);
      router.push('/panel');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Ocurrio un error inesperado');
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card auth-copy">
        <p className="eyebrow">Ingreso</p>
        <h1>Entra con la cuenta demo que acabas de crear.</h1>
        <p>
          Este ingreso usa la API real de autenticacion. Cuando validas, guardamos la sesion en el navegador y te pasamos al panel.
        </p>
        <div className="auth-note">
          <strong>Demo lista</strong>
          <span>Email: {demoCredentials.email}</span>
          <span>Password: {demoCredentials.password}</span>
        </div>
        <Link className="secondary-link" href="/">
          Volver al onboarding
        </Link>
      </section>

      <section className="auth-card">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <p className="section-label">Acceso al sistema</p>
            <label>
              Email
              <input name="email" type="email" defaultValue={demoCredentials.email} required />
            </label>
            <label>
              Password
              <input name="password" type="password" defaultValue={demoCredentials.password} required minLength={8} />
            </label>
          </div>

          <button className="submit-button" type="submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Ingresando...' : 'Ingresar'}
          </button>

          {message ? <p className={`status-message ${status}`}>{message}</p> : null}
        </form>
      </section>
    </main>
  );
}
