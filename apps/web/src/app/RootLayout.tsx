import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Toasts } from '../components/Toasts';
import { useSettings } from '../store/settingsStore';

/** Moldura global: aplica preferências e mostra notificações fora da partida. */
export function RootLayout() {
  const animations = useSettings((s) => s.animations);
  const location = useLocation();
  const inGame = location.pathname.startsWith('/jogo');
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', !animations);
  }, [animations]);
  return (
    <>
      <Outlet />
      {!inGame && <Toasts />}
    </>
  );
}
