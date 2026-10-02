import React, { useEffect, useState } from 'react';
import { getUrlToken, isTokenTrusted } from '../utils/auth';
import LoginPage from '../pages/LoginPage';

interface AuthGateProps {
  children: React.ReactNode;
}

type AuthState = 'checking' | 'trusted' | 'untrusted';

const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>('checking');

  useEffect(() => {
    const token = getUrlToken();
    if (!token) {
      setState('untrusted');
      return;
    }
    isTokenTrusted(token).then((trusted) => {
      setState(trusted ? 'trusted' : 'untrusted');
    });
  }, []);

  if (state === 'checking') {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#f5f5f7]">
        <svg className="animate-spin text-indigo-600" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
      </div>
    );
  }

  if (state === 'untrusted') return <LoginPage />;
  return <>{children}</>;
};

export default AuthGate;
