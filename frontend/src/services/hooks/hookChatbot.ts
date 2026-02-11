import { LlmCompletion, getReport, saveChat } from "../apis/chatbot";
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

const useSaveChat = () => {
  const { loading, post: fetchSaveChat, error, setError } = usePostAPI(saveChat);
  return {
    loading,
    fetchSaveChat,
    error,
    setError,
  };
};

export { useLlmCompletion, useGetReport, useSaveChat };
