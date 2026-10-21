import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureHabitsForToday } from '@/lib/lazyInit';
import { calculateCycleAndWeek, ensureAgendaDefaults, getArgentinaDateStr } from '@/lib/agendaDefaults';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date'); // YYYY-MM-DD
  
  const targetDateStr = dateStr || getArgentinaDateStr();
  const [y, m, d] = targetDateStr.split('-');
  const today = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  try {
    await Promise.all([
      ensureHabitsForToday(targetDateStr),
      ensureAgendaDefaults()
    ]);

    // 1. Finanzas del día
    const todaysTransactions = await prisma.transaction.findMany({
      where: { date: { gte: today, lt: tomorrow } }
    });
    const todaysExpenses = todaysTransactions.filter(t => t.type !== 'INGRESO').reduce((a, b) => a + b.amount, 0);

    const allTransactions = await prisma.transaction.findMany();
    const totalIncome = allTransactions.filter(t => t.type === 'INGRESO').reduce((a, b) => a + b.amount, 0);
    const totalExpense = allTransactions.filter(t => t.type !== 'INGRESO').reduce((a, b) => a + b.amount, 0);
    const savings = totalIncome - totalExpense;

    const settings = await prisma.settings.findFirst();

    // 2. Hábitos
    const todaysHabitLogs = await prisma.habitLog.findMany({
      where: { date: { gte: today, lt: tomorrow } },
      include: { habit: true }
    });

    // 3. Estudio
    const studyTask = await prisma.studyTask.findFirst({
      where: { date: { gte: today, lt: tomorrow } }
    });

    // 4. Agenda
    const cycleInfo = calculateCycleAndWeek(settings?.cycleStartDate, targetDateStr);
    const dayNumber = cycleInfo.currentCycleDay;

    const [todaysEvents, allRules] = await Promise.all([
      prisma.agendaEvent.findMany({
        where: { dayNumber },
        include: { punishment: true }
      }),
      prisma.dayRule.findMany({
        where: { active: true },
        orderBy: { id: 'asc' }
      })
    ]);

    const todaysRules = allRules.filter(r => {
      if (r.applyToAllDays) return true;
      const days = (r.assignedDays || '').split(',').map(s => parseInt(s.trim(), 10));
      return days.includes(dayNumber);
    });

    return NextResponse.json({
      todaysExpenses,
      savings,
      savingsGoal: settings?.savingGoal || 0,
      todaysHabitLogs,
      studyTask,
      dayNumber,
      cycleInfo,
      todaysEvents,
      todaysRules
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Error fetching dashboard data' }, { status: 500 });
  }
}
