'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTheme } from 'next-themes';

interface Employee {
  id: number;
  name: string;
}

interface DailyWorkEntry {
  id?: number; // Optional, as it might not exist for new entries
  employee_id: number;
  date: string;
  kgs_cleaned: number;
  earnings: number;
}

export default function DailyEntryPage() { // Renamed component for clarity
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dailyWorkData, setDailyWorkData] = useState<{
    [employeeId: number]: DailyWorkEntry
  }>({});
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isSavingWork, setIsSavingWork] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // State for date picker
  const [dailyEntries, setDailyEntries] = useState<DailyWorkEntry[]>([]); // State for fetched daily entries

  const { theme } = useTheme();

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchDailyWork(selectedDate); // Fetch daily work when date changes or on initial load
  }, [selectedDate, employees]); // Depend on selectedDate and employees

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
          employee_id: employee.id, // Include employee_id
          date: selectedDate, // Use selectedDate
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

  const fetchDailyWork = async (date: string) => {
    if (employees.length === 0) return; // Only fetch if employees are loaded
    try {
      // No separate loading state here to avoid flickering, will use isLoadingEmployees
      const response = await fetch(`/api/daily-work?date=${date}`);
      const data: DailyWorkEntry[] = await response.json();
      setDailyEntries(data);

      // Update dailyWorkData with fetched entries
      const updatedDailyWorkData: {
        [employeeId: number]: DailyWorkEntry
      } = {};
      // Start with current employees and default values
      employees.forEach(employee => {
        updatedDailyWorkData[employee.id] = {
          employee_id: employee.id,
          date: date,
          kgs_cleaned: 0,
          earnings: 0
        };
      });

      // Overlay with fetched data
      data.forEach(entry => {
        updatedDailyWorkData[entry.employee_id] = entry;
      });

      setDailyWorkData(updatedDailyWorkData);

    } catch (error) {
      console.error('Error fetching daily work:', error);
      setDailyEntries([]); // Clear entries on error
      // Reset dailyWorkData to defaults if fetching work fails
      const initialDailyWorkData: {
        [employeeId: number]: DailyWorkEntry
      } = {};
      employees.forEach((employee: Employee) => {
        initialDailyWorkData[employee.id] = {
          employee_id: employee.id,
          date: selectedDate,
          kgs_cleaned: 0,
          earnings: 0
        };
      });
      setDailyWorkData(initialDailyWorkData);
    }
  };


  const handleWorkInputChange = (employeeId: number, field: keyof DailyWorkEntry, value: string) => {
    setDailyWorkData(prevData => {
      const updatedEntry = {
        ...prevData[employeeId],
        [field]: parseFloat(value) || 0,
        date: selectedDate, // Ensure date is set correctly
        employee_id: employeeId, // Ensure employee_id is set
      };

      // Automatic earning calculation (3 rupees per kg)
      if (field === 'kgs_cleaned') {
        updatedEntry.earnings = (parseFloat(value) || 0) * 3;
      }

      return {
        ...prevData,
        [employeeId]: updatedEntry,
      };
    });
  };

  const handleSaveDailyWork = async () => {
    try {
      setIsSavingWork(true);
      const entriesToSave: DailyWorkEntry[] = Object.values(dailyWorkData).filter(entry => {
        // Only save entries that have non-zero kgs_cleaned or earnings, and ensure they have an employee_id
        return entry.employee_id !== undefined && (entry.kgs_cleaned > 0 || entry.earnings > 0);
      });


      if (entriesToSave.length === 0) {
        alert('No work details to save.');
        return;
      }

      // Filter out entries that haven't changed from the initially fetched data
      const changedEntries = entriesToSave.filter(entry => {
        const initialEntry = dailyEntries.find(de => de.employee_id === entry.employee_id);
        // If no initial entry, it's a new entry, so include it
        if (!initialEntry) return true;
        // If kgs_cleaned or earnings have changed, include it
        return initialEntry.kgs_cleaned !== entry.kgs_cleaned || initialEntry.earnings !== entry.earnings;
      });

      if (changedEntries.length === 0) {
         alert('No changes to save.');
         return;
      }


      // Send each changed entry individually.
      // Note: The current backend POST endpoint only supports inserting new entries.
      // If an entry for the same employee and date already exists, this might fail
      // or create a duplicate depending on your database schema constraints.
      // A more robust solution would require a backend endpoint that supports UPSERT
      // or separate PUT/PATCH for updates.
      for (const entry of changedEntries) {
        const response = await fetch('/api/daily-work', {
          method: 'POST', // Assuming POST handles new entries
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(entry),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('Failed to save entry:', entry, 'Error:', error);
          throw new Error(error.error || `Failed to save entry for employee ${entry.employee_id}`);
        }
      }

      alert('Daily work details saved successfully!');
      // Refresh daily work entries after saving
      fetchDailyWork(selectedDate);


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
      fetchEmployees(); // Refresh employee list and dailyWorkData initialization
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
        {/* Page Title - Can be changed depending on where this page is used */}
        <h1 className="text-3xl font-bold">Daily Work Entry</h1>
        <ThemeToggle />
      </div>

      {/* Enter Work Details */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-4">Enter Work Details</h2>
          {/* Date Picker */}
          <div className="mb-4">
            <label htmlFor="workDate" className="block text-sm font-medium text-gray-700">Select Date:</label>
            <input
              type="date"
              id="workDate"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="mt-1 block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>


          {isLoadingEmployees ? (
            <div>Loading employees...</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 font-semibold">
                <div>Employee</div>
                <div>KGs Cleaned</div>
                <div>Earnings (₹)</div>
              </div>
              {employees.map(employee => (
                <div key={employee.id} className="grid grid-cols-3 gap-4 items-center">
                  <div>{employee.name}</div>
                  <input
                    type="number"
                    step="0.01"
                    value={dailyWorkData[employee.id]?.kgs_cleaned ?? ''} // Use nullish coalescing
                    onChange={e => handleWorkInputChange(employee.id, 'kgs_cleaned', e.target.value)}
                    className="border rounded px-2 py-1"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={dailyWorkData[employee.id]?.earnings ?? ''} // Use nullish coalescing
                    onChange={e => handleWorkInputChange(employee.id, 'earnings', e.target.value)}
                    className="border rounded px-2 py-1 bg-gray-100 cursor-not-allowed" // Indicate automatic calculation
                    disabled // Disable manual earning input
                  />
                </div>
              ))}
              <button
                onClick={handleSaveDailyWork}
                disabled={isSavingWork}
                className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50 mt-4"
              >
                {isSavingWork ? 'Saving...' : 'Save Daily Work'}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add New Employee */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-4">Add New Employee</h2>
          <div className="flex space-x-4">
            <input
              type="text"
              placeholder="Employee Name"
              value={newEmployeeName}
              onChange={e => setNewEmployeeName(e.target.value)}
              className="border rounded px-2 py-1 flex-grow"
            />
            <button
              onClick={handleAddEmployee}
              disabled={isAddingEmployee}
              className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {isAddingEmployee ? 'Adding...' : 'Add Employee'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 