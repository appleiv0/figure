import { restTransport } from "../../utils/api";

const { post } = restTransport();

export const LlmCompletion = async (body: any) => {
  return await post("/llmCompletion", body);
};

export const getReport = async (body: any) => {
  return await post("/getReport", body);
};
