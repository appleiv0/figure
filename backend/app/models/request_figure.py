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
    counselorEmail: Optional[str] = Field(default=None, examples=["user@gmail.com"])


class SetFigureReq(BaseModel):
    kidName: str = Field(default=None, examples=["victor"])
    receiptNo: int = Field(default=None, examples=[1])
    sessionToken: str = Field(default="", examples=["abc123"])
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
    family_members: Optional[list] = Field(default=None, examples=[["엄마", "아빠", "형", "여동생", "나"]])


class SetPostionReq(BaseModel):
    kidName: str = Field(default=None, examples=["victor"])
    receiptNo: int = Field(default=None, examples=[1])
    sessionToken: str = Field(default="", examples=["abc123"])
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
    dollInstances: Optional[list] = Field(
        default=None,
        description="3D doll instance data for reconstruction",
        examples=[
            [
                {
                    "dollModel": "adult_male",
                    "label": "아빠",
                    "pose": "stand",
                    "rotation": 0.5,
                    "position": {"x": 0.2, "y": 0.01, "z": -0.3},
                    "size": 1.0,
                }
            ]
        ],
    )


class LLMCompletionReq(BaseModel):
    kidName: str = Field(default=None, examples=["victor"])
    receiptNo: int = Field(default=None, examples=[1])
    sessionToken: str = Field(default="", examples=["abc123"])
    count: int = Field(default=0, examples=[0])
    relation: str = Field(default="", examples=["아빠"])
    message: str = Field(default="", examples=["아빠는 나랑 잘 놀아줘요."])


class GetReportReq(BaseModel):
    kidName: str = Field(default=None, examples=["victor"])
    receiptNo: int = Field(default=None, examples=[1])
    sessionToken: str = Field(default="", examples=["abc123"])

class SaveChatReq(BaseModel):
    kidName: str = Field(default=None, examples=["victor"])
    receiptNo: int = Field(default=None, examples=[1])
    sessionToken: str = Field(default="", examples=["abc123"])
    role: str = Field(default="user", examples=["user", "bot"])
    content: str = Field(default="", examples=["안녕하세요"])
    relation: Optional[str] = Field(default=None, examples=["아빠"])
