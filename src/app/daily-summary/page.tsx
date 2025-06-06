'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';

interface DailyWorkEntry {
  employee_id: number;
  employee_name: string; // Assuming the API returns employee name
  date: string;
  kgs_cleaned: number;
  earnings: number;
}

export default function DailySummaryPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyEntries, setDailyEntries] = useState<DailyWorkEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalKgs, setTotalKgs] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    fetchDailySummary(selectedDate);
  }, [selectedDate]);

  const fetchDailySummary = async (date: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/daily-work?date=${date}`);
      const data: DailyWorkEntry[] = await response.json();
      setDailyEntries(data);
      calculateTotals(data);
    } catch (error) {
      console.error('Error fetching daily summary:', error);
      setDailyEntries([]);
      setTotalKgs(0);
      setTotalEarnings(0);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotals = (entries: DailyWorkEntry[]) => {
    const totalKgs = entries.reduce((sum, entry) => sum + entry.kgs_cleaned, 0);
    const totalEarnings = entries.reduce((sum, entry) => sum + entry.earnings, 0);
    setTotalKgs(totalKgs);
    setTotalEarnings(totalEarnings);
  };

  return (
    <div className="min-h-screen p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Daily Summary</h1>
        <ThemeToggle />
      </div>

      <Card className="mb-8">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-4">Select Date for Daily Summary</h2>
          <div className="mb-4">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="mt-1 block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-4">Individual Totals</h2>
          {isLoading ? (
            <div>Loading summary...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KGs Cleaned</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Earnings (₹)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dailyEntries.map((entry) => (
                    <tr key={entry.employee_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{entry.employee_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.kgs_cleaned.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{entry.earnings.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Total Kilograms Cleaned</h3>
            <p className="text-3xl font-bold text-primary">{totalKgs.toFixed(2)} KGs</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Total Earnings</h3>
            <p className="text-3xl font-bold text-primary">₹{totalEarnings.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 