import sys
try:
    import pypdf
    print("pypdf installed")
except ImportError:
    print("pypdf not installed")

try:
    import pdfplumber
    print("pdfplumber installed")
except ImportError:
    print("pdfplumber not installed")

try:
    import PyPDF2
    print("PyPDF2 installed")
except ImportError:
    print("PyPDF2 not installed")
