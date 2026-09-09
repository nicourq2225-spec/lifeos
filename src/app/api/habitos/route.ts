import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureHabitsForToday } from '@/lib/lazyInit';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // YYYY-MM

  try {
    // Si no mandan mes o es el mes actual, asegurarse que los logs de hoy existan
    const today = new Date();
    const todayMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    if (!month || month === todayMonth) {
      await ensureHabitsForToday();
    }

    let dateFilter = {};
    if (month) {
      const [y, m] = month.split('-');
      const startDate = new Date(parseInt(y), parseInt(m) - 1, 1);
      const endDate = new Date(parseInt(y), parseInt(m), 1);
      dateFilter = {
        date: {
          gte: startDate,
          lt: endDate
        }
      };
    }

    // Obtener grupos y hábitos
    const groups = await prisma.habitGroup.findMany({
      include: {
        habits: true
      }
    });

    // Obtener logs del mes
    const logs = await prisma.habitLog.findMany({
      where: dateFilter,
      orderBy: { date: 'asc' }
    });

    return NextResponse.json({ groups, logs });
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching habits' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { logId, status } = body;

    const updatedLog = await prisma.habitLog.update({
      where: { id: parseInt(logId) },
      data: { status }
    });

    return NextResponse.json(updatedLog);
  } catch (error) {
    return NextResponse.json({ error: 'Error updating habit' }, { status: 500 });
  }
}
