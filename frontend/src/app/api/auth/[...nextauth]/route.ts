import NextAuth from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";

import { NextAuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";

export const authOptions: NextAuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID || "smart-vault-app",
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || "dev-secret-change-in-prod",
      issuer: process.env.KEYCLOAK_ISSUER || "http://localhost:8080/realms/smart-vault",
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the OAuth id_token and sub to the token right after signin
      if (account && profile) {
        token.idToken = account.id_token;
        token.sub = profile.sub;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: JWT }) {
      // Send the ID Token to the backend as it contains the full OIDC profile (including 'sub')
      session.accessToken = token.idToken;
      if (session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
