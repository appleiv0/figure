import axios from "axios";
import { USER } from "../../constants/common.constant";
import { getItemLocalStorage } from "../helper";

const timeOut = 30000;

export const restTransport = () => {
  const client = axios.create({
    baseURL: import.meta.env.VITE_ENV_API_BACKEND_DOMAIN,
    timeout: timeOut,
  });

  const get = async (url: string, params = {}, config = {}) => {
    return await client.get(url, { headers: { ...config }, params });
  };

  const post = async (url: string, data?: any, config = {}) => {
    // Auto-attach sessionToken to therapy API requests
    const userInfo = getItemLocalStorage(USER);
    if (userInfo?.sessionToken && data && typeof data === "object") {
      data = { ...data, sessionToken: userInfo.sessionToken };
    }
    return await client.post(url, data, config);
  };

  return { get, post };
};
