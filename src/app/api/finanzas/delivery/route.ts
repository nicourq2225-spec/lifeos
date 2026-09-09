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
    const sessions = await prisma.deliverySession.findMany({
      where: dateFilter,
      orderBy: {
        date: 'desc'
      }
    });

    const historicalAggregate = await prisma.deliverySession.aggregate({
      _sum: { earnings: true }
    });

    return NextResponse.json({
      sessions,
      historicalEarnings: historicalAggregate._sum.earnings || 0
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching delivery sessions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { date, startTime, endTime, hours, earnings, orders } = await request.json();
    const [y, m, d] = date.split('-');
    const safeDate = new Date(parseInt(y), parseInt(m)-1, parseInt(d), 12, 0, 0);

    const session = await prisma.deliverySession.create({
      data: {
        date: safeDate,
        startTime: startTime || null,
        endTime: endTime || null,
        hours: hours ? parseFloat(hours) : null,
        earnings: earnings ? parseInt(earnings) : null,
        orders: orders ? parseInt(orders) : null
      }
    });
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error creating session' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, date, startTime, endTime, hours, earnings, orders } = await request.json();
    const [y, m, d] = date.split('-');
    const safeDate = new Date(parseInt(y), parseInt(m)-1, parseInt(d), 12, 0, 0);

    const session = await prisma.deliverySession.update({
      where: { id: parseInt(id) },
      data: {
        date: safeDate,
        startTime: startTime || null,
        endTime: endTime || null,
        hours: hours ? parseFloat(hours) : null,
        earnings: earnings ? parseInt(earnings) : null,
        orders: orders ? parseInt(orders) : null
      }
    });
    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json({ error: 'Error updating session' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'No ID' }, { status: 400 });

    await prisma.deliverySession.delete({
      where: { id: parseInt(id) }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting session' }, { status: 500 });
  }
}
