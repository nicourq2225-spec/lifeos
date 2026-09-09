import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seeding de categorías...');

  const categories = [
    // Ingresos
    { name: 'Trabajo', type: 'INGRESO', parentName: null },
    { name: 'Delivery', type: 'INGRESO', parentName: null },
    { name: 'Otro negocio', type: 'INGRESO', parentName: null },
    
    // Gastos Necesarios - Vivienda
    { name: 'Alquiler', type: 'GASTO_NECESARIO', parentName: 'Vivienda' },
    { name: 'Impuestos', type: 'GASTO_NECESARIO', parentName: 'Vivienda' },
    { name: 'Wifi', type: 'GASTO_NECESARIO', parentName: 'Vivienda' },
    { name: 'Telefono', type: 'GASTO_NECESARIO', parentName: 'Vivienda' },
    { name: 'Limpieza', type: 'GASTO_NECESARIO', parentName: 'Vivienda' },
    { name: 'Ropa', type: 'GASTO_NECESARIO', parentName: 'Vivienda' },
    { name: 'Suscripciones', type: 'GASTO_NECESARIO', parentName: 'Vivienda' },
    { name: 'Farmacia', type: 'GASTO_NECESARIO', parentName: 'Vivienda' },
    
    // Gastos Necesarios - Alimentacion
    { name: 'Supermercado', type: 'GASTO_NECESARIO', parentName: 'Alimentacion' },
    { name: 'Verduleria', type: 'GASTO_NECESARIO', parentName: 'Alimentacion' },
    { name: 'Kiosco', type: 'GASTO_NECESARIO', parentName: 'Alimentacion' },
    { name: 'Panaderia', type: 'GASTO_NECESARIO', parentName: 'Alimentacion' },
    { name: 'Carniceria', type: 'GASTO_NECESARIO', parentName: 'Alimentacion' },
    
    // Gastos Necesarios - Servicios
    { name: 'Peluqueria', type: 'GASTO_NECESARIO', parentName: 'Servicios' },
    { name: 'Personal Trainer', type: 'GASTO_NECESARIO', parentName: 'Servicios' },
    { name: 'Psicologo', type: 'GASTO_NECESARIO', parentName: 'Servicios' },
    { name: 'Gimnasio', type: 'GASTO_NECESARIO', parentName: 'Servicios' },
    
    // Gastos Necesarios - Moto
    { name: 'Seguro Moto', type: 'GASTO_NECESARIO', parentName: 'Moto' },
    { name: 'Nafta', type: 'GASTO_NECESARIO', parentName: 'Moto' },
    { name: 'Repuestos', type: 'GASTO_NECESARIO', parentName: 'Moto' },
    
    // Gastos Necesarios - Estudio
    { name: 'Libreria', type: 'GASTO_NECESARIO', parentName: 'Estudio' },
    { name: 'Cuota TUP', type: 'GASTO_NECESARIO', parentName: 'Estudio' },
    
    // Gastos Innecesarios - Entretenimiento
    { name: 'Fiesta', type: 'GASTO_INNECESARIO', parentName: 'Entretenimiento' },
    { name: 'Mujeres', type: 'GASTO_INNECESARIO', parentName: 'Entretenimiento' },
    { name: 'Cine', type: 'GASTO_INNECESARIO', parentName: 'Entretenimiento' },
    { name: 'Comer Afuera', type: 'GASTO_INNECESARIO', parentName: 'Entretenimiento' },
    
    // Gastos Innecesarios - Consumo
    { name: 'Compras', type: 'GASTO_INNECESARIO', parentName: 'Consumo' },
    
    // Gastos Innecesarios - Vicios
    { name: 'Cigarrillos', type: 'GASTO_INNECESARIO', parentName: 'Vicios' },
    { name: 'Marihuana', type: 'GASTO_INNECESARIO', parentName: 'Vicios' },
    { name: 'Otras Drogas', type: 'GASTO_INNECESARIO', parentName: 'Vicios' },
    { name: 'Alcohol', type: 'GASTO_INNECESARIO', parentName: 'Vicios' },
    
    // Gastos Innecesarios - Logistica
    { name: 'Uber', type: 'GASTO_INNECESARIO', parentName: 'Logistica' },
    { name: 'Colectivo', type: 'GASTO_INNECESARIO', parentName: 'Logistica' },
    
    // Gastos Innecesarios - Otros
    { name: 'Desconocido', type: 'GASTO_INNECESARIO', parentName: 'Otros' },
    { name: 'Viaje', type: 'GASTO_INNECESARIO', parentName: 'Otros' },
    { name: 'Otro', type: 'GASTO_INNECESARIO', parentName: 'Otros' },
  ];

  for (const cat of categories) {
    await prisma.category.create({
      data: cat,
    });
  }

  // Grupos de hábitos iniciales
  console.log('Iniciando seeding de hábitos...');
  
  const salud = await prisma.habitGroup.create({
    data: { name: 'Salud' }
  });
  
  const disciplina = await prisma.habitGroup.create({
    data: { name: 'Disciplina' }
  });
  
  const estudio = await prisma.habitGroup.create({
    data: { name: 'Estudio' }
  });

  // Hábitos iniciales
  await prisma.habit.create({ data: { name: 'Gimnasio', groupId: salud.id } });
  await prisma.habit.create({ data: { name: 'Nutrición', groupId: salud.id } });
  
  await prisma.habit.create({ data: { name: 'Abstinencia', groupId: disciplina.id } });
  await prisma.habit.create({ data: { name: 'Auditoría', groupId: disciplina.id } });
  
  await prisma.habit.create({ data: { name: 'Estudio', groupId: estudio.id } });

  console.log('Seeding completado con éxito!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
