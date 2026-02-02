import { LlmCompletion, getReport } from "../apis/chatbot";
import { usePostAPI } from "./hookApi";

const useLlmCompletion = () => {
  const {
    loading,
    post: fetchCompletion,
    error,
    setError,
  } = usePostAPI(LlmCompletion);
  return {
    loading,
    fetchCompletion,
    error,
    setError,
  };
};

const useGetReport = () => {
  const { loading, post: fetchReport, error, setError } = usePostAPI(getReport);
  return {
    loading,
    fetchReport,
    error,
    setError,
  };
};

export { useLlmCompletion, useGetReport };
