import { restTransport } from "../../utils/api";

const { post } = restTransport();

export const SetFigure = async (body: any) => {
  return await post("/setFigure", body);
};

export const SetPosition = async (body: any) => {
  return await post("/setPosition", body);
};

export const LlmCompletion = async (body: any) => {
  return await post("/llmCompletion", body);
};
