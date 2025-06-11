import { useEffect, useState, useCallback } from "react";
import { IncomeExpensePieChart } from "./IncomeExpensePieChart";
import { CategoryPieCharts } from "./CategoryPieCharts";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";

type ChartType = 'overview' | 'expenses' | 'income';

interface ChartCarouselProps {
  selectedDate: Date;
}

const chartTitles = {
  overview: 'Income vs Expenses',
  expenses: 'Expenses by Category',
  income: 'Income by Category'
};

export function ChartCarousel({ selectedDate }: ChartCarouselProps) {
  const [activeChart, setActiveChart] = useState<ChartType>('overview');
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const charts: ChartType[] = ['overview', 'expenses', 'income'];
  const currentIndex = charts.indexOf(activeChart);

  const nextChart = useCallback(() => {
    setActiveChart(charts[(currentIndex + 1) % charts.length]);
  }, [currentIndex]);

  const prevChart = useCallback(() => {
    setActiveChart(charts[(currentIndex - 1 + charts.length) % charts.length]);
  }, [currentIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        nextChart();
      } else if (e.key === 'ArrowLeft') {
        prevChart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  // Handle touch events for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 50) {
      nextChart();
    } else if (touchEnd - touchStart > 50) {
      prevChart();
    }
  };

  // Auto-advance to next chart every 8 seconds
  useEffect(() => {
    if (isHovered) return; // Don't auto-advance when user is interacting
    
    const timer = setInterval(() => {
      nextChart();
    }, 8000);
    
    return () => clearInterval(timer);
  }, [currentIndex, isHovered, nextChart]);

  return (
    <div 
      className="relative bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-[300px] w-full transition-all duration-200 hover:shadow-md"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Navigation Arrows */}
      <button 
        onClick={prevChart}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-md text-gray-600 hover:bg-gray-100 transition-colors duration-200"
        aria-label="Previous chart"
      >
        <ChevronLeftIcon className="w-5 h-5" />
      </button>
      
      <button 
        onClick={nextChart}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-md text-gray-600 hover:bg-gray-100 transition-colors duration-200"
        aria-label="Next chart"
      >
        <ChevronRightIcon className="w-5 h-5" />
      </button>

      {/* Chart Title and Navigation Dots */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-white/90 to-transparent pt-2 pb-1 px-4">
        <div className="flex flex-col items-center">
          <h3 className="text-base font-medium text-gray-800">{chartTitles[activeChart]}</h3>
          <div className="flex space-x-1">
            {charts.map((chart, index) => (
              <button
                key={chart}
                onClick={() => setActiveChart(chart)}
                className={`h-1 rounded-full transition-all duration-300 ${
                  activeChart === chart ? 'w-6 bg-blue-600' : 'w-4 bg-gray-200 hover:bg-gray-300'
                }`}
                aria-label={`Show ${chart} chart`}
                aria-current={activeChart === chart ? 'true' : 'false'}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Chart Content */}
      <div className="h-full pt-12 pb-4 px-2">
        <div className="h-full transition-opacity duration-500 ease-in-out">
          {activeChart === 'overview' && <IncomeExpensePieChart selectedDate={selectedDate} />}
          {activeChart === 'expenses' && <CategoryPieCharts showOnly="expenses" selectedDate={selectedDate} />}
          {activeChart === 'income' && <CategoryPieCharts showOnly="income" selectedDate={selectedDate} />}
        </div>
      </div>
      
      {/* Subtle gradient at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </div>
  );
}
