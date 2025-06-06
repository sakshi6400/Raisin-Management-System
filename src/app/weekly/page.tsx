'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';

interface Employee {
  id: number;
  name: string;
}

interface DailyWork {
  employee_id: number; // Corrected field name to match API
  employee_name: string; // Assuming API returns this
  date: string;
  kgs_cleaned: number; // Corrected field name to match API
  earnings: number;
}

interface WeeklySummary {
  employeeId: number;
  name: string;
  totalKgs: number;
  totalEarnings: number;
  dailyWork: { [date: string]: { kgs: number; earnings: number } };
}

export default function WeeklySummaryPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [showDetailed, setShowDetailed] = useState(false);
  const [totalKgs, setTotalKgs] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);


  // Effect to fetch employees on initial load
  useEffect(() => {
    fetchEmployees();
  }, []);

  // Effect to fetch weekly work data when selectedWeek or employees change
  useEffect(() => {
    if (employees.length > 0) { // Only fetch if employees are loaded
        fetchWeeklyWork(selectedWeek);
    }
  }, [selectedWeek, employees]);


  function getCurrentWeek() {
    const now = new Date();
    const startOfWeek = new Date(now);
    // Adjust to get the start of the week (Sunday is 0)
    startOfWeek.setDate(now.getDate() - now.getDay());
    return startOfWeek.toISOString().split('T')[0];
  }

  function getWeekDates(startDate: string) {
    const dates = [];
    const start = new Date(startDate);
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  }

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchWeeklyWork = async (weekStartDate: string) => {
    setIsLoadingSummary(true);
    try {
      const weekDates = getWeekDates(weekStartDate);
      // Initialize summary with all employees for the current week
      const summary: WeeklySummary[] = employees.map(emp => ({
        employeeId: emp.id,
        name: emp.name,
        totalKgs: 0,
        totalEarnings: 0,
        dailyWork: {}
      }));

      // Fetch daily work for each day of the week
      for (const date of weekDates) {
        const response = await fetch(`/api/daily-work?date=${date}`);
        const dailyWork: DailyWork[] = await response.json();

        dailyWork.forEach(work => {
          const employeeSummary = summary.find(s => s.employeeId === work.employee_id); // Use employee_id
          if (employeeSummary) {
            employeeSummary.totalKgs += work.kgs_cleaned; // Use kgs_cleaned
            employeeSummary.totalEarnings += work.earnings;
            employeeSummary.dailyWork[date] = {
              kgs: work.kgs_cleaned, // Use kgs_cleaned
              earnings: work.earnings
            };
          }
        });
      }

      setWeeklySummary(summary);
      calculateTotals(summary);
    } catch (error) {
      console.error('Error fetching weekly work:', error);
      setWeeklySummary([]); // Clear data on error
      setTotalKgs(0);
      setTotalEarnings(0);
    } finally {
      setIsLoadingSummary(false);
    }
  };


  const calculateTotals = (summary: WeeklySummary[]) => {
    const totalKgs = summary.reduce((sum, s) => sum + s.totalKgs, 0);
    const totalEarnings = summary.reduce((sum, s) => sum + s.totalEarnings, 0);
    setTotalKgs(totalKgs);
    setTotalEarnings(totalEarnings);
  };

  const weekDates = getWeekDates(selectedWeek); // Get week dates for rendering

  return (
    <div className="min-h-screen p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Weekly Summary</h1>
        <ThemeToggle />
      </div>

      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <label htmlFor="week" className="font-semibold">Week Starting:</label>
            <input
              type="date"
              id="week"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="border rounded p-2"
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showDetailed}
                onChange={(e) => setShowDetailed(e.target.checked)}
                className="rounded"
              />
              Show Detailed View
            </label>
          </div>

          {isLoadingSummary ? (
              <div>Loading weekly summary...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    <th className="p-4 text-left">Employee</th>
                    {showDetailed && weekDates.map(date => (
                      <th key={date} className="p-4 text-left">
                        {new Date(date).toLocaleDateString()}
                      </th>
                    ))}
                    <th className="p-4 text-left">Total Kgs</th>
                    <th className="p-4 text-left">Total Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklySummary.map((summary) => (
                    <tr key={summary.employeeId} className="border-b">
                      <td className="p-4">{summary.name}</td>
                      {showDetailed && weekDates.map(date => {
                        const work = summary.dailyWork[date] || { kgs: 0, earnings: 0 };
                        return (
                          <td key={date} className="p-4">
                            <div>{work.kgs.toFixed(2)} kgs</div>
                            <div className="text-sm text-gray-600">₹{work.earnings.toFixed(2)}</div>
                          </td>
                        );
                      })}
                      <td className="p-4">{summary.totalKgs.toFixed(2)} kgs</td>
                      <td className="p-4">₹{summary.totalEarnings.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 dark:bg-gray-800 font-bold">
                    <td className="p-4">Total</td>
                    {showDetailed && weekDates.map(date => (
                      <td key={date} className="p-4">
                        {weeklySummary.reduce((sum, s) => sum + (s.dailyWork[date]?.kgs || 0), 0).toFixed(2)} kgs
                        <div className="text-sm">
                          ₹{weeklySummary.reduce((sum, s) => sum + (s.dailyWork[date]?.earnings || 0), 0).toFixed(2)}
                        </div>
                      </td>
                    ))}
                    <td className="p-4">{totalKgs.toFixed(2)} kgs</td>
                    <td className="p-4">₹{totalEarnings.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}