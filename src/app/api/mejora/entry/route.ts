import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date');

  if (!dateStr) return NextResponse.json({ error: 'No date provided' }, { status: 400 });

  try {
    const [y, m, d] = dateStr.split('-');
    const safeDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), 12, 0, 0);

    const entry = await prisma.journalEntry.findUnique({
      where: { date: safeDate },
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
    const [y, m, d] = date.split('-');
    const safeDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), 12, 0, 0);

    // Delete existing entry for this date if it exists to replace it entirely
    const existing = await prisma.journalEntry.findUnique({ where: { date: safeDate } });
    if (existing) {
      await prisma.journalEntry.delete({ where: { id: existing.id } });
    }

    const entry = await prisma.journalEntry.create({
      data: {
        date: safeDate,
        note,
        answers: {
          create: answers.map((ans: any) => ({
            questionId: parseInt(ans.questionId),
            answerText: ans.answerText,
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
