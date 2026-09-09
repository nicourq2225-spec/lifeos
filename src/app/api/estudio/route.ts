import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const tasks = await prisma.studyTask.findMany({
      orderBy: { date: 'asc' }
    });
    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching study tasks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { date, subject } = await request.json();
    const task = await prisma.studyTask.create({
      data: {
        date: new Date(date),
        subject,
        completed: false
      }
    });
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error creating study task' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, completed, date, subject } = await request.json();
    
    let updateData: any = { completed };
    if (date) updateData.date = new Date(date);
    if (subject) updateData.subject = subject;

    const task = await prisma.studyTask.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    return NextResponse.json(task);
  } catch (error) {
    return NextResponse.json({ error: 'Error updating study task' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'No ID provided' }, { status: 400 });

    await prisma.studyTask.delete({
      where: { id: parseInt(id) }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting study task' }, { status: 500 });
  }
}
