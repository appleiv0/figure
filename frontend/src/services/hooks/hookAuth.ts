import { CreateReceipt } from "../apis/auth";
import { usePostAPI } from "./hookApi";

const useCreatReceipt = () => {
  const {
    loading,
    post: fetchReceipt,
    error,
    setError,
  } = usePostAPI(CreateReceipt);
  return {
    loading,
    fetchReceipt,
    error,
    setError,
  };
};

export { useCreatReceipt };
