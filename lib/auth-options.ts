import type { NextAuthOptions } from 'next-auth';
import GithubProvider from 'next-auth/providers/github';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import clientPromise from './mongoclient';

export const authOptions: NextAuthOptions = {
  jwt: {
    secret: process.env.NEXTAUTH_SECRET as string
  },
  adapter: MongoDBAdapter(clientPromise, {
    collections: {
      Accounts: 'webaccounts',
      Sessions: 'websessions',
      Users: 'webusers',
      VerificationTokens: 'webverificationtokens'
    },
    databaseName: 'main'
  }),
  providers: [
    GithubProvider({
      clientId: (process.env.NODE_ENV === 'development'
        ? process.env.GITHUB_ID_DEV
        : process.env.GITHUB_ID) as string,
      clientSecret: (process.env.NODE_ENV === 'development'
        ? process.env.GITHUB_SECRET_DEV
        : process.env.GITHUB_SECRET) as string
    })
  ],
  session: {
    strategy: 'database'
  },
  callbacks: {
    async session({ session, user }) {
      // @ts-ignore - attach full user on session as before
      session.user = user;
      return session;
    },
    async redirect({ baseUrl }) {
      return baseUrl;
    }
  }
};
