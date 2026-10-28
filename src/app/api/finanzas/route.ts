import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // formato MM
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
      orderBy: [
        { date: 'desc' },
        { id: 'desc' }
      ]
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
    const { amount, date, dateStr, type, categoryId, description, banco, cuotas } = body;

    const totalCuotas = Math.max(1, parseInt(String(cuotas ?? 1), 10) || 1);
    const totalAmount = parseFloat(String(amount));
    const parsedCategoryId = parseInt(String(categoryId), 10);

    if (isNaN(totalAmount) || totalAmount <= 0 || isNaN(parsedCategoryId)) {
      return NextResponse.json(
        { error: 'Monto y categoría válidos son obligatorios' },
        { status: 400 }
      );
    }

    // Extraer año, mes y día exactos sin desfase de zona horaria
    const rawDateStr =
      typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
        ? dateStr
        : typeof date === 'string'
          ? date.split('T')[0]
          : new Date().toISOString().split('T')[0];

    const [year, month, day] = rawDateStr.split('-').map(Number);

    if (totalCuotas === 1) {
      const singleDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      const transaction = await prisma.transaction.create({
        data: {
          amount: Math.round(totalAmount),
          date: singleDate,
          type,
          categoryId: parsedCategoryId,
          description: description || null,
          banco,
          cuotas: 1,
          cuotaActual: 1
        }
      });

      return NextResponse.json(transaction, { status: 201 });
    }

    // Si cuotas > 1: dividir el monto total entre la cantidad de cuotas
    // Cuota 1 en la fecha seleccionada; Cuotas 2..N el día 1 de los meses sucesivos
    const installmentAmount = Math.round(totalAmount / totalCuotas);

    const operations = Array.from({ length: totalCuotas }, (_, index) => {
      const txDate =
        index === 0
          ? new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
          : new Date(Date.UTC(year, month - 1 + index, 1, 12, 0, 0));

      return prisma.transaction.create({
        data: {
          amount: installmentAmount,
          date: txDate,
          type,
          categoryId: parsedCategoryId,
          description: description || null,
          banco,
          cuotas: totalCuotas,
          cuotaActual: index + 1
        }
      });
    });

    const createdTransactions = await prisma.$transaction(operations);

    return NextResponse.json(createdTransactions[0], { status: 201 });
  } catch (error) {
    console.error("CREATE TRANSACTION ERROR:", error);
    return NextResponse.json({ error: 'Error creating transaction' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, amount, date, dateStr, type, categoryId, description, banco, cuotas } = body;

    const parsedCuotas =
      cuotas !== undefined
        ? Math.max(1, parseInt(String(cuotas), 10) || 1)
        : undefined;

    let parsedDate: Date | undefined;
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split('-').map(Number);
      parsedDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    } else if (date) {
      parsedDate = new Date(date);
    }

    const transaction = await prisma.transaction.update({
      where: { id: parseInt(String(id), 10) },
      data: {
        amount: Math.round(parseFloat(String(amount))),
        ...(parsedDate ? { date: parsedDate } : {}),
        type,
        categoryId: parseInt(String(categoryId), 10),
        description: description || null,
        banco,
        ...(parsedCuotas !== undefined ? { cuotas: parsedCuotas } : {})
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
