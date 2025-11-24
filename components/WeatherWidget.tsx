
import React, { useState, useEffect } from 'react';
import { Cloud, CloudRain, Sun, CloudLightning, CloudSnow, Thermometer, MapPin } from 'lucide-react';

interface WeatherData {
  currentTemp: number;
  min: number;
  max: number;
  code: number;
  condition: string;
}

interface Props {
  dateOffset: number; // 0 = Today, 1 = Tomorrow, 2 = Day After
}

const WeatherWidget: React.FC<Props> = ({ dateOffset }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        // Fetch daily forecast to handle Today/Tomorrow/DayAfter
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
        );
        const data = await response.json();
        
        // OpenMeteo Daily arrays index: 0=Today, 1=Tomorrow, 2=DayAfter
        const index = Math.min(dateOffset, 2); 
        
        const code = data.daily.weather_code[index];
        const min = data.daily.temperature_2m_min[index];
        const max = data.daily.temperature_2m_max[index];
        
        // For 'Today' (index 0), use current temp if available, otherwise avg
        let currentTemp = data.current.temperature_2m;
        if (index > 0) {
            // For future dates, just show the max temp as the "main" temp
            currentTemp = max;
        }

        setWeather({
          currentTemp,
          min,
          max,
          code,
          condition: getWeatherCondition(code)
        });
        setError(false);
      } catch (err) {
        console.error("Weather fetch failed", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }, () => {
      setError(true); // Location denied
      setLoading(false);
    });
  }, [dateOffset]);

  const getWeatherCondition = (code: number): string => {
    if (code === 0) return 'Clear Sky';
    if (code >= 1 && code <= 3) return 'Cloudy';
    if (code >= 45 && code <= 48) return 'Foggy';
    if (code >= 51 && code <= 67) return 'Rainy';
    if (code >= 71 && code <= 77) return 'Snowy';
    if (code >= 80 && code <= 82) return 'Showers';
    if (code >= 95) return 'Thunderstorm';
    return 'Good';
  };

  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="text-amber-500" size={28} />;
    if (code >= 1 && code <= 3) return <Cloud className="text-blue-400" size={28} />;
    if (code >= 51 && code <= 67) return <CloudRain className="text-blue-600" size={28} />;
    if (code >= 71 && code <= 77) return <CloudSnow className="text-cyan-200" size={28} />;
    if (code >= 95) return <CloudLightning className="text-purple-500" size={28} />;
    return <Sun className="text-zinc-400" size={28} />;
  };

  if (loading) return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 mb-6 flex items-center gap-4 animate-pulse">
          <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-800 rounded-full"></div>
          <div className="space-y-2">
              <div className="w-20 h-4 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
              <div className="w-12 h-3 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
          </div>
      </div>
  );
  
  if (error || !weather) return null;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 mb-6 flex items-center justify-between shadow-sm animate-fade-in transition-colors duration-300">
        <div className="flex items-center gap-4">
            <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full ring-1 ring-zinc-200 dark:ring-zinc-700">
                {getWeatherIcon(weather.code)}
            </div>
            <div>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-zinc-900 dark:text-white">{Math.round(weather.currentTemp)}°</span>
                    <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{weather.condition}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">
                   <span>H: {Math.round(weather.max)}°</span>
                   <span>L: {Math.round(weather.min)}°</span>
                </div>
            </div>
        </div>
        <div className="text-right px-2 hidden xs:block">
             <div className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full font-bold mb-1">
                 <MapPin size={10} /> Local
             </div>
             <p className="text-xs text-zinc-400">
                 {dateOffset === 0 ? 'Current' : 'Forecast'}
             </p>
        </div>
    </div>
  );
};

export default WeatherWidget;
