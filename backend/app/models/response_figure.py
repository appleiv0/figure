from pydantic import BaseModel

# response validation check에 유용


class ExamRes(BaseModel):
    id: int
    name: str
    age: int
    email: str


class ReceiptNoRes(BaseModel):
    receiptNo: int
    endWord: dict


class SetFigureRes(BaseModel):
    score: int


class SetPostionRes(BaseModel):
    score: int
    message: str


class LLMCompletionRes(BaseModel):
    message: str


class GetReportRes(BaseModel):
    score: int
    message: str
    result: dict

class SaveChatRes(BaseModel):
    success: bool
