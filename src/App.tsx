/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Camera, List, X, Navigation, Image as ImageIcon, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import L from 'leaflet';

// Types
interface Billboard {
  id: string;
  lat: number;
  lng: number;
  photo: string;
  timestamp: number;
  district: string;
}

const DISTRICTS = [
  "Menteşe", "Bodrum", "Dalaman", "Datça", "Fethiye", "Kavaklıdere", 
  "Köyceğiz", "Marmaris", "Milas", "Ortaca", "Seydikemer", "Ula", "Yatağan"
];

export default function App() {
  const [map, setMap] = useState<L.Map | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [billboards, setBillboards] = useState<Billboard[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [showList, setShowList] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState(DISTRICTS[0]);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);

  // Load billboards from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('billboards');
    if (saved) {
      try {
        setBillboards(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse billboards from localStorage", e);
      }
    }
  }, []);

  // Save billboards to LocalStorage
  useEffect(() => {
    localStorage.setItem('billboards', JSON.stringify(billboards));
    updateMarkers();
  }, [billboards, map]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapRef.current || map) return;

    const muğlaCenter: [number, number] = [37.2153, 28.3636];
    const newMap = L.map(mapRef.current, {
      center: muğlaCenter,
      zoom: 10,
      zoomControl: false,
      attributionControl: false
    });

    // Dark Theme Tiles (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(newMap);

    setMap(newMap);
    getCurrentLocation(newMap);

    return () => {
      newMap.remove();
    };
  }, []);

  const getCurrentLocation = (targetMap?: L.Map) => {
    const activeMap = targetMap || map;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(pos);
          activeMap?.setView([pos.lat, pos.lng], 15);

          // User marker
          if (userMarkerRef.current) {
            userMarkerRef.current.remove();
          }

          if (activeMap) {
            userMarkerRef.current = L.circleMarker([pos.lat, pos.lng], {
              radius: 10,
              fillColor: "#8B5CF6",
              color: "#FFFFFF",
              weight: 2,
              opacity: 1,
              fillOpacity: 1
            }).addTo(activeMap);
            
            userMarkerRef.current.bindPopup("Siz buradasınız").openPopup();
          }
        },
        () => {
          console.error("Geolocation failed");
        }
      );
    }
  };

  const updateMarkers = () => {
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Custom Icon for Billboard
    const billboardIcon = L.divIcon({
      html: `<div class="w-8 h-8 bg-purple-600 rounded-full border-2 border-white flex items-center justify-center shadow-lg shadow-purple-500/50">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
             </div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    // Add new markers
    billboards.forEach(bb => {
      const marker = L.marker([bb.lat, bb.lng], { icon: billboardIcon }).addTo(map);
      
      const popupContent = `
        <div style="color: #1f2937; padding: 4px; min-width: 150px;">
          <h3 style="font-weight: bold; margin-bottom: 4px; color: #7c3aed;">${bb.district}</h3>
          <img src="${bb.photo}" style="width: 100%; border-radius: 8px; margin-bottom: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);" />
          <p style="font-size: 11px; color: #6b7280; display: flex; align-items: center; gap: 4px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            ${new Date(bb.timestamp).toLocaleString()}
          </p>
        </div>
      `;

      marker.bindPopup(popupContent);
      markersRef.current.push(marker);
    });
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveBillboard = () => {
    if (!userLocation || !capturedPhoto) return;

    const newBillboard: Billboard = {
      id: Date.now().toString(),
      lat: userLocation.lat,
      lng: userLocation.lng,
      photo: capturedPhoto,
      timestamp: Date.now(),
      district: selectedDistrict,
    };

    setBillboards([newBillboard, ...billboards]);
    setIsAdding(false);
    setCapturedPhoto(null);
  };

  return (
    <div className="relative h-screen w-full bg-[#0f172a] text-white font-sans overflow-hidden">
      {/* Map Container */}
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-6 z-10 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <div className="flex justify-between items-center pointer-events-auto">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-purple-400">Billboard Takip</h1>
            <p className="text-xs text-gray-300 uppercase tracking-widest font-medium">Muğla • 13 İlçe</p>
          </div>
          <button 
            onClick={() => setShowList(!showList)}
            className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 hover:bg-white/20 transition-all"
          >
            <List size={24} />
          </button>
        </div>
      </div>

      {/* Bottom Action Button */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center px-6 z-10">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsAdding(true)}
          className="w-full max-w-md bg-gradient-to-r from-purple-600 to-indigo-600 py-4 rounded-2xl shadow-2xl shadow-purple-500/30 flex items-center justify-center gap-3 font-bold text-lg border border-white/10"
        >
          <MapPin size={24} />
          Fotoğrafla İşaretle
        </motion.button>
      </div>

      {/* Location Button */}
      <button 
        onClick={() => getCurrentLocation()}
        className="absolute bottom-32 right-6 p-3 bg-white text-gray-900 rounded-full shadow-lg z-10 hover:bg-gray-100 transition-all"
      >
        <Navigation size={20} />
      </button>

      {/* Add Billboard Modal */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="absolute inset-0 z-20 bg-[#0f172a]/95 backdrop-blur-xl p-6 flex flex-col"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold">Yeni Billboard Ekle</h2>
              <button onClick={() => setIsAdding(false)} className="p-2 text-gray-400">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto pb-24">
              {/* Photo Preview / Upload */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-video w-full rounded-2xl border-2 border-dashed border-purple-500/30 bg-purple-500/5 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative"
              >
                {capturedPhoto ? (
                  <img src={capturedPhoto} className="w-full h-full object-cover" alt="Captured" />
                ) : (
                  <>
                    <Camera size={48} className="text-purple-400 mb-2" />
                    <p className="text-sm text-gray-400">Billboard Fotoğrafı Çek/Yükle</p>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePhotoCapture} 
                  accept="image/*" 
                  capture="environment"
                  className="hidden" 
                />
              </div>

              {/* District Selection */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-gray-400 font-bold">İlçe Seçin</label>
                <div className="grid grid-cols-3 gap-2">
                  {DISTRICTS.map(d => (
                    <button
                      key={d}
                      onClick={() => setSelectedDistrict(d)}
                      className={`py-2 px-1 rounded-lg text-xs font-medium transition-all border ${
                        selectedDistrict === d 
                        ? 'bg-purple-600 border-purple-400 text-white' 
                        : 'bg-white/5 border-white/10 text-gray-400'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location Info */}
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center gap-4">
                <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400">
                  <Navigation size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-bold">Anlık Konum</p>
                  <p className="text-sm font-mono">
                    {userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : 'Konum alınıyor...'}
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute bottom-10 left-6 right-6">
              <button
                disabled={!capturedPhoto || !userLocation}
                onClick={saveBillboard}
                className="w-full bg-white text-black py-4 rounded-2xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Kaydet ve Pinle
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List Modal */}
      <AnimatePresence>
        {showList && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="absolute inset-0 z-20 bg-[#0f172a] p-6 flex flex-col"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold">Kayıtlı Billboardlar</h2>
              <button onClick={() => setShowList(false)} className="p-2 text-gray-400">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pb-10">
              {billboards.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <ImageIcon size={48} className="mb-4 opacity-20" />
                  <p>Henüz kayıtlı billboard yok.</p>
                </div>
              ) : (
                billboards.map(bb => (
                  <div key={bb.id} className="bg-white/5 rounded-2xl p-4 border border-white/10 flex gap-4">
                    <img src={bb.photo} className="w-24 h-24 rounded-xl object-cover" alt={bb.district} />
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <h3 className="font-bold text-purple-400">{bb.district}</h3>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                          <Clock size={12} />
                          {new Date(bb.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 font-mono">
                        <MapPin size={12} />
                        {bb.lat.toFixed(4)}, {bb.lng.toFixed(4)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
