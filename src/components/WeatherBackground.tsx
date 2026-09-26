import React from 'react';
import './weather.css';

interface WeatherBackgroundProps {
  condition: string;
}

export default function WeatherBackground({ condition }: WeatherBackgroundProps) {
  const isClear = condition === 'Clear';
  const isCloudy = condition === 'Cloudy' || condition === 'Fog' || condition === 'Unknown';
  const isRainy = condition.includes('Rain') || condition.includes('Showers') || condition === 'Thunderstorm';
  const isSnowy = condition.includes('Snow');

  if (isClear) {
    return (
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-60">
        <div className="w-32 h-32 bg-yellow-400 rounded-full blur-[2px] shadow-[0_0_60px_rgba(250,204,21,0.6)] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0 overflow-hidden rounded-[2rem] pointer-events-none">
      <div className="rainy-weather">
        <div className="cloud-main"></div>
        <div className="cloud-center"></div>
        <div className="cloud-left"></div>
        
        {(isRainy || isSnowy) && (
          <>
            <div className="droplet droplet1" style={{ background: isSnowy ? '#fff' : '' }}></div>
            <div className="droplet droplet2" style={{ background: isSnowy ? '#fff' : '' }}></div>
            <div className="droplet droplet3" style={{ background: isSnowy ? '#fff' : '' }}></div>
            <div className="droplet droplet4" style={{ background: isSnowy ? '#fff' : '' }}></div>
            <div className="droplet droplet5" style={{ background: isSnowy ? '#fff' : '' }}></div>
            <div className="droplet droplet6" style={{ background: isSnowy ? '#fff' : '' }}></div>
          </>
        )}
      </div>
    </div>
  );
}
