import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuth, getProfile } from './store.js';
import { DICT } from './i18n.js';

const Ctx = createContext(null);

export function AppProvider({ children }) {
  const [authUser, setAuthUser] = useState(undefined); // undefined = still loading
  const [profile, setProfile] = useState(null);
  const [serverError, setServerError] = useState('');
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem('gs_lang') || 'en'; } catch { return 'en'; }
  });

  useEffect(() => onAuth(async (u) => {
    setAuthUser(u);
    if (u) {
      let p = null;
      try {
        p = await getProfile(u.uid);
        setServerError('');
      } catch (e) {
        console.error(e);
        setServerError(e?.message || 'Server error.');
      }
      setProfile(p || { uid: u.uid, name: u.email, email: u.email, premium: false, progress: {} });
    } else setProfile(null);
  }), []);

  const refresh = useCallback(async () => {
    if (authUser) { try { setProfile(await getProfile(authUser.uid)); setServerError(''); } catch (e) { setServerError(e?.message || ''); } }
  }, [authUser]);

  const setLang = (l) => { setLangState(l); try { localStorage.setItem('gs_lang', l); } catch { /* ignore */ } };
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const t = useCallback((key, vars) => {
    let s = DICT[lang]?.[key] ?? DICT.en[key] ?? key;
    if (vars) Object.entries(vars).forEach(([k, v]) => { s = s.split('{' + k + '}').join(v); });
    return s;
  }, [lang]);

  return (
    <Ctx.Provider value={{ authUser, profile, serverError, setProfile, refresh, lang, setLang, t, loading: authUser === undefined || (authUser && !profile) }}>
      {children}
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);

export function fmt(n) {
  const v = Math.round(n || 0);
  return (v < 0 ? '-' : '') + Math.abs(v).toLocaleString('en-US');
}
