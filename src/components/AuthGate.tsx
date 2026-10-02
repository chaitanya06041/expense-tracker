import React from 'react';
import { getUrlToken, isTokenTrusted } from '../utils/auth';
import LoginPage from '../pages/LoginPage';

interface AuthGateProps {
  children: React.ReactNode;
}

const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const token = getUrlToken();
  const trusted = token !== null && isTokenTrusted(token);

  if (!trusted) return <LoginPage />;
  return <>{children}</>;
};

export default AuthGate;
