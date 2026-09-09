import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Calcular totales históricos
    const transactions = await prisma.transaction.findMany();
    const totalIngresos = transactions.filter(t => t.type === 'INGRESO').reduce((a, b) => a + b.amount, 0);
    const totalGastos = transactions.filter(t => t.type !== 'INGRESO').reduce((a, b) => a + b.amount, 0);
    const balanceHistorico = totalIngresos - totalGastos;

    const settings = await prisma.settings.findFirst();
    const savingGoal = settings?.savingGoal || 0;

    return NextResponse.json({
      totalIngresos,
      totalGastos,
      balanceHistorico,
      savingGoal
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching ahorro data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { savingGoal } = await request.json();
    
    let settings = await prisma.settings.findFirst();
    if (settings) {
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: { savingGoal: parseInt(savingGoal) }
      });
    } else {
      settings = await prisma.settings.create({
        data: { savingGoal: parseInt(savingGoal) }
      });
    }

    return NextResponse.json({ success: true, savingGoal: settings.savingGoal });
  } catch (error) {
    return NextResponse.json({ error: 'Error updating saving goal' }, { status: 500 });
  }
}
