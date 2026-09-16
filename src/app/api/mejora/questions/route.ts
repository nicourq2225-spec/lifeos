import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const questions = await prisma.journalQuestion.findMany({
      orderBy: { order: 'asc' },
    });
    return NextResponse.json(questions);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching questions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { text, order } = await request.json();
    const question = await prisma.journalQuestion.create({
      data: { text, order: order || 0 },
    });
    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error creating question' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, text, order, active } = await request.json();
    const question = await prisma.journalQuestion.update({
      where: { id: parseInt(id) },
      data: { text, order, active },
    });
    return NextResponse.json(question);
  } catch (error) {
    return NextResponse.json({ error: 'Error updating question' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'No ID' }, { status: 400 });

    await prisma.journalQuestion.delete({
      where: { id: parseInt(id) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting question' }, { status: 500 });
  }
}
