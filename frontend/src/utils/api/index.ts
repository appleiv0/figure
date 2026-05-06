import { USER } from "../../constants/common.constant";
import { getItemLocalStorage } from "../helper";

const baseURL = import.meta.env.VITE_ENV_API_BACKEND_DOMAIN || "";
const timeOut = 30000;

export const restTransport = () => {
  const get = async (url: string, params: Record<string, any> = {}, config: Record<string, string> = {}) => {
    const query = Object.keys(params).length
      ? "?" + new URLSearchParams(params).toString()
      : "";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeOut);
    try {
      const res = await fetch(`${baseURL}${url}${query}`, {
        method: "GET",
        headers: { "Content-Type": "application/json", ...config },
        signal: controller.signal,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const err: any = new Error(`API Error: ${res.status}`);
        err.response = { data: errData, status: res.status };
        throw err;
      }
      const data = await res.json();
      return { data };
    } finally {
      clearTimeout(timer);
    }
  };

  const post = async (url: string, data?: any, config: Record<string, string> = {}) => {
    // Auto-attach sessionToken to therapy API requests
    const userInfo = getItemLocalStorage(USER);
    if (userInfo?.sessionToken && data && typeof data === "object") {
      data = { ...data, sessionToken: userInfo.sessionToken };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeOut);
    try {
      const res = await fetch(`${baseURL}${url}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...config },
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const err: any = new Error(`API Error: ${res.status}`);
        err.response = { data: errData, status: res.status };
        throw err;
      }
      const resData = await res.json();
      return { data: resData };
    } finally {
      clearTimeout(timer);
    }
  };

  return { get, post };
};
