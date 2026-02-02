from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def create_pdf():
    pdf_file = "execution_guide.pdf"
    doc = SimpleDocTemplate(pdf_file, pagesize=A4)
    
    # Register Korean Font
    try:
        pdfmetrics.registerFont(TTFont('NanumGothic', '/usr/share/fonts/truetype/nanum/NanumGothic.ttf'))
        font_name = 'NanumGothic'
    except:
        # Fallback if font not found (though we checked it)
        font_name = 'Helvetica'

    styles = getSampleStyleSheet()
    
    # Create custom styles
    korean_style = ParagraphStyle(
        name='Korean',
        parent=styles['Normal'],
        fontName=font_name,
        fontSize=10,
        leading=16
    )
    title_style = ParagraphStyle(
        name='KoreanTitle',
        parent=styles['Title'],
        fontName=font_name,
        fontSize=18,
        leading=24,
        spaceAfter=20,
        alignment=1 # Center
    )
    header_style = ParagraphStyle(
        name='KoreanHeader',
        parent=styles['Heading2'],
        fontName=font_name,
        fontSize=13,
        leading=18,
        spaceBefore=15,
        spaceAfter=10,
        textColor='#2c3e50'
    )
    code_style = ParagraphStyle(
        name='Code',
        parent=styles['Code'],
        fontName='Courier',
        fontSize=9,
        leading=12,
        backColor='#f4f4f4',
        borderPadding=10,
        spaceBefore=5,
        spaceAfter=5,
        allowWidows=0,
        allowOrphans=0
    )

    story = []

    # Title
    story.append(Paragraph("인형치료 Webapp 실행 및 백그라운드 관리 가이드", title_style))
    story.append(Spacer(1, 10))

    # 1. Normal Execution
    story.append(Paragraph("1. 일반 실행 (터미널 유지 필요)", header_style))
    story.append(Paragraph("개발 중이거나 로그를 바로 확인해야 할 때 사용합니다. 각각 다른 터미널 창에서 실행하세요.", korean_style))
    
    story.append(Paragraph("Backend 실행:", korean_style))
    code_backend = """cd /home/sypark/1.Developement/abuse/backend<br/>
python main.py"""
    story.append(Paragraph(code_backend, code_style))
    
    story.append(Paragraph("Frontend 실행:", korean_style))
    code_frontend = """cd /home/sypark/1.Developement/abuse/frontend<br/>
npm run dev"""
    story.append(Paragraph(code_frontend, code_style))

    # 2. Background Execution
    story.append(Paragraph("2. 백그라운드 실행 (터미널 종료 가능)", header_style))
    story.append(Paragraph("서버를 계속 켜두어야 할 때 nohup 명령어를 사용하여 백그라운드에서 실행합니다.", korean_style))

    story.append(Paragraph("Backend 실행:", korean_style))
    code_backend_bg = """cd /home/sypark/1.Developement/abuse/backend<br/>
# 로그 디렉토리가 없다면 생성<br/>
mkdir -p logs<br/>
# 백그라운드 실행 (로그는 logs/nohup_backend.out 저장)<br/>
nohup python main.py > logs/nohup_backend.out 2>&1 &"""
    story.append(Paragraph(code_backend_bg, code_style))

    story.append(Paragraph("Frontend 실행:", korean_style))
    code_frontend_bg = """cd /home/sypark/1.Developement/abuse/frontend<br/>
# 백그라운드 실행 (로그는 nohup_frontend.out 저장)<br/>
nohup npm run dev > nohup_frontend.out 2>&1 &"""
    story.append(Paragraph(code_frontend_bg, code_style))

    # 3. Log Checking
    story.append(Paragraph("3. 로그 확인 (실시간)", header_style))
    story.append(Paragraph("백그라운드에서 실행 중인 서버의 로그를 실시간으로 확인합니다.", korean_style))
    code_logs = """# Backend 로그 보기<br/>
tail -f /home/sypark/1.Developement/abuse/backend/logs/nohup_backend.out<br/>
<br/>
# Frontend 로그 보기<br/>
tail -f /home/sypark/1.Developement/abuse/frontend/nohup_frontend.out"""
    story.append(Paragraph(code_logs, code_style))

    # 4. Stopping
    story.append(Paragraph("4. 프로세스 종료 방법", header_style))
    story.append(Paragraph("실행 중인 프로세스를 찾아 강제 종료합니다.", korean_style))
    code_stop = """# 1. 프로세스 ID(PID) 찾기<br/>
ps -ef | grep python<br/>
ps -ef | grep npm<br/>
# 또는 포트 번호로 찾기 (예: 3301, 5173)<br/>
netstat -nlp | grep :3301<br/>
netstat -nlp | grep :5173<br/>
<br/>
# 2. 프로세스 종료 (PID 입력)<br/>
kill -9 [PID]<br/>
# 예시: kill -9 12345"""
    story.append(Paragraph(code_stop, code_style))

    doc.build(story)
    print(f"PDF created successfully at {pdf_file}")

if __name__ == "__main__":
    create_pdf()
