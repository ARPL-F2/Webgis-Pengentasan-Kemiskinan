import sys
import os

# Memastikan Vercel memasukkan folder utama ke dalam path pencarian Python
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mengimpor objek 'app' Flask langsung dari backend/app.py yang kodenya sudah matang
from backend.app import app

# Menyerahkan kendali routing sepenuhnya ke backend/app.py
app = app