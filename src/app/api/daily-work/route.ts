import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const work = db.prepare(`
      SELECT dw.*, e.name as employee_name
      FROM daily_work dw
      JOIN employees e ON dw.employee_id = e.id
      WHERE dw.date = ?
      ORDER BY e.name
    `).all(date);

    return NextResponse.json(work);
  } catch (error) {
    console.error('Error fetching daily work:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily work' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { employee_id, date, kgs_cleaned, earnings } = await request.json();

    if (!employee_id || !date || !kgs_cleaned || !earnings) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const result = db.prepare(`
      INSERT INTO daily_work (employee_id, date, kgs_cleaned, earnings)
      VALUES (?, ?, ?, ?)
    `).run(employee_id, date, kgs_cleaned, earnings);

    return NextResponse.json({
      id: result.lastInsertRowid,
      employee_id,
      date,
      kgs_cleaned,
      earnings,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating daily work entry:', error);
    return NextResponse.json(
      { error: 'Failed to create daily work entry' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { id, kgs_cleaned, earnings } = await request.json();

    if (!id || !kgs_cleaned || !earnings) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const result = db.prepare(`
      UPDATE daily_work
      SET kgs_cleaned = ?, earnings = ?
      WHERE id = ?
    `).run(kgs_cleaned, earnings, id);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'No entry found with the provided ID' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id,
      kgs_cleaned,
      earnings,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating daily work entry:', error);
    return NextResponse.json(
      { error: 'Failed to update daily work entry' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    const result = db.prepare(`
      DELETE FROM daily_work
      WHERE id = ?
    `).run(id);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'No entry found with the provided ID' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id,
      deleted_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting daily work entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete daily work entry' },
      { status: 500 }
    );
  }
}