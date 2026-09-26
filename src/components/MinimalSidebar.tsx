import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Maximize, Wind, Box, Package, Sparkles, Settings } from 'lucide-react';

export interface MenuItemData {
  link: string;
  text: string;
  icon?: React.ReactNode;
}

export interface MinimalSidebarProps {
  items?: MenuItemData[];
  textColor?: string;
  bgColor?: string;
  activeColor?: string;
}

export const MinimalSidebar: React.FC<MinimalSidebarProps> = ({
  items = [],
  textColor = 'text-white/70',
  bgColor = 'bg-black/20',
  activeColor = 'text-white bg-white/10',
}) => {
  return (
    <div className={`w-full h-full ${bgColor} backdrop-blur-md flex flex-col pt-7 pb-8 px-4 relative overflow-hidden`}>
      {/* Brand Logo Header with White Background */}
      <div className="mb-6 px-1 flex flex-col items-center justify-center">
        <NavLink 
          to="/app" 
          className="block w-full bg-white rounded-xl py-2 px-3 shadow-md border border-white/20 transition-transform hover:scale-[1.02] flex items-center justify-center"
          title="ThermoShelter by Celestialz"
        >
          <img 
            src="/images/thermoshelter_logo.png" 
            alt="ThermoShelter by Celestialz" 
            className="w-full max-w-[200px] h-auto object-contain mx-auto"
          />
        </NavLink>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto scrollbar-hide pr-2 relative z-10">
        {items.map((item, idx) => (
          <NavLink
            key={idx}
            to={item.link}
            end={item.link === '/app'}
            style={{
              // Horizontal wood grain for planks
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='wood'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.02 0.3' numOctaves='3' result='noise'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.15 0' in='noise'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23wood)'/%3E%3C/svg%3E")`,
              backgroundSize: 'cover'
            }}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 group border-b-[3px] border-r-2 shadow-sm relative overflow-hidden ${
                isActive 
                  ? 'bg-[#6b4226] border-[#3e271a] text-white translate-y-[1px] shadow-inner' 
                  : 'bg-[#8c5a35] border-[#5c3a26] text-white/90 hover:bg-[#9c6a45] hover:text-white hover:-translate-y-0.5 shadow-[0_4px_6px_rgba(0,0,0,0.3)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Add a subtle highlight to the top edge for 3D plank effect */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/20 pointer-events-none"></div>
                
                <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                   {item.icon}
                </div>
                <span className={`font-medium tracking-wide text-sm transition-colors duration-200 ${isActive ? 'font-bold' : 'font-semibold'} drop-shadow-md`}>
                  {item.text}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default MinimalSidebar;
