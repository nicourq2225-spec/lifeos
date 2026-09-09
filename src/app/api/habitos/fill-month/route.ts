import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { monthStr } = await request.json(); // YYYY-MM
    const [y, m] = monthStr.split('-');
    const year = parseInt(y);
    const month = parseInt(m) - 1;
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const allHabits = await prisma.habit.findMany();
    if (allHabits.length === 0) return NextResponse.json({ success: true });

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);

    const existingLogs = await prisma.habitLog.findMany({
      where: { date: { gte: startDate, lt: endDate } }
    });

    const logsToCreate = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const targetDate = new Date(year, month, day, 12, 0, 0); // NOON local
      
      const logsForDay = existingLogs.filter(l => {
        const d = new Date(l.date);
        return d.getDate() === day;
      });
      
      const existingHabitIds = new Set(logsForDay.map(l => l.habitId));
      const missingHabits = allHabits.filter(h => !existingHabitIds.has(h.id));

      for (const h of missingHabits) {
        logsToCreate.push({
          habitId: h.id,
          status: "DESCANSO",
          date: targetDate
        });
      }
    }

    if (logsToCreate.length > 0) {
      await prisma.habitLog.createMany({
        data: logsToCreate
      });
    }

    return NextResponse.json({ success: true, created: logsToCreate.length });
  } catch (error) {
    console.error("Fill Month Error:", error);
    return NextResponse.json({ error: 'Error filling month' }, { status: 500 });
  }
}
