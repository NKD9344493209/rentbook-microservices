import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Restore the session on page refresh (read once, before the first render).
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('rentbook_user'));
    } catch {
      return null;
    }
  });

  const logout = useCallback(() => {
    localStorage.removeItem('rentbook_token');
    localStorage.removeItem('rentbook_user');
    setUser(null);
  }, []);

  // Either service answering 401 means the token expired: sign out.
  useEffect(() => {
    window.addEventListener('rentbook:unauthorized', logout);
    return () => window.removeEventListener('rentbook:unauthorized', logout);
  }, [logout]);

  const persist = ({ token, user }) => {
    localStorage.setItem('rentbook_token', token);
    localStorage.setItem('rentbook_user', JSON.stringify(user));
    setUser(user);
    return user;
  };

  const login = async (email, password) => persist(await api.login(email, password));
  const register = async (payload) => persist(await api.register(payload));

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
