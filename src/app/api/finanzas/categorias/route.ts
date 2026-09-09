import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { name, type, parentName } = await request.json();
    const category = await prisma.category.create({
      data: { name, type, parentName }
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error creating category' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, type, parentName } = await request.json();
    const category = await prisma.category.update({
      where: { id: parseInt(id) },
      data: { name, type, parentName }
    });
    return NextResponse.json(category);
  } catch (error) {
    return NextResponse.json({ error: 'Error updating category' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'No ID' }, { status: 400 });

    await prisma.transaction.deleteMany({
      where: { categoryId: parseInt(id) }
    });
    
    await prisma.category.delete({
      where: { id: parseInt(id) }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting category' }, { status: 500 });
  }
}
