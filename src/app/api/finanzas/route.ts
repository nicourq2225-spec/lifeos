import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // formato YYYY-MM
  const year = searchParams.get('year');

  let dateFilter = {};
  if (month && year) {
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 1);
    dateFilter = {
      date: {
        gte: startDate,
        lt: endDate
      }
    };
  }

  try {
    const transactions = await prisma.transaction.findMany({
      where: dateFilter,
      include: {
        category: true
      },
      orderBy: {
        date: 'desc'
      }
    });

    const categories = await prisma.category.findMany();

    // Cálculos
    const ingresos = transactions.filter(t => t.type === 'INGRESO').reduce((a, b) => a + b.amount, 0);
    const gastosNecesarios = transactions.filter(t => t.type === 'GASTO_NECESARIO').reduce((a, b) => a + b.amount, 0);
    const gastosInnecesarios = transactions.filter(t => t.type === 'GASTO_INNECESARIO').reduce((a, b) => a + b.amount, 0);
    const totalGastos = gastosNecesarios + gastosInnecesarios;
    const restante = ingresos - totalGastos;

    return NextResponse.json({
      transactions,
      categories,
      indicators: {
        ingresos,
        gastosNecesarios,
        gastosInnecesarios,
        totalGastos,
        restante
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, date, type, categoryId, description, banco } = body;

    const transaction = await prisma.transaction.create({
      data: {
        amount: Math.round(parseFloat(amount)),
        date: new Date(date),
        type,
        categoryId: parseInt(categoryId),
        description: description || null,
        banco
      }
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("CREATE TRANSACTION ERROR:", error);
    return NextResponse.json({ error: 'Error creating transaction' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, amount, date, type, categoryId, description, banco } = body;

    const transaction = await prisma.transaction.update({
      where: { id: parseInt(id) },
      data: {
        amount: Math.round(parseFloat(amount)),
        date: new Date(date),
        type,
        categoryId: parseInt(categoryId),
        description,
        banco
      }
    });

    return NextResponse.json(transaction);
  } catch (error) {
    return NextResponse.json({ error: 'Error updating transaction' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'No ID' }, { status: 400 });

    await prisma.transaction.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting transaction' }, { status: 500 });
  }
}
