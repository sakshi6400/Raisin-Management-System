'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTheme } from 'next-themes';

interface DashboardStats {
  totalEmployees: number;
  totalKgsToday: number;
  totalEarningsToday: number;
  weeklyStats: {
    totalKgs: number;
    totalEarnings: number;
  };
}

interface Employee {
  id: number;
  name: string;
}

interface DailyWorkEntry {
  kgs_cleaned: number;
  earnings: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    totalKgsToday: 0,
    totalEarningsToday: 0,
    weeklyStats: {
      totalKgs: 0,
      totalEarnings: 0
    }
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dailyWorkData, setDailyWorkData] = useState<{
    [employeeId: number]: DailyWorkEntry
  }>({});
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isSavingWork, setIsSavingWork] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);

  const { theme } = useTheme();

  useEffect(() => {
    fetchDashboardStats();
    fetchEmployees();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setIsLoadingStats(true);
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Set default values in case of error
      setStats({
        totalEmployees: 0,
        totalKgsToday: 0,
        totalEarningsToday: 0,
        weeklyStats: {
          totalKgs: 0,
          totalEarnings: 0
        }
      });
    } finally {
      setIsLoadingStats(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      setIsLoadingEmployees(true);
      const response = await fetch('/api/employees');
      const data = await response.json();
      setEmployees(data);
      // Initialize dailyWorkData with default values for each employee
      const initialDailyWorkData: {
        [employeeId: number]: DailyWorkEntry
      } = {};
      data.forEach((employee: Employee) => {
        initialDailyWorkData[employee.id] = {
          kgs_cleaned: 0,
          earnings: 0
        };
      });
      setDailyWorkData(initialDailyWorkData);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const handleWorkInputChange = (employeeId: number, field: keyof DailyWorkEntry, value: string) => {
    setDailyWorkData(prevData => ({
      ...prevData,
      [employeeId]: {
        ...prevData[employeeId],
        [field]: parseFloat(value) || 0,
      },
    }));
  };

  const handleSaveDailyWork = async () => {
    try {
      setIsSavingWork(true);
      const today = new Date().toISOString().split('T')[0];
      const entriesToSave = Object.keys(dailyWorkData)
        .filter(employeeId => dailyWorkData[parseInt(employeeId)].kgs_cleaned > 0 || dailyWorkData[parseInt(employeeId)].earnings > 0)
        .map(employeeId => ({
          employee_id: parseInt(employeeId),
          date: today,
          kgs_cleaned: dailyWorkData[parseInt(employeeId)].kgs_cleaned,
          earnings: dailyWorkData[parseInt(employeeId)].earnings,
        }));

      if (entriesToSave.length === 0) {
        alert('No work details to save.');
        return;
      }

      // Send each entry individually for simplicity, can be optimized for batch saving
      for (const entry of entriesToSave) {
        const response = await fetch('/api/daily-work', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(entry),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to save daily work entry');
        }
      }

      alert('Daily work details saved successfully!');
      // Refresh stats and employees after saving
      fetchDashboardStats();
      fetchEmployees();

    } catch (error: any) {
      console.error('Error saving daily work:', error);
      alert(`Error saving daily work: ${error.message}`);
    } finally {
      setIsSavingWork(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!newEmployeeName.trim()) {
      alert('Employee name cannot be empty.');
      return;
    }

    try {
      setIsAddingEmployee(true);
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newEmployeeName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add employee');
      }

      alert('Employee added successfully!');
      setNewEmployeeName('');
      fetchEmployees(); // Refresh employee list
    } catch (error: any) {
      console.error('Error adding employee:', error);
      alert(`Error adding employee: ${error.message}`);
    } finally {
      setIsAddingEmployee(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Raisin Tracker Dashboard</h1>
        <ThemeToggle />
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="transform transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Total Raisins Cleaned (Today)</h3>
            <p className="text-3xl font-bold text-primary">
              {isLoadingStats ? 'Loading...' : `${stats.totalKgsToday.toFixed(2)} kgs`}
            </p>
          </CardContent>
        </Card>

        <Card className="transform transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Total Salary Paid (Today)</h3>
            <p className="text-3xl font-bold text-primary">
              {isLoadingStats ? 'Loading...' : `₹${stats.totalEarningsToday.toFixed(2)}`}
            </p>
          </CardContent>
        </Card>

        <Card className="transform transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Total Workers</h3>
            <p className="text-3xl font-bold text-primary">
              {isLoadingStats ? 'Loading...' : stats.totalEmployees}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Summary */}
      <div className="mt-8 mb-8">
        <h2 className="text-2xl font-bold mb-4">Weekly Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="transform transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-2">Total Raisins Cleaned (This Week)</h3>
              <p className="text-3xl font-bold text-primary">
                {isLoadingStats ? 'Loading...' : `${stats.weeklyStats.totalKgs.toFixed(2)} kgs`}
              </p>
            </CardContent>
          </Card>

          <Card className="transform transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-2">Total Salary Paid (This Week)</h3>
              <p className="text-3xl font-bold text-primary">
                {isLoadingStats ? 'Loading...' : `₹${stats.weeklyStats.totalEarnings.toFixed(2)}`}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Enter Work Details */}
   

      {/* Add New Employee */}
      
    </div>
  );
}
