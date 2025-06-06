import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const employees = db.prepare('SELECT * FROM employees ORDER BY name').all();
    return NextResponse.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const result = db.prepare('INSERT INTO employees (name) VALUES (?)').run(name);
    
    return NextResponse.json({
      id: result.lastInsertRowid,
      name,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    );
  }
} 