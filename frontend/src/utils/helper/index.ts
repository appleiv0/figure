import { USER } from "../../constants/common.constant";

// -------------------------Check login------------------------------------
export const isLogin = () => !!getItemLocalStorage(USER);

// -----------------Get/set/remove item localstorage-----------------------
export const setItemLocalStorage = (key: string, value: any) =>
  typeof sessionStorage !== "undefined" && key && value
    ? sessionStorage.setItem(key, JSON.stringify(value))
    : null;

export const getItemLocalStorage = (key: string | null) => {
  if (typeof sessionStorage === "undefined" || !key) return null;
  try {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
};

export const removeItemLocalStorage = (
  key: string | null,
  options?: { removeAll?: boolean }
) => {
  if (typeof sessionStorage === "undefined") {
    return false;
  }
  const { removeAll } = options || { removeAll: false };

  if (removeAll) {
    // Remove all item in sessionStorage
    sessionStorage.clear();
    return true;
  }

  if (!key) {
    return false;
  }

  sessionStorage.removeItem(key);
  return true;
};

export const replaceStringBase64 = (str: string) => {
  return str.replace(/^data:image\/[a-z]+;base64,/, "");
};

export const fixedNumber = (number: number) => {
  if (number === 0) return 0;
  return Math.round(number * 10) / 10;
};

export const isRealValue = (obj: any) => {
  return obj && obj !== "null" && obj !== "undefined";
};
