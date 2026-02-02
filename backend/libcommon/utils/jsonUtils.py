import os
import json
import pathlib
from datetime import datetime
from bson import ObjectId

# from utils import chatUtils
from libcommon.utils import chatUtils

cur_dir = str(pathlib.Path(__file__).parent.resolve())


def create_receipt_num_copy_template(req):
    json_list = os.listdir(f"{cur_dir}/../result")
    if len(json_list) == 0:
        receipt_no = 1
    else:
        json_list.sort()
        receipt_no = int(json_list[-1].split("_")[0]) + 1

    josa = chatUtils.get_josa(req["kid"]["name"])

    new_json = read_json(f"{cur_dir}/../config/0_template.json")

    new_json["date"] = datetime.strftime(datetime.now(), format="%Y%m%d%H%M%S")
    new_json["receiptNo"] = receipt_no
    new_json["counselor"] = req["counselor"]
    new_json["kid"] = req["kid"]
    new_json["kid"].update(josa)
    new_json["agree"] = req["agree"]

    make_json(f"{cur_dir}/../result/{receipt_no}_{req['kid']['name']}.json", new_json)

    josa["receipt_no"] = receipt_no
    return josa


class MongoJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder for MongoDB objects (datetime, ObjectId)"""
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, ObjectId):
            return str(obj)
        return super().default(obj)


def make_json(json_path, data):
    with open(json_path, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=4, ensure_ascii=False, cls=MongoJSONEncoder)


def read_json(json_path):
    try:
        with open(json_path, "r", encoding="utf-8") as file:
            data = json.load(file)
        return data
    except Exception as e:
        print(e)
        # raise e


# if __name__ == "__main__":
#     # make_json()
#     cur_dir = str(pathlib.Path(__file__).parent.resolve())
#     ret = read_json(f"{cur_dir}/../data-test.json")
#     print(ret)
