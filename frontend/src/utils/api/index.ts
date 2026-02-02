import axios from "axios";

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
    return await client.post(url, data, config);
  };

  return { get, post };
};
