from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2
import psycopg2.extras
import json
import os

app = Flask(__name__)
# Mengizinkan semua origin (termasuk port 5173 milik React) untuk mengakses API
CORS(app, resources={r"/api/*": {"origins": "*"}})

# =========================================================================
# KONEKSI DATABASE NEON (SERVERLESS POSTGRESQL)
# =========================================================================
# Membaca dari environment variable Vercel, jika di lokal baru pakai string hardcode
NEON_DB_URI = os.getenv(
    "DATABASE_URL", 
    "postgresql://neondb_owner:npg_l27gXGaeChPq@ep-quiet-morning-aobokj6d.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
)

def get_db_connection():
    return psycopg2.connect(NEON_DB_URI)

def generate_next_id(prefix, table_name):
    """Mencari akhiran ID numerik tertinggi secara aman menggunakan Tuple index"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor() # Menggunakan cursor biasa (tuple) agar lebih aman & cepat
        cursor.execute(f"SELECT id FROM {table_name} ORDER BY id DESC LIMIT 1")
        row = cursor.fetchone()
        
        if not row or row[0] is None:
            return f"{prefix}001"
        
        # Ambil string ID (misal 'RI001' atau 'P003') dari index ke-0 tuple
        last_id = str(row[0])
        current_num = int(''.join(filter(str.isdigit, last_id)))
        next_num = current_num + 1
        return f"{prefix}{next_num:03d}"
    except Exception as e:
        print(f"Error generating ID untuk {table_name}: {e}")
        import random
        return f"{prefix}{random.randint(100, 999)}"
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# =========================================================================
# API ENDPOINTS (GET METHOD)
# =========================================================================

@app.route('/api/jalan', methods=['GET'])
def get_jalan():
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("SELECT id, nama, status, panjang, ST_AsGeoJSON(geom) as geom_json FROM jalan")
        rows = cursor.fetchall()
        
        for row in rows:
            if row['geom_json']:
                row['geom'] = json.loads(row['geom_json'])
            del row['geom_json']
            
            if row['panjang'] is not None:
                row['panjang'] = round(row['panjang'], 2)
        response = rows
    except Exception as e:
        response = [] # Mengamankan peta React jika tabel jalan bermasalah
        print(f"ERROR: {e}")
    finally:
        cursor.close()
        conn.close()
        
    return jsonify(response)

@app.route('/api/area', methods=['GET'])
def get_area():
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        # Mengambil semua field data area dari database
        cursor.execute("SELECT id, nama, luas, ST_AsGeoJSON(geom) as geom_json FROM area")
        rows = cursor.fetchall()
        
        for row in rows:
            if row['geom_json']:
                row['geom'] = json.loads(row['geom_json'])
            del row['geom_json']
            
            # Opsional: Membulatkan nilai luas wilayah menjadi 2 angka di belakang koma untuk merapikan UI
            if row['luas'] is not None:
                row['luas'] = round(row['luas'], 2)
                
        response = rows
    except Exception as e:
        response = []  # Jaring penyelamat: jika database bermasalah, kirim array kosong agar React tidak crash
        print(f"ERROR: Failed to fetch area data: {e}")
    finally:
        cursor.close()
        conn.close()
        
    return jsonify(response)

@app.route('/api/ibadah', methods=['GET'])
def get_ibadah():
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("SELECT id, nama, jenis, kontak, radius, ST_AsGeoJSON(geom) as geom_json FROM rumah_ibadah")
        rows = cursor.fetchall()
        
        for row in rows:
            if row['geom_json']:
                row['geom'] = json.loads(row['geom_json'])
            del row['geom_json']
            
        response = rows
    except Exception as e:
        response = []  # Jaring penyelamat: mengembalikan array kosong agar frontend tetap aman
        print(f"ERROR: Failed to fetch rumah ibadah data: {e}")
    finally:
        cursor.close()
        conn.close()
        
    return jsonify(response)

@app.route('/api/miskin', methods=['GET'])
def get_miskin():
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("""
            SELECT id, kepala_keluarga, jumlah_anggota, status_bantuan, jenis_bantuan, id_ibadah_terdekat, 
                   ST_AsGeoJSON(geom) as geom_json 
            FROM penduduk_miskin
        """)
        rows = cursor.fetchall()
        
        for row in rows:
            if row['geom_json']:
                row['geom'] = json.loads(row['geom_json'])
            del row['geom_json']
            
            # Memisahkan kembali string koma menjadi Array murni untuk kebutuhan state di React
            if row['jenis_bantuan']:
                row['jenis_bantuan'] = [b.strip() for b in row['jenis_bantuan'].split(',')]
            else:
                row['jenis_bantuan'] = []
                
        response = rows
    except Exception as e:
        # PENTING: Mengembalikan array kosong [] sebagai jaring penyelamat (fallback)
        # agar React Frontend Anda tidak crash menjadi layar hitam jika database Neon/Supabase overload.
        response = [] 
        print(f"ERROR: Failed to fetch penduduk miskin: {e}")
    finally:
        cursor.close()
        conn.close()
        
    return jsonify(response)

# =========================================================================
# API ENDPOINTS (POST METHOD)
# =========================================================================

@app.route('/api/ibadah/create', methods=['POST'])
def create_ibadah():
    data = request.json
    next_id = generate_next_id('RI', 'rumah_ibadah')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = """
        INSERT INTO rumah_ibadah (id, nama, jenis, kontak, radius, geom)
        VALUES (%s, %s, %s, %s, %s, ST_GeomFromText(%s, 4326))
    """
    wkt_point = f"POINT({data['lng']} {data['lat']})"
    
    try:
        cursor.execute(query, (
            next_id, 
            data['nama'], 
            data['jenis'], 
            data.get('kontak', ''),  # Menangani jika kontak kosong
            int(data['radius']), 
            wkt_point
        ))
        conn.commit()
        response = {"status": "success", "generated_id": next_id}
        print("SUCCESS: Rumah ibadah successfully saved to database!")
    except Exception as e:
        conn.rollback()
        response = {"status": "error", "message": str(e)}
        print(f"ERROR: Rumah ibadah insertion failed: {e}")
    finally:
        cursor.close()
        conn.close()
        
    return jsonify(response)

@app.route('/api/miskin/create', methods=['POST'])
def create_miskin():
    data = request.json
    next_id = generate_next_id('P', 'penduduk_miskin')
    wkt_point = f"POINT({data['lng']} {data['lat']})"
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = """
        INSERT INTO penduduk_miskin (id, kepala_keluarga, jumlah_anggota, status_bantuan, jenis_bantuan, id_ibadah_terdekat, geom)
        VALUES (
            %s, %s, %s, %s, %s, 
            (SELECT id FROM rumah_ibadah ORDER BY geom::geography <-> ST_GeomFromText(%s, 4326)::geography LIMIT 1), 
            ST_GeomFromText(%s, 4326)
        )
        RETURNING id_ibadah_terdekat;
    """
    
    # Mengubah array Python ['PKH', 'BPJS_Kesehatan'] menjadi gabungan string 'PKH,BPJS_Kesehatan'
    if isinstance(data.get('jenis_bantuan'), list):
        jenis_bantuan_str = ",".join(data['jenis_bantuan'])
    else:
        jenis_bantuan_str = data.get('jenis_bantuan', '')
    
    try:
        cursor.execute(query, (
            next_id, 
            data['kepala_keluarga'], 
            data['jumlah_anggota'], 
            data['status_bantuan'], 
            jenis_bantuan_str, 
            wkt_point, 
            wkt_point
        ))
        
        # Mengambil ID rumah ibadah terdekat yang berhasil dihitung otomatis oleh PostGIS
        closest_ibadah_id = cursor.fetchone()[0]
        conn.commit()
        
        response = {
            "status": "success", 
            "generated_id": next_id, 
            "closest_hub": closest_ibadah_id,
            "message": "Data penduduk miskin berhasil disimpan"
        }
        print("SUCCESS: Penduduk miskin successfully saved to database!")
        
    except Exception as e:
        conn.rollback()
        response = {"status": "error", "message": str(e)}
        print(f"ERROR: Penduduk miskin insertion failed: {e}")
        
    finally:
        cursor.close()
        conn.close()
        
    return jsonify(response)

@app.route('/api/jalan/create', methods=['POST'])
def create_jalan():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()

    coords_str = ", ".join([f"{pt[1]} {pt[0]}" for pt in data['coords']])
    wkt_line = f"LINESTRING({coords_str})"

    # MENGGUNAKAN ST_Length agar kolom panjang (double precision) terisi otomatis dengan angka murni meter
    query = """
        INSERT INTO jalan (nama, status, panjang, geom)
        VALUES (
            %s, 
            %s, 
            ST_Length(ST_GeomFromText(%s, 4326)::geography), 
            ST_GeomFromText(%s, 4326)
        )
    """
    
    try:
        # Kita passing wkt_line dua kali (untuk hitung panjang dan untuk geometri)
        cursor.execute(query, (data['nama'], data['status'], wkt_line, wkt_line))
        conn.commit()
        response = {"status": "success", "message": "Jalan successfully created"}
        print("SUCCESS: Jalan successfully saved to database!")
    except Exception as e:
        conn.rollback()
        response = {"status": "error", "message": str(e)}
        print(f"ERROR: Jalan insertion failed: {e}")
    finally:
        cursor.close()
        conn.close()
        
    return jsonify(response)

@app.route('/api/area/create', methods=['POST'])
def create_area():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()

    coords = list(data['coords'])
    if coords[0] != coords[-1]:
        coords.append(coords[0])

    coords_str = ", ".join([f"{pt[1]} {pt[0]}" for pt in coords])
    wkt_poly = f"POLYGON(({coords_str}))"

    # We use exactly two %s because both ST_Area and ST_GeomFromText 
    # will read from the same exact wkt_poly variable we pass in.
    query = """
        INSERT INTO area (nama, luas, geom)
        VALUES (
            %s, 
            ST_Area(ST_GeomFromText(%s, 4326)::geography), 
            ST_GeomFromText(%s, 4326)
        )
    """
    
    try:
        cursor.execute(query, (data['nama'], wkt_poly, wkt_poly))
        conn.commit()
        response = {"status": "success", "message": "Area successfully created"}
        # GANTI DARI EMOJI JADI TEKS BIASA BIAR TERMINAL WINDOWS TIDAK CRASH:
        print("SUCCESS: Area successfully saved to database!")
    except Exception as e:
        conn.rollback()
        response = {"status": "error", "message": str(e)}
        # GANTI JUGA YANG INI:
        print(f"ERROR: Database insertion failed: {e}")
    finally:
        cursor.close()
        conn.close()
        
    return jsonify(response)

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=False
    )