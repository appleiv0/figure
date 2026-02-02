import { LlmCompletion, SetFigure, SetPosition } from "../apis/figures";
import { usePostAPI } from "./hookApi";

const useSetFigure = () => {
  const { loading, post: fetchFigure, error, setError } = usePostAPI(SetFigure);
  return {
    loading,
    fetchFigure,
    error,
    setError,
  };
};

const useSetPosition = () => {
  const {
    loading,
    post: fetchPosition,
    error,
    setError,
  } = usePostAPI(SetPosition);
  return {
    loading,
    fetchPosition,
    error,
    setError,
  };
};

const useLlmCompletion = () => {
  const {
    loading,
    post: fetchLlmCompletion,
    error,
    setError,
  } = usePostAPI(LlmCompletion);
  return {
    loading,
    fetchLlmCompletion,
    error,
    setError,
  };
};

export { useSetFigure, useSetPosition, useLlmCompletion };
