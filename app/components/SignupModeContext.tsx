'use client';

import { createContext, useContext, type ReactNode } from 'react';

const SignupModeContext = createContext(false);

/** Only this public boolean crosses the server/client boundary. */
export function SignupModeProvider({ directActive, children }: { directActive: boolean; children: ReactNode }) {
  return <SignupModeContext.Provider value={directActive}>{children}</SignupModeContext.Provider>;
}

export function useDirectActiveSignup() { return useContext(SignupModeContext); }
