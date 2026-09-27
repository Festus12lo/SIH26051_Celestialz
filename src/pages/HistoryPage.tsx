import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, MapPin, IndianRupee, Layers, ChevronRight, Trash2, Download, FileText, Sparkles } from 'lucide-react';
import { AppContext } from '../App';
import { motion } from 'framer-motion';
import { exportBlueprintToPDF } from '../utils/pdfGenerator';

interface HistoryItem {
  id: string;
  timestamp: number;
  data: any;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { setBlueprintData } = useContext(AppContext);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('thermoshelter_blueprints_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHistory(parsed.sort((a: HistoryItem, b: HistoryItem) => b.timestamp - a.timestamp));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const handleLoadBlueprint = (item: HistoryItem) => {
    setBlueprintData(item.data);
    navigate('/app/floorplan');
  };

  const handleInstallPDF = async (item: HistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDownloadingId(item.id);
      await exportBlueprintToPDF(item.data);
    } catch (err) {
      console.error("Failed to export blueprint to PDF:", err);
      alert("Could not generate PDF. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear all history?")) {
      localStorage.removeItem('thermoshelter_blueprints_history');
      setHistory([]);
    }
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newHistory = history.filter(item => item.id !== id);
    localStorage.setItem('thermoshelter_blueprints_history', JSON.stringify(newHistory));
    setHistory(newHistory);
  };

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto p-6 md:p-12 animate-in fade-in duration-700">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">Generation History</h1>
          <p className="text-white/60">Review and reload your previously generated shelter blueprints (stored locally).</p>
        </div>
        {history.length > 0 && (
          <button 
            onClick={handleClearHistory}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-colors text-sm font-semibold"
          >
            <Trash2 size={16} /> Clear All
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="w-full glass-card-premium p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
          <Clock size={48} className="text-white/20 mb-6" />
          <h3 className="text-xl font-bold text-white mb-2">No History Found</h3>
          <p className="text-white/50 max-w-md mb-8">You haven't generated any blueprints yet. Start a new project to see it here.</p>
          <Link to="/app/preferences" className="px-6 py-3 bg-white text-black font-black rounded-xl hover:bg-gray-200 transition-colors">
            Generate Blueprint
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {history.map((item, idx) => {
            const bp = item.data;
            const date = new Date(item.timestamp).toLocaleString();
            const location = bp.location || bp.building?.location || bp.architecture?.location || "Unknown Location";
            const budget = bp.budget?.total_cost_inr || bp.cost_estimate?.total_cost_inr || "Unknown";
            const type = bp.building_type || "Shelter";
            const imageUrl = bp.floor_plan_3d_url || bp.visual?.floor_plan_3d_url || bp.floor_plan_2d_url || bp.visual?.floor_plan_2d_url || bp.image_url || bp.visual?.image_url;

            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={item.id}
                onClick={() => handleLoadBlueprint(item)}
                className="group cursor-pointer glass-card-subtle overflow-hidden flex flex-col"
              >
                {/* Thumbnail */}
                <div className="h-48 w-full bg-black/60 relative overflow-hidden border-b border-white/10">
                  {imageUrl ? (
                    <img 
                      src={imageUrl} 
                      alt={type} 
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/emergency_house.jpg';
                      }}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20">
                      <Layers size={48} />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-semibold text-white/90 border border-white/10 flex items-center gap-2">
                    <Clock size={12} /> {new Date(item.timestamp).toLocaleDateString()}
                  </div>
                  <button 
                    onClick={(e) => handleDeleteItem(item.id, e)}
                    className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-md rounded-lg text-white/50 hover:text-red-400 border border-white/10 hover:border-red-400/50 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                
                {/* Content */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-4 line-clamp-1">{type}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm text-white/70">
                        <MapPin size={16} className="text-blue-400 shrink-0" />
                        <span className="truncate">{location}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-white/70">
                        <IndianRupee size={16} className="text-emerald-400 shrink-0" />
                        <span>₹{budget.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between gap-2">
                    <button
                      onClick={(e) => handleInstallPDF(item, e)}
                      disabled={downloadingId === item.id}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-[#FF5722] text-zinc-200 hover:text-white border border-white/10 hover:border-[#FF5722] text-xs font-mono font-medium transition-all shadow-sm disabled:opacity-50"
                      title="Install complete architectural CAD & thermal specification as PDF"
                    >
                      <Download size={13} className={downloadingId === item.id ? 'animate-bounce text-white' : ''} />
                      <span>{downloadingId === item.id ? 'Compiling CAD PDF...' : 'Install as PDF'}</span>
                    </button>

                    <div className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-[var(--color-accent)] group-hover:text-[#ff784e] transition-colors">
                      <span>View</span>
                      <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
