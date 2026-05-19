'use client';

import { useEffect, useState } from 'react';

import {
  DEMO_SESSION_STORAGE_KEY,
  DEMO_USER_STORAGE_KEY,
  readDemoAccount,
  type DemoAccount,
  type DemoSession,
  type DemoUser,
} from './demo-auth';

type DemoSessionState = {
  account: DemoAccount | null;
  user: DemoUser | null;
  session: DemoSession | null;
  ready: boolean;
};

export function useDemoSession(): DemoSessionState {
  const [state, setState] = useState<DemoSessionState>({
    account: null,
    user: null,
    session: null,
    ready: false,
  });

  useEffect(() => {
    const account = readDemoAccount();
    const rawUser = localStorage.getItem(DEMO_USER_STORAGE_KEY);
    const rawSession = localStorage.getItem(DEMO_SESSION_STORAGE_KEY);

    setState({
      account,
      user: rawUser ? (JSON.parse(rawUser) as DemoUser) : null,
      session: rawSession ? (JSON.parse(rawSession) as DemoSession) : null,
      ready: true,
    });
  }, []);

  return state;
}
