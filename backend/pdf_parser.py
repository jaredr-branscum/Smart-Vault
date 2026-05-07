import fitz  # PyMuPDF
import re
from datetime import datetime

def parse_pdf_receipt(file_bytes: bytes):
    """
    Dummy parser for PoC. In reality, you'd use LLM or complex regex.
    We look for basic keywords.
    """
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
            
        # Basic regex fallbacks
        total_match = re.search(r'(?i)total[\s:]*\$?([\d,]+\.\d{2})', text)
        date_match = re.search(r'(?i)(date|time)[\s:]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', text)
        
        total_amount = float(total_match.group(1).replace(',', '')) if total_match else None
        
        date_obj = None
        if date_match:
            try:
                # Try a few common formats
                date_str = date_match.group(2)
                for fmt in ("%m/%d/%Y", "%m-%d-%Y", "%d/%m/%Y", "%Y-%m-%d"):
                    try:
                        date_obj = datetime.strptime(date_str, fmt).date()
                        break
                    except ValueError:
                        continue
            except Exception:
                pass
                
        # Super simple merchant logic: just take the first line as merchant for PoC
        merchant = None
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        if lines:
            merchant = lines[0]
            
        return {
            "merchant": merchant,
            "total_amount": total_amount,
            "date": date_obj
        }
    except Exception as e:
        return {"error": str(e)}
