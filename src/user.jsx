import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, Polygon, LayersControl, LayerGroup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import markerShadowPng from "leaflet/dist/images/marker-shadow.png";

// Setup Icons
const DefaultIcon = L.icon({ iconUrl: markerIconPng, shadowUrl: markerShadowPng, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] });
L.Marker.prototype.options.icon = DefaultIcon;

const MiskinIcon = L.divIcon({
  className: 'custom-miskin-marker',
  html: `<div style="background-color: #ff4d4d; width: 12px; height: 12px; border-radius: 50%; border: 2px white solid; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
  iconSize: [12, 12], iconAnchor: [6, 6]
});

const IbadahIcon = L.icon({ iconUrl: markerIconPng, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] });

// Parsers
const parsePoint = (geom) => [geom.coordinates[1], geom.coordinates[0]];
const parseLineString = (geom) => geom.coordinates.map(coord => [coord[1], coord[0]]);
const parsePolygon = (geom) => geom.coordinates.map(ring => ring.map(coord => [coord[1], coord[0]]));

function MapViewUpdater({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, map.getZoom()); }, [center, map]);
  return null;
}

function MapLegend() {
  const map = useMap();
  useEffect(() => {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'info legend');
      div.style.background = 'white'; 
      div.style.padding = '12px'; 
      div.style.borderRadius = '8px';
      div.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)'; 
      div.style.fontSize = '13px'; 
      div.style.lineHeight = '20px'; 
      div.style.color = '#333';
      
      div.innerHTML = `
        <h4 style="margin: 0 0 8px 0; border-bottom: 1px solid #ccc; padding-bottom: 4px;">Legenda Peta</h4>
        <div style="margin-bottom: 8px;"><strong>Tempat Ibadah:</strong><br/>
          <span style="display:inline-block; width:12px; height:12px; background:#2563eb; border-radius:50%; margin-right:6px; border:1px solid #fff;"></span> Radius Pelayanan (300m+)
        </div>
        <div style="margin-bottom: 8px;"><strong>Kesejahteraan:</strong><br/>
          <span style="display:inline-block; width:12px; height:12px; background:#ff4d4d; border-radius:50%; margin-right:6px; border:2px solid #fff; box-shadow:0 0 2px rgba(0,0,0,0.5);"></span> Penduduk Miskin
        </div>
        <div style="margin-bottom: 8px;"><strong>Jaringan Jalan:</strong><br/>
          <span style="display:inline-block; width:24px; height:4px; background:#0000ff; margin-right:6px; vertical-align:middle;"></span> Jln Nasional<br/>
          <span style="display:inline-block; width:24px; height:4px; background:#008000; margin-right:6px; vertical-align:middle;"></span> Jln Provinsi<br/>
          <span style="display:inline-block; width:24px; height:4px; background:#ffff00; border:1px solid #ccc; margin-right:6px; vertical-align:middle;"></span> Jln Kabupaten
        </div>
        <div><strong>Batas Sektoral:</strong><br/>
          <span style="display:inline-block; width:20px; height:12px; background:rgba(128, 0, 128, 0.15); border:2px solid purple; margin-right:6px; vertical-align:middle;"></span> Wilayah / Area Sektor
        </div>`;
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

function User() {
  const pontianakCenter = [-0.0263, 109.3425];
  const [dataJalan, setDataJalan] = useState([]);
  const [dataArea, setDataArea] = useState([]);
  const [dataIbadah, setDataIbadah] = useState([]);
  const [dataMiskin, setDataMiskin] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/jalan').then(res => res.json()).then(setDataJalan);
    fetch('http://localhost:5000/api/area').then(res => res.json()).then(setDataArea);
    fetch('http://localhost:5000/api/ibadah').then(res => res.json()).then(setDataIbadah);
    fetch('http://localhost:5000/api/miskin').then(res => res.json()).then(setDataMiskin);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <MapContainer center={pontianakCenter} zoom={14} style={{ width: '100%', height: '100%' }}>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        <LayersControl position="topright">
            {/* BASE LAYERS: Only define these here */}
            <LayersControl.BaseLayer checked name="OpenStreetMap Standard">
            <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="OpenStreetMap Kemanusiaan (HOT)">
            <TileLayer url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png" />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="OpenTopoMap">
            <TileLayer url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" maxZoom={17} />
            </LayersControl.BaseLayer>

            {/* OVERLAY LAYERS: These work now that they are properly registered */}
            <LayersControl.Overlay checked name="Jaringan Jalan">
            <LayerGroup>
                {dataJalan.map(j => {
                if (!j.geom) return null;
                return (
                    <Polyline key={j.id} positions={parseLineString(j.geom)} pathOptions={getJalanStyle(j.status)}>
                    <Popup><b>Nama:</b> {j.nama || 'Tanpa Nama'}<br/><b>Status:</b> {j.status}</Popup>
                    </Polyline>
                );
                })}
            </LayerGroup>
            </LayersControl.Overlay>

        <LayersControl.Overlay checked name="Area Rawan Banjir">
            <LayerGroup>
            {dataArea.map(a => (
                <Polygon key={a.id} positions={parsePolygon(a.geom)} pathOptions={{ color: 'purple', fillColor: 'purple', fillOpacity: 0.15 }}>
                <Popup><b>Area Wilayah:</b> {a.nama || 'Sektor'}</Popup>
                </Polygon>
            ))}
            </LayerGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked name="Titik Rumah Ibadah">
            <LayerGroup>
            {dataIbadah.map(i => (
                <LayerGroup key={i.id}>
                <Circle center={parsePoint(i.geom)} radius={Number(i.radius) || 300} pathOptions={{ color: '#2563eb' }} />
                <Marker position={parsePoint(i.geom)} icon={IbadahIcon}>
                    <Popup>
                    <b>{i.nama}</b><br/>
                    Jenis: {i.jenis?.toUpperCase()}<br/>
                    Kontak: {i.kontak || '-'}
                    </Popup>
                </Marker>
                </LayerGroup>
            ))}
            </LayerGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked name="Titik Penduduk Miskin">
            <LayerGroup>
            {dataMiskin.map(m => (
                <Marker key={m.id} position={parsePoint(m.geom)} icon={MiskinIcon}>
                <Popup>
                    <h3>👤 {m.kepala_keluarga}</h3>
                    <p>👥 Anggota: {m.jumlah_anggota} Jiwa</p>
                    <p>📦 Bantuan: {m.jenis_bantuan || 'Belum menerima'}</p>
                </Popup>
                </Marker>
            ))}
            </LayerGroup>
        </LayersControl.Overlay>
        </LayersControl>

        <MapViewUpdater center={pontianakCenter} />
        <MapLegend />
      </MapContainer>
    </div>
  );
}

export default User;