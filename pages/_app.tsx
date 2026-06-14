import { NextPage } from 'next';
import { AppProps } from 'next/app';
import '../app/globals.css';
import { useSession, SessionProvider } from 'next-auth/react';
import { WalletProvider, useInitializeProviders, PROVIDER_ID } from '../lib/use-wallet-compat';
import Navbar from '../app/navbar';

import { useRouter } from 'next/router';
import { useEffect } from 'react';
interface MyAppProps extends AppProps {
  Component: NextPage;
}

interface ProtectedComponentProps {
  Component: NextPage;
  pageProps: any;
}

export default function MyApp({ Component, pageProps }: MyAppProps) {
  const providers = useInitializeProviders({
    providers: [{ id: PROVIDER_ID.PERA }]
  });

  return (
    <SessionProvider session={pageProps.session}>
      <WalletProvider value={providers}>
        <div id="main" className="dark bg-gray-950 text-white min-h-screen">
          <ProtectedComponent Component={Component} pageProps={pageProps} />
        </div>
      </WalletProvider>
    </SessionProvider>
  );
}

const ProtectedComponent: React.FC<ProtectedComponentProps> = ({
  Component,
  pageProps
}) => {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';
  const router = useRouter();
  const showInfo = (text: string) => {
    return (
      <p className="m-12 text-gray-300">
        {text}
      </p>
    );
  };

  // Redirect unauthenticated users to the login page in production.
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') return;
    if (status === 'unauthenticated' && router.pathname !== '/login') {
      router.replace('/login');
    }
  }, [status, router]);

  // Allow the login page to render without showing the global guard message.
  if (router.pathname === '/login') {
    return <Component {...pageProps} />;
  }

  if (isLoading) return showInfo('Loading...');
  if (process.env.NODE_ENV !== 'development') {
    if (!session) {
      return showInfo('User is not logged in!');
    }

    if (!session.user?.admin) {
      return showInfo('User is not an admin!');
    }
    if (router.pathname === '/dao' && !session.user?.owner) {
      return showInfo('Sorry guys, only owners can access this page!');
    }
  }

  return (
    <>
      {session?.user?.admin ? <Navbar /> : null}
      <Component {...pageProps} />
    </>
  );
};
