from typing import Optional, Union
from pydantic import BaseModel, Field
from typing import Optional

# fast api 요청


class ExamReq(BaseModel):
    id: int = None
    name: str = None
    names: Optional[list] = []


class ReceiptNoReq(BaseModel):
    counselor: dict = Field(default=None, examples=[{"organization": "matrix", "name": "bart"}])
    kid: dict = Field(
        default=None, examples=[{"name": "victor", "sex": "male", "birth": "20101212"}]
    )
    agree: bool = Field(default=True, examples=[True])


class SetFigureReq(BaseModel):
    kidName: str = Field(default=None, examples=["victor"])
    receiptNo: int = Field(default=None, examples=[1])
    stage: str = Field(default=None, examples=["1"])
    figures: list = Field(
        default=None,
        examples=[
            [
                {"relation": "나", "figure": "병아리", "message": "멋있어요."},
                {"relation": "아빠", "figure": "돼지", "message": "무서워요."},
                {"relation": "엄마", "figure": "상어", "message": "뾰족해요"},
            ],
        ],
    )


class SetPostionReq(BaseModel):
    kidName: str = Field(default=None, examples=["victor"])
    receiptNo: int = Field(default=None, examples=[1])
    centerH: int = Field(default=None, examples=[600])
    centerV: int = Field(default=None, examples=[400])
    figures: list = Field(
        default=None,
        examples=[
            [
                {
                    "relation": "나",
                    "figure": "병아리",
                    "position": {"p1": [120, 23], "p2": [130, 43]},
                    "direction": "right",
                },
                {
                    "relation": "아빠",
                    "figure": "돼지",
                    "position": {"p1": [120, 23], "p2": [130, 43]},
                    "direction": "left",
                },
                {
                    "relation": "엄마",
                    "figure": "상어",
                    "position": {"p1": [120, 23], "p2": [130, 43]},
                    "direction": "left",
                },
            ]
        ],
    )
    canvasImage: Optional[str] = Field(default=None, description="Base64 encoded canvas image")


class LLMCompletionReq(BaseModel):
    kidName: str = Field(default=None, examples=["victor"])
    receiptNo: int = Field(default=None, examples=[1])
    count: int = Field(default=0, examples=[0])
    relation: str = Field(default="", examples=["아빠"])
    message: str = Field(default="", examples=["아빠는 나랑 잘 놀아줘요."])


class GetReportReq(BaseModel):
    kidName: str = Field(default=None, examples=["victor"])
    receiptNo: int = Field(default=None, examples=[1])
