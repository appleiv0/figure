import { USER } from "../../constants/common.constant";

// -------------------------Check login------------------------------------
export const isLogin = () => !!getItemLocalStorage(USER);

// -----------------Get/set/remove item localstorage-----------------------
export const setItemLocalStorage = (key: string, value: any) =>
  typeof localStorage !== "undefined" && key && value
    ? localStorage.setItem(key, JSON.stringify(value))
    : null;

export const getItemLocalStorage = (key: string | null) =>
  typeof localStorage !== "undefined" && key
    ? JSON.parse(localStorage.getItem(key) as string)
    : null;

export const removeItemLocalStorage = (
  key: string | null,
  options?: { removeAll?: boolean }
) => {
  if (typeof localStorage === "undefined") {
    return false;
  }
  const { removeAll } = options || { removeAll: false };

  if (removeAll) {
    // Remove all item in localstorage
    localStorage.clear();
    return true;
  }

  if (!key) {
    return false;
  }

  localStorage.removeItem(key);
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
