import React, { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, useLogin, useRegister, useLogout } from "@workspace/api-client-react";
import type { User, LoginInput, RegisterInput } from "@workspace/api-client-react";
import { useLocation } from "wouter";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  token: string | null;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [, setLocation] = useLocation();

  const { data: user, isLoading: isUserLoading, isError } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    } as any,
    request: {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }
  });

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();

  useEffect(() => {
    if (isError) {
      localStorage.removeItem("token");
      setToken(null);
      setLocation("/login");
    }
  }, [isError, setLocation]);

  const login = async (data: LoginInput) => {
    const res = await loginMutation.mutateAsync({ data });
    localStorage.setItem("token", res.token);
    setToken(res.token);
    setLocation("/dashboard");
  };

  const register = async (data: RegisterInput) => {
    const res = await registerMutation.mutateAsync({ data });
    localStorage.setItem("token", res.token);
    setToken(res.token);
    setLocation("/dashboard");
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
    localStorage.removeItem("token");
    setToken(null);
    setLocation("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading: isUserLoading,
        login,
        register,
        logout,
        token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
