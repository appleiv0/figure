import { useCallback, useState } from "react";

type ActionPostType = (options?: any) => Promise<any>;

const usePostAPI = (action: ActionPostType) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const post = useCallback(
    async (body: any) => {
      try {
        setLoading(true);
        setError(null);

        const data = await action({ ...body });

        if (data) {
          return data.data;
        }

        return undefined;
      } catch (errorAPI: any) {
        setError(errorAPI);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [action]
  );
  return {
    loading,
    post,
    error,
    setError,
  };
};

const useGetList = (action: any) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const get = useCallback(
    async ({ searchOption, pagination }: any) => {
      const startTime = new Date().getTime();
      try {
        setLoading(true);
        setError(null);
        let res = null;
        res = await action({ ...searchOption, ...pagination });
        if (res) {
          return res;
        }
        handleError(res?.data?.errors, setError);
        return undefined;
      } catch (errorAPI: any) {
        setError(errorAPI);
        return undefined;
      } finally {
        _addLoadingTime(startTime, setLoading);
      }
    },
    [action]
  );
  return { loading, get, error, setError };
};

const handleError = (errors: any, setError: any) => {
  if (Array.isArray(errors) && errors.length > 0) {
    setError(errors[0]);
  } else {
    setError(new Error("Something went wrong"));
  }
};

const _addLoadingTime = (startTime: any, setLoading: any) => {
  const loadingTime = new Date().getTime() - startTime;
  const countDownTime = loadingTime > 200 ? loadingTime : 200;
  const timing = setTimeout(() => {
    setLoading(false);
    clearTimeout(timing);
  }, countDownTime);
};

export { useGetList, usePostAPI };
