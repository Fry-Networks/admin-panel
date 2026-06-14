import { getProviders, getSession, signIn } from 'next-auth/react';

export default function SignIn({ providers }: { providers: any }) {
  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 shadow-sm p-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-500 text-white grid place-items-center font-semibold">
            FRY
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Admin Panel</h1>
            <p className="text-sm text-gray-400">Sign in to continue</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {providers && Object.values(providers).map((provider: any) => {
            if (provider.name === 'Email') {
              return null;
            }
            return (
              <button
                key={provider.name}
                className="w-full rounded-lg border border-gray-600 px-4 py-3 text-sm font-medium text-gray-200 hover:bg-gray-800"
                onClick={() => signIn(provider.id)}
              >
                Sign in with {provider.name}
              </button>
            );
          })}
          {!providers && (
            <p className="text-sm text-gray-400">
              No authentication providers are configured.
            </p>
          )}
        </div>

        <p className="mt-6 text-xs text-gray-500">
          Access is restricted to approved admins only.
        </p>
      </div>
    </main>
  );
}

export async function getServerSideProps(context: any) {
  const session = await getSession(context);
  if (session?.user) {
    return {
      redirect: {
        destination: '/',
        permanent: false
      }
    };
  }
  const providers = await getProviders();
  return {
    props: { providers }
  };
}
