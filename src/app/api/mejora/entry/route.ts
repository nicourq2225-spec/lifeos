import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date');

  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: 'Invalid or missing date' }, { status: 400 });
  }

  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const startUtc = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    const endUtc = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));

    const entry = await prisma.journalEntry.findFirst({
      where: {
        date: {
          gte: startUtc,
          lte: endUtc,
        },
      },
      include: {
        answers: true,
      },
    });

    return NextResponse.json(entry || null);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching entry' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { date, note, answers } = await request.json();
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    const [y, m, d] = date.split('-').map(Number);
    const startUtc = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    const endUtc = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
    const safeDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

    // Reemplazar entrada existente de ese día calendario sin desfase horario
    await prisma.journalEntry.deleteMany({
      where: {
        date: {
          gte: startUtc,
          lte: endUtc,
        },
      },
    });

    const entry = await prisma.journalEntry.create({
      data: {
        date: safeDate,
        note: note ?? '',
        answers: {
          create: (answers || []).map((ans: { questionId: number | string; answerText: string }) => ({
            questionId: parseInt(String(ans.questionId), 10),
            answerText: String(ans.answerText ?? ''),
          })),
        },
      },
      include: { answers: true },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error saving entry' }, { status: 500 });
  }
}
