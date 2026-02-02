def read_in_chunks(file_object, chunk_size=1024):
    """Lazy function (generator) to read a file piece by piece.
    Default chunk size: 1k."""
    while True:
        data = file_object.read(chunk_size)
        if not data:
            break
        yield data


# 파일크기가 너무 커서 메모리 증가량이 커서 스트림으로 수정
def file_reader_stream(file_path, chunk_size=1024):
    with open(file_path, "r", encoding="utf-8", newline="") as output_file:
        for piece in read_in_chunks(output_file, chunk_size):
            yield piece
