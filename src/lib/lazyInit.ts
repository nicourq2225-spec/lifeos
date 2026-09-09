import { prisma } from "./prisma";

export async function ensureHabitsForToday(dateStr?: string) {
  // dateStr expected in "YYYY-MM-DD"
  const targetDateStr = dateStr || new Date().toLocaleDateString('en-CA'); // 'en-CA' outputs YYYY-MM-DD locally
  const [y, m, d] = targetDateStr.split('-');
  
  // Usar las 12:00 (mediodía) para evitar que conversiones UTC desplacen la fecha 
  // al día anterior.
  const targetDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), 12, 0, 0);

  // Buscamos si hay logs para este día. Usamos un rango para estar seguros (gte/lt)
  const startOfDay = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const existingLogs = await prisma.habitLog.findMany({
    where: { 
      date: { gte: startOfDay, lt: endOfDay } 
    }
  });

  const allHabits = await prisma.habit.findMany();
  const existingHabitIds = new Set(existingLogs.map(l => l.habitId));
  const missingHabits = allHabits.filter(h => !existingHabitIds.has(h.id));

  if (missingHabits.length > 0) {
    const defaultLogs = missingHabits.map(habit => ({
      habitId: habit.id,
      status: "DESCANSO",
      date: targetDate
    }));

    await prisma.habitLog.createMany({
      data: defaultLogs
    });
  }
}
