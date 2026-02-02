import { createContext, useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getItemLocalStorage } from "../utils/helper";
import { USER } from "../constants/common.constant";

type AuthContextType = any;

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

type AuthProviderProps = {
  children: React.ReactNode;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const currentPath = useLocation()?.pathname;

  const accessToken = getItemLocalStorage(USER);

  let isInvalied = false;
  let navigatePath = "";

  if (
    (currentPath.startsWith("/information") && currentPath !== "/") ||
    (currentPath.startsWith("/stage0") && currentPath !== "/")
  ) {
    isInvalied = !accessToken;
    navigatePath = "/";
  }

  const value: AuthContextType = {};

  return (
    <AuthContext.Provider value={value}>
      {isInvalied ? <Navigate to={navigatePath} /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  return useContext<AuthContextType>(AuthContext);
};
