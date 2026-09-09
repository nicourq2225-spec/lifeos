import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureHabitsForToday } from '@/lib/lazyInit';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date'); // YYYY-MM-DD
  
  const targetDateStr = dateStr || new Date().toLocaleDateString('en-CA');
  const [y, m, d] = targetDateStr.split('-');
  const today = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Lazy init habits
  await ensureHabitsForToday(targetDateStr);

  try {
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
    const dateToUseStr = settings?.cycleStartDate ? settings.cycleStartDate.toISOString().split('T')[0] : "2026-01-19";
    const [sy, sm, sd] = dateToUseStr.split('-');
    const start = new Date(parseInt(sy), parseInt(sm) - 1, parseInt(sd));
    
    const diffTime = today.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const dayNumber = diffDays >= 0 ? (diffDays % 21) + 1 : ((21 + (diffDays % 21)) % 21) + 1;

    const todaysEvents = await prisma.agendaEvent.findMany({
      where: { dayNumber }
    });

    return NextResponse.json({
      todaysExpenses,
      savings,
      savingsGoal: settings?.savingGoal || 0,
      todaysHabitLogs,
      studyTask,
      dayNumber,
      todaysEvents
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching dashboard data' }, { status: 500 });
  }
}
