import React, { useState, useContext } from 'react';
import { Info } from 'lucide-react';
import { AppContext } from '../App';
import LocationAutocomplete from '../components/LocationAutocomplete';
import { generateBlueprint, type ChatMessage, type ResolvedLocation } from '../api/llmClient';

export const PreferencesPage: React.FC = () => {
  const { setBlueprintData } = useContext(AppContext);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [location, setLocation] = useState('Leh, India');
  const [resolvedLocation, setResolvedLocation] = useState<ResolvedLocation | undefined>(undefined);
  const [budget, setBudget] = useState('250000');
  const [shelterType, setShelterType] = useState('Emergency Shelter');

  const getBudgetWarning = () => {
    const budgetNum = parseInt(budget) || 0;
    if (shelterType === 'Emergency Shelter' && budgetNum < 200000) return true;
    if (shelterType === 'Permanent Shelter' && budgetNum < 500000) return true;
    if (shelterType === 'Community Shelter' && budgetNum < 800000) return true;
    return false;
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const messages: ChatMessage[] = [
         { role: 'user', content: `Generate a detailed blueprint for a ${shelterType} in ${location} with a budget of ₹${budget}. Use the latest material catalogue data.` }
      ];
      const data = await generateBlueprint(messages, undefined, resolvedLocation, shelterType);
      setBlueprintData(data);
      
      // Save to History
      try {
        const saved = localStorage.getItem('thermoshelter_blueprints_history');
        const history = saved ? JSON.parse(saved) : [];
        const newItem = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: Date.now(),
          data: data
        };
        localStorage.setItem('thermoshelter_blueprints_history', JSON.stringify([newItem, ...history]));
      } catch (e) {
        console.error("Failed to save to history", e);
      }

      // Let the user know they can check other tabs now
      alert("Blueprint generated successfully! Check the Home, Floor Plan, or Cost & Materials pages.");
    } catch(err) {
      console.error(err);
      alert("Failed to generate blueprint. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const isBudgetLow = getBudgetWarning();

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full p-8 animate-in fade-in duration-700">
      <h1 className="text-4xl font-black tracking-tight mb-8 text-white">Build Your Shelter</h1>
      
      <div className="glass-card-premium p-8 md:p-10 text-white space-y-6">
        
        <div className="space-y-1.5">
           <label className="block text-sm font-bold text-white/80 px-2">Where do you want to build? (City or Town)</label>
           <LocationAutocomplete
             initialValue={location}
             placeholder="Search city (e.g. Leh, Jaipur, Chennai)..."
             onLocationSelect={(loc) => {
               setLocation(loc.display_name);
               setResolvedLocation(loc);
             }}
           />
           {resolvedLocation && (
             <p className="text-xs text-white/40 px-2 mt-1 font-mono">
               📍 {resolvedLocation.lat.toFixed(4)}°N, {resolvedLocation.lon.toFixed(4)}°E — {resolvedLocation.state}
             </p>
           )}
        </div>

        <div className="space-y-1.5">
           <label className="block text-sm font-bold text-white/80 px-2">Your Budget (in ₹ Indian Rupees)</label>
           <input 
             type="number" 
             value={budget} 
             onChange={e => setBudget(e.target.value)} 
             className="w-full bg-black/40 border border-white/20 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-[var(--color-accent)] focus:bg-black/60 transition-colors font-semibold" 
             placeholder="250000"
           />
        </div>

        <div className="space-y-1.5">
           <label className="block text-sm font-bold text-white/80 px-2">What kind of shelter do you need?</label>
           <select 
             value={shelterType} 
             onChange={e => setShelterType(e.target.value)} 
             className="w-full bg-black/40 border border-white/20 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-[var(--color-accent)] focus:bg-black/60 transition-colors font-semibold [&>option]:bg-zinc-900"
           >
              <option value="Emergency Shelter">Emergency Shelter (Rapid Setup, Portable)</option>
              <option value="Community Shelter">Community Shelter (Larger Space for Groups/Schools)</option>
              <option value="Permanent Shelter">Permanent Shelter (Durable Family Home)</option>
           </select>
        </div>
        
        {isBudgetLow && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300/90 px-4 py-4 rounded-2xl flex items-start gap-3 mt-4">
            <Info size={20} className="shrink-0 mt-0.5 text-yellow-500/70" />
            <p className="text-sm leading-relaxed font-medium">
              <strong>Budget Notice:</strong> This budget is on the lower side for a {shelterType.toLowerCase()}. The AI will prioritize affordable, basic local materials to help you stay within budget.
            </p>
          </div>
        )}

        <div className="pt-6">
           <button 
             onClick={handleGenerate}
             disabled={isGenerating}
             className="btn-fluid w-full py-4 bg-white text-black font-black text-lg rounded-2xl hover:bg-gray-200 transition-colors shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 cursor-pointer"
           >
             {isGenerating ? (
               <>
                 <span className="w-5 h-5 rounded-full border-[3px] border-gray-400 border-t-black animate-spin"></span>
                 Creating Your Blueprint...
               </>
             ) : 'Create My Shelter Blueprint'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default PreferencesPage;
