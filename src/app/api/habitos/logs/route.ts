import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { habitId, date, status } = await request.json();
    const log = await prisma.habitLog.create({
      data: {
        habitId: parseInt(habitId),
        date: new Date(date),
        status
      }
    });
    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error creating habit log' }, { status: 500 });
  }
}
