import { NextResponse } from 'next/server';
import db from '@/lib/db';

interface Stats {
  count: number;
}

interface DailyStats {
  total: number;
}

interface WeeklyStats {
  total_kgs: number;
  total_earnings: number;
}

export async function GET() {
  try {
    // Get total employees
    const totalEmployees = (db.prepare('SELECT COUNT(*) as count FROM employees').get() as Stats).count;

    // Get total kgs cleaned today
    const today = new Date().toISOString().split('T')[0];
    const totalKgsToday = (db.prepare(`
      SELECT COALESCE(SUM(kgs_cleaned), 0) as total 
      FROM daily_work 
      WHERE date = ?
    `).get(today) as DailyStats).total;

    // Get total earnings today
    const totalEarningsToday = (db.prepare(`
      SELECT COALESCE(SUM(earnings), 0) as total 
      FROM daily_work 
      WHERE date = ?
    `).get(today) as DailyStats).total;

    // Get weekly stats
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const weeklyStats = db.prepare(`
      SELECT 
        COALESCE(SUM(kgs_cleaned), 0) as total_kgs,
        COALESCE(SUM(earnings), 0) as total_earnings
      FROM daily_work 
      WHERE date >= ?
    `).get(weekStartStr) as WeeklyStats;

    return NextResponse.json({
      totalEmployees,
      totalKgsToday,
      totalEarningsToday,
      weeklyStats: {
        totalKgs: weeklyStats.total_kgs,
        totalEarnings: weeklyStats.total_earnings
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
} 