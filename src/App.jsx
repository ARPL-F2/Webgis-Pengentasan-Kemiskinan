import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, Polygon, useMapEvents, LayersControl, LayerGroup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import markerShadowPng from "leaflet/dist/images/marker-shadow.png";
//import App from './App.jsx'; // Dashboard utama
import Landing from './Landing.jsx'; // Halaman landing
import User from './user.jsx'; // Halaman manajemen user / profil
import 'leaflet/dist/leaflet.css'; // Dependensi peta WebGIS

//const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = ' ';

// Pengaturan Default Marker Objek
const DefaultIcon = L.icon({
  iconUrl: markerIconPng,
  shadowUrl: markerShadowPng,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Pengaturan Marker Kustom Penduduk Miskin
const MiskinIcon = L.divIcon({
  className: 'custom-miskin-marker',
  html: `<div style="background-color: #ff4d4d; width: 12px; height: 12px; border-radius: 50%; border: 2px white solid; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

// Pengaturan Marker Kustom Rumah Ibadah
const IbadahIcon = L.icon({
  iconUrl: markerIconPng,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Fungsi Parser Geometri GeoJSON dari PostGIS
const parsePoint = (geom) => [geom.coordinates[1], geom.coordinates[0]];
const parseLineString = (geom) => geom.coordinates.map(coord => [coord[1], coord[0]]);
const parsePolygon = (geom) => geom.coordinates.map(ring => ring.map(coord => [coord[1], coord[0]]));

// Fungsi Decoder Polyline OSRM Manual (Pastikan ini ada agar tidak undefined)
const decodeOSRMPoints = (str, precision) => {
  var index = 0, lat = 0, lng = 0, coordinates = [], shift = 0, result = 0, byte = null, lat_change, lng_change, factor = Math.pow(10, precision || 5);
  while (index < str.length) {
    byte = null; shift = 0; result = 0;
    do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lat_change = ((result & 1) ? ~(result >> 1) : (result >> 1)); lat += lat_change;
    byte = null; shift = 0; result = 0;
    do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lng_change = ((result & 1) ? ~(result >> 1) : (result >> 1)); lng += lng_change;
    coordinates.push([lat / factor, lng / factor]);
  }
  return coordinates;
};

// Listener Klik Peta Universal
function MapClickHandler({ activeMode, onMapClick }) {
  useMapEvents({
    click(e) {
      if (activeMode) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// ❇️ MENAMBAHKAN DEKLARASI MAP VIEW UPDATER AGAR TIDAK ERROR REFERENCE
function MapViewUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

// Sub-Komponen Form Penduduk Miskin (Fokus hanya pada Input Formulir)
function PendudukMiskinForm({ selectedLat, selectedLng, onSaveSuccess, onClose }) {
  const [kepalaKeluarga, setKepalaKeluarga] = useState('');
  const [jumlahAnggota, setJumlahAnggota] = useState(1);
  const [statusBantuan, setStatusBantuan] = useState(0); 
  const [jenisBantuan, setJenisBantuan] = useState([]);  

  const opsiBantuan = [
    'BPJS_Kesehatan', 'PKH', 'PIP/KIP', 'Bansos_Tunai', 'BPNT/Sembako', 'Santunan Anak Yatim-Piatu'
  ];

  const handleCheckboxChange = (bantuan) => {
    if (jenisBantuan.includes(bantuan)) {
      setJenisBantuan(jenisBantuan.filter((item) => item !== bantuan));
    } else {
      setJenisBantuan([...jenisBantuan, bantuan]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      kepala_keluarga: kepalaKeluarga,
      jumlah_anggota: parseInt(jumlahAnggota),
      status_bantuan: parseInt(statusBantuan),
      jenis_bantuan: jenisBantuan, 
      lat: selectedLat,
      lng: selectedLng
    };

    try {
      const response = await fetch(`${API_URL}/api/miskin/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.status === 'success') {
        alert(`Data Berhasil Disimpan!\nID Ibadah Terdekat: ${result.closest_hub}`);
        onSaveSuccess(); 
        onClose();       
      } else {
        alert(`Gagal menyimpan data: ${result.message}`);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Terjadi kesalahan jaringan saat menyimpan data.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Nama Kepala Keluarga</label>
        <input type="text" required value={kepalaKeluarga} onChange={(e) => setKepalaKeluarga(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Jumlah Anggota Keluarga</label>
        <input type="number" min="1" required value={jumlahAnggota} onChange={(e) => setJumlahAnggota(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Status Penerimaan Bantuan</label>
        <select value={statusBantuan} onChange={(e) => setStatusBantuan(e.target.value)}>
          <option value={0}>Belum Menerima Bantuan</option>
          <option value={1}>Sudah Menerima Bantuan</option>
        </select>
      </div>

      {parseInt(statusBantuan) === 1 && (
        <div className="form-group">
          <label style={{ fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>Jenis Bantuan:</label>
          <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid #ccc', padding: '8px', borderRadius: '4px', background: '#f9f9f9' }}>
            {opsiBantuan.map((bantuan) => (
              <div key={bantuan} style={{ marginBottom: '6px', display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  id={bantuan}
                  checked={jenisBantuan.includes(bantuan)}
                  onChange={() => handleCheckboxChange(bantuan)}
                  style={{ marginRight: '8px' }}
                />
                <label htmlFor={bantuan} style={{ fontSize: '13px', cursor: 'pointer' }}>{bantuan.replace('_', ' ')}</label>
              </div>
            ))}
          </div>
        </div>
      )}

      <p style={{ fontSize: '11px', color: '#666', marginTop: '10px' }}>
        Koordinat Terpilih: {selectedLat?.toFixed(5)}, {selectedLng?.toFixed(5)}
      </p>
      <button type="submit" className="submit-btn save-miskin" style={{ marginTop: '10px' }}>
        Simpan & Cari Rumah Ibadah
      </button>
    </form>
  );
}

// Komponen Legenda Spasial
function MapLegend() {
  const map = useMap();
  useEffect(() => {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'info legend');
      div.style.background = 'white'; div.style.padding = '12px'; div.style.borderRadius = '8px';
      div.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)'; div.style.fontSize = '13px'; div.style.lineHeight = '20px'; div.style.color = '#333';
      div.innerHTML = `
        <h4 style="margin: 0 0 8px 0; border-bottom: 1px solid #ccc; padding-bottom: 4px;">Legenda Peta</h4>
        <div style="margin-bottom: 8px;"><strong>Tempat Ibadah:</strong><br/><span style="display:inline-block; width:12px; height:12px; background:#2563eb; border-radius:50%; margin-right:6px; border:1px solid #fff;"></span> Radius Pelayanan (300m+)</div>
        <div style="margin-bottom: 8px;"><strong>Kesejahteraan:</strong><br/><span style="display:inline-block; width:12px; height:12px; background:#ff4d4d; border-radius:50%; margin-right:6px; border:2px solid #fff; box-shadow:0 0 2px rgba(0,0,0,0.5);"></span> Penduduk Miskin</div>
        <div style="margin-bottom: 8px;"><strong>Jaringan Jalan:</strong><br/><span style="display:inline-block; width:24px; height:4px; background:#0000ff; margin-right:6px; vertical-align:middle;"></span> Jln Nasional<br/><span style="display:inline-block; width:24px; height:4px; background:#008000; margin-right:6px; vertical-align:middle;"></span> Jln Provinsi<br/><span style="display:inline-block; width:24px; height:4px; background:#ffff00; border:1px solid #ccc; margin-right:6px; vertical-align:middle;"></span> Jln Kabupaten</div>
        <div><strong>Batas Sektoral:</strong><br/><span style="display:inline-block; width:20px; height:12px; background:rgba(128, 0, 128, 0.15); border:2px solid purple; margin-right:6px; vertical-align:middle;"></span> Wilayah / Area Sektor</div>`;
      return div;
    };
    legend.addTo(map);
    return () => { legend.remove(); };
  }, [map]);
  return null;
}

const getIbadahEmoji = (jenis) => {
  if (!jenis) return '📍'; // Jaga-jaga jika nilainya null/undefined
  switch(jenis.toLowerCase()) {
    case 'masjid': return '🕌';
    case 'gereja': return '⛪';
    case 'vihara': return '🛕';
    case 'klenteng': return '⛩️';
    case 'pura': return '🕍';
    default: return '📍';
  }
};

// Pengaturan Style Warna Garis Jalan Berdasarkan Klasifikasi Database
const getJalanStyle = (status) => {
  switch(status) {
    case 'Jln Nasional': return { color: '#0000ff', weight: 5 };
    case 'Jln Provinsi': return { color: '#008000', weight: 4 };
    default: return { color: '#ffff00', weight: 3 };
  }
};

function App() {
  const pontianakCenter = [-0.0263, 109.3425];
  
  const [dataJalan, setDataJalan] = useState([]);
  const [dataArea, setDataArea] = useState([]);
  const [dataIbadah, setDataIbadah] = useState([]);
  const [dataMiskin, setDataMiskin] = useState([]);
  const [isRoutingLoading, setIsRoutingLoading] = useState(false);
  const [routingCoords, setRoutingCoords] = useState([]);

  const [activeInsertionMode, setActiveInsertionMode] = useState(null); 
  const [drawCoords, setDrawCoords] = useState([]); 
  const [showModal, setShowModal] = useState(false);

  const [formJalan, setFormJalan] = useState({ nama: '', status: 'Jln Kabupaten' });
  const [formArea, setFormArea] = useState({ nama: '' });
  const [formIbadah, setFormIbadah] = useState({ nama: '', jenis: 'masjid', kontak: '', radius: 300 });

  const loadAllData = () => {
    // Ganti semua fetch lama Anda agar menggunakan pembatas slash `/` yang benar:
    fetch(`${API_URL}/api/jalan`) // <-- Perhatikan ada slash sebelum api
      .then(res => res.json())
      .then(data => setDataJalan(Array.isArray(data) ? data : []))
      .catch(() => setDataJalan([]));

    fetch(`${API_URL}/api/area`)
      .then(res => res.json())
      .then(data => setDataArea(Array.isArray(data) ? data : []))
      .catch(() => setDataArea([]));

    fetch(`${API_URL}/api/ibadah`)
      .then(res => res.json())
      .then(data => setDataIbadah(Array.isArray(data) ? data : []))
      .catch(() => setDataIbadah([]));

    fetch(`${API_URL}/api/miskin`)
      .then(res => res.json())
      .then(data => setDataMiskin(Array.isArray(data) ? data : []))
      .catch(() => setDataMiskin([]));
  };

  useEffect(() => { loadAllData(); }, []);

  // Fungsi Routing Network Terpusat (Dikendalikan oleh Komponen App Utama)
  const handleFetchRoute = async (miskinLat, miskinLng, idIbadahTerdekat) => {
    setIsRoutingLoading(true);
    const ibadahTerdekat = dataIbadah.find(i => i.id === idIbadahTerdekat);
    
    if (!ibadahTerdekat || !ibadahTerdekat.geom) {
      alert("Maaf, data rincian koordinat Rumah Ibadah terdekat tidak ditemukan.");
      setIsRoutingLoading(false);
      return;
    }

    const [ibadahLng, ibadahLat] = ibadahTerdekat.geom.coordinates;

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${ibadahLng},${ibadahLat};${miskinLng},${miskinLat}?overview=full&geometries=polyline`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes.length > 0) {
        const encodedRoute = data.routes[0].geometry;
        const decodedCoords = decodeOSRMPoints(encodedRoute);
        setRoutingCoords(decodedCoords); 
      } else {
        alert("Gagal memetakan rute jalan resmi.");
      }
    } catch (error) {
      console.error(error);
      alert("Koneksi rute OSRM terputus.");
    } finally {
      setIsRoutingLoading(false);
    }
  };

  const handleToolbarToggle = (mode) => {
    setActiveInsertionMode(activeInsertionMode === mode ? null : mode);
    setDrawCoords([]); 
  };

  const handleMapClick = (lat, lng) => {
    if (activeInsertionMode === 'ibadah' || activeInsertionMode === 'miskin') {
      setDrawCoords([[lat, lng]]);
      setShowModal(true);
    } else if (activeInsertionMode === 'jalan' || activeInsertionMode === 'area') {
      setDrawCoords([...drawCoords, [lat, lng]]);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setDrawCoords([]);
    setActiveInsertionMode(null);
    setFormJalan({ nama: '', status: 'Jln Kabupaten' });
    setFormArea({ nama: '' });
    setFormIbadah({ nama: '', jenis: 'masjid', kontak: '', radius: 300 });
  };

  const submitJalanForm = (e) => {
    e.preventDefault();
    fetch(`${API_URL}/api/jalan/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formJalan, coords: drawCoords })
    })
    .then(res => res.json())
    .then((result) => { 
      if (result.status === 'success') {
        alert("Jalan Berhasil Disimpan!"); loadAllData(); closeModal(); 
      } else { alert("Gagal menyimpan jalan: " + result.message); }
    }).catch(err => alert("Terjadi kesalahan jaringan."));
  };

  const submitAreaForm = (e) => {
    e.preventDefault();
    fetch(`${API_URL}/api/area/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formArea, coords: drawCoords })
    })
    .then(res => res.json())
    .then((result) => {
      if (result.status === 'success') {
        alert("Area Berhasil Disimpan!"); loadAllData(); closeModal();
      } else { alert("Gagal menyimpan area: " + result.message); }
    }).catch(err => alert("Terjadi kesalahan jaringan."));
  };

  const submitIbadahForm = (e) => {
    e.preventDefault();
    fetch(`${API_URL}/api/ibadah/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formIbadah, lat: drawCoords[0][0], lng: drawCoords[0][1] })
    })
    .then(res => res.json())
    .then((result) => {
      if (result.status === 'success') {
        alert("Rumah Ibadah Berhasil Disimpan!"); loadAllData(); closeModal();
      } else { alert("Gagal menyimpan rumah ibadah: " + result.message); }
    }).catch(err => alert("Terjadi kesalahan jaringan."));
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      
      {/* Action Toolbar */}
      <div className="map-action-bar">
        <button className={`action-btn btn-insert ${activeInsertionMode === 'jalan' ? 'inserting' : ''}`} onClick={() => handleToolbarToggle('jalan')}>
          {activeInsertionMode === 'jalan' ? '🗺️ Menggambar Jalan...' : '+ Jalan'}
        </button>
        <button className={`action-btn btn-insert ${activeInsertionMode === 'area' ? 'inserting' : ''}`} onClick={() => handleToolbarToggle('area')}>
          {activeInsertionMode === 'area' ? '🗺️ Menggambar Area...' : '+ Area'}
        </button>
        <button className={`action-btn btn-insert ${activeInsertionMode === 'ibadah' ? 'inserting' : ''}`} onClick={() => handleToolbarToggle('ibadah')}>
          {activeInsertionMode === 'ibadah' ? '📍 Klik Peta...' : '+ Rumah Ibadah'}
        </button>
        <button className={`action-btn btn-insert ${activeInsertionMode === 'miskin' ? 'inserting' : ''}`} onClick={() => handleToolbarToggle('miskin')}>
          {activeInsertionMode === 'miskin' ? '📍 Klik Peta...' : '+ Data Miskin'}
        </button>

        {(activeInsertionMode === 'jalan' || activeInsertionMode === 'area') && drawCoords.length > 1 && (
          <button className="finish-draw-btn" onClick={() => setShowModal(true)}>
            💾 Selesai Menggambar ({drawCoords.length} Titik)
          </button>
        )}
      </div>

      {/* MAP CONTAINER UTAMA */}
      <MapContainer center={pontianakCenter} zoom={14} style={{ width: '100%', height: '100%', cursor: activeInsertionMode ? 'crosshair' : 'grab' }}>
        
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="OpenStreetMap Standard">
            <TileLayer attribution='&copy; OpenStreetMap' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="OpenStreetMap Kemanusiaan (HOT)">
            <TileLayer attribution='&copy; OSM contributors, Tiles by HOT' url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="OpenTopoMap (Topografi)">
            <TileLayer attribution='&copy; OpenTopoMap' url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" maxZoom={17} />
          </LayersControl.BaseLayer>

          {/* 1. LAYER GROUP UNTUK JALAN */}
          <LayersControl.Overlay checked name="Jaringan Jalan">
            <LayerGroup>
              {dataJalan.map(j => {
                if (!j.geom) return null;
                const pathOptions = getJalanStyle(j.status_jalan);
                return (
                  <Polyline key={j.id} positions={parseLineString(j.geom)} pathOptions={pathOptions}>
                    <Popup><b>Nama Jalan:</b> {j.nama_jalan || 'Tanpa Nama'}<br/><b>Status:</b> {j.status_jalan}</Popup>
                  </Polyline>
                );
              })}
            </LayerGroup>
          </LayersControl.Overlay>

          {/* 2. LAYER GROUP UNTUK AREA BANJIR */}
          <LayersControl.Overlay checked name="Area Rawan Banjir">
            <LayerGroup>
              {dataArea.map(a => {
                if (!a.geom) return null;
                return (
                  <Polygon key={a.id} positions={parsePolygon(a.geom)} pathOptions={{ color: 'purple', fillColor: 'purple', fillOpacity: 0.15 }}>
                    <Popup><b>Area Wilayah Sektor:</b> {a.nama_area || 'Sektor'}</Popup>
                  </Polygon>
                );
              })}
            </LayerGroup>
          </LayersControl.Overlay>

          {/* 3. LAYER GROUP UNTUK RUMAH IBADAH (DENGAN RADIUS DINAMIS) */}
          <LayersControl.Overlay checked name="Titik Rumah Ibadah">
            <LayerGroup>
              {dataIbadah.map(i => {
                if (!i.geom) return null;
                const [ibadahLat, ibadahLng] = parsePoint(i.geom);
                return (
                  <LayerGroup key={i.id}>
                    
                    {/* 🔵 PERBAIKAN: Menggunakan i.radius sesuai properti dari database */}
                    <Circle 
                      center={[ibadahLat, ibadahLng]} 
                      radius={Number(i.radius) || 300} // Dipaksa jadi tipe Number agar Leaflet tidak bingung jika datanya string
                      pathOptions={{ 
                        color: '#2563eb',       
                        fillColor: '#3b82f6',   
                        fillOpacity: 0.15,      
                        weight: 2               
                      }} 
                    />

                    {/* Marker Rumah Ibadah */}
                    <Marker position={[ibadahLat, ibadahLng]} icon={IbadahIcon}>
                      <Popup>
                        {/* 1. Perbaiki pemanggilan fungsi agar menggunakan kolom 'jenis' */}
                        <b>{getIbadahEmoji(i.jenis || 'lainnya')} {i.nama}</b><br/>
                        
                        {/* 2. Perbaiki label agar sesuai kolom 'jenis' */}
                        Jenis: {(i.jenis?.toUpperCase()) || 'LAINNYA'}<br/>
                        
                        Kontak: {i.kontak || '-'}<br/>
                        Radius Aksi: {i.radius || 0} meter
                      </Popup>
                    </Marker>

                  </LayerGroup>
                );
              })}
            </LayerGroup>
          </LayersControl.Overlay>

          {/* 4. LOOPING DATA PENDUDUK MISKIN YANG BENAR (Di dalam Peta) */}
          <LayersControl.Overlay checked name="Titik Penduduk Miskin">
            <LayerGroup>
              {dataMiskin.map(m => {
                if (!m.geom) return null;
                const [miskinLat, miskinLng] = parsePoint(m.geom);
                return (
                  <Marker key={m.id} position={[miskinLat, miskinLng]} icon={MiskinIcon}>
                    <Popup>
                      <div style={{ minWidth: '220px' }}>
                        <h3>👤 Kepala Keluarga: {m.kepala_keluarga}</h3>
                        <p>👥 Jumlah Anggota: {m.jumlah_anggota} Jiwa</p>
                        <p>📦 Bantuan: {m.jenis_bantuan && m.jenis_bantuan.length > 0 ? m.jenis_bantuan.join(', ') : 'Belum menerima'}</p>
                        <p>🕌 Hub Terdekat ID: <strong>{m.id_ibadah_terdekat || 'Kosong'}</strong></p>
                        <hr style={{ margin: '8px 0', borderTop: '1px solid #ddd' }} />
                        <button 
                          disabled={isRoutingLoading}
                          onClick={() => handleFetchRoute(miskinLat, miskinLng, m.id_ibadah_terdekat)}
                          style={{ width: '100%', padding: '6px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          {isRoutingLoading ? 'Menghitung Jalur...' : '🚗 Tampilkan Rute Bantuan'}
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </LayerGroup>
          </LayersControl.Overlay>
        </LayersControl>

        {/* RENDERING JALUR RUTE NYATA */}
        {routingCoords.length > 0 && (
          <Polyline positions={routingCoords} pathOptions={{ color: '#ef4444', weight: 6, opacity: 0.9, dashArray: '10, 10' }} />
        )}

        {/* CONTROLLER EVENT MAP */}
        <MapClickHandler activeMode={activeInsertionMode} onMapClick={handleMapClick} />
        <MapViewUpdater center={pontianakCenter} />
        <MapLegend />

      </MapContainer>

      {/* Modal Input Overlay */}
      {showModal && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-container">
            <div className="modal-header">
              <h2>Tambah Data {activeInsertionMode?.toUpperCase()}</h2>
              <button className="close-x-btn" onClick={closeModal}>&times;</button>
            </div>

            {activeInsertionMode === 'jalan' && (
              <form onSubmit={submitJalanForm}>
                <div className="form-group"><label>Nama Jalan</label>
                  <input type="text" placeholder="Contoh: Jl. Ahmad Yani" required value={formJalan.nama} onChange={e => setFormJalan({...formJalan, nama: e.target.value})} />
                </div>
                <div className="form-group"><label>Klasifikasi Status Jalan</label>
                  <select value={formJalan.status} onChange={e => setFormJalan({...formJalan, status: e.target.value})}>
                    <option value="Jln Nasional">Jln Nasional (Biru)</option>
                    <option value="Jln Provinsi">Jln Provinsi (Hijau)</option>
                    <option value="Jln Kabupaten">Jln Kabupaten (Kuning)</option>
                  </select>
                </div>
                <button type="submit" className="submit-btn save-ibadah">Simpan Lintasan Jalan</button>
              </form>
            )}

            {activeInsertionMode === 'area' && (
              <form onSubmit={submitAreaForm}>
                <div className="form-group"><label>Nama Wilayah / Sektor Area</label>
                  <input type="text" placeholder="Contoh: Kelurahan Bansir Laut" required value={formArea.nama} onChange={e => setFormArea({...formArea, nama: e.target.value})} />
                </div>
                <button type="submit" className="submit-btn save-ibadah" style={{ backgroundColor: 'purple' }}>Simpan Batas Wilayah</button>
              </form>
            )}

            {activeInsertionMode === 'ibadah' && (
              <form onSubmit={submitIbadahForm}>
                <div className="form-group">
                  <label>Nama Tempat Ibadah</label>
                  <input type="text" placeholder="Contoh: Masjid Raya Mujahidin" required value={formIbadah.nama} onChange={e => setFormIbadah({...formIbadah, nama: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Jenis Rumah Ibadah (ENUM)</label>
                  <select value={formIbadah.jenis} onChange={e => setFormIbadah({...formIbadah, jenis: e.target.value})}>
                    <option value="masjid">Masjid</option>
                    <option value="gereja">Gereja</option>
                    <option value="vihara">Vihara</option>
                    <option value="klenteng">Klenteng</option>
                    <option value="pura">Pura</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Nomor Kontak Pengurus</label>
                  <input type="text" maxLength="14" placeholder="Contoh: 081234567890" required value={formIbadah.kontak} onChange={e => setFormIbadah({...formIbadah, kontak: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Radius Layanan Jangkauan (Meter)</label>
                  <input type="number" min="1" required value={formIbadah.radius} onChange={e => setFormIbadah({...formIbadah, radius: parseInt(e.target.value)})} />
                </div>
                <button type="submit" className="submit-btn save-ibadah">Simpan Lokasi Ibadah</button>
              </form>
            )}

            {activeInsertionMode === 'miskin' && drawCoords.length > 0 && (
              <PendudukMiskinForm 
                selectedLat={drawCoords[0][0]} 
                selectedLng={drawCoords[0][1]} 
                onClose={closeModal}
                onSaveSuccess={() => { loadAllData(); closeModal(); }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;