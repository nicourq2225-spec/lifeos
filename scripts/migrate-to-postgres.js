/**
 * Script de migración: SQLite local → PostgreSQL (Neon)
 * 
 * IMPORTANTE: Tu .env debe tener la DATABASE_URL apuntando a Neon (PostgreSQL)
 * antes de ejecutar este script.
 * 
 * Uso: node scripts/migrate-to-postgres.js
 */

const Database = require('better-sqlite3');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const sqlite = new Database(path.join(__dirname, '../prisma/dev.db'), { readonly: true });
const prisma = new PrismaClient();

async function migrate() {
  console.log('🚀 Iniciando migración SQLite → PostgreSQL...\n');

  // 1. Settings
  try {
    const settings = sqlite.prepare('SELECT * FROM "Settings"').all();
    console.log(`⚙️  Migrando ${settings.length} settings...`);
    for (const s of settings) {
      await prisma.settings.upsert({
        where: { id: s.id },
        update: { savingGoal: s.savingGoal, cycleStartDate: s.cycleStartDate ? new Date(s.cycleStartDate) : null },
        create: { id: s.id, savingGoal: s.savingGoal, cycleStartDate: s.cycleStartDate ? new Date(s.cycleStartDate) : null },
      });
    }
    console.log('   ✅ Settings OK');
  } catch (e) { console.log('   ⚠️  Settings:', e.message); }

  // 2. Categories
  try {
    const categories = sqlite.prepare('SELECT * FROM "Category"').all();
    console.log(`\n📂 Migrando ${categories.length} categorías...`);
    // Reset sequence and insert with original IDs
    await prisma.$executeRawUnsafe('TRUNCATE "Category" RESTART IDENTITY CASCADE');
    for (const cat of categories) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Category" (id, name, "parentName", type) VALUES ($1, $2, $3, $4)`,
        cat.id, cat.name, cat.parentName, cat.type
      );
    }
    // Sync sequence
    await prisma.$executeRawUnsafe(`SELECT setval('"Category_id_seq"', (SELECT MAX(id) FROM "Category"))`);
    console.log('   ✅ Categorías OK');
  } catch (e) { console.log('   ⚠️  Categorías:', e.message); }

  // 3. Transactions
  try {
    const transactions = sqlite.prepare('SELECT * FROM "Transaction"').all();
    console.log(`\n💸 Migrando ${transactions.length} transacciones...`);
    await prisma.$executeRawUnsafe('TRUNCATE "Transaction" RESTART IDENTITY CASCADE');
    for (const t of transactions) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Transaction" (id, amount, date, type, "categoryId", description, banco) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        t.id, t.amount, new Date(t.date), t.type, t.categoryId, t.description, t.banco
      );
    }
    await prisma.$executeRawUnsafe(`SELECT setval('"Transaction_id_seq"', COALESCE((SELECT MAX(id) FROM "Transaction"), 0))`);
    console.log('   ✅ Transacciones OK');
  } catch (e) { console.log('   ⚠️  Transacciones:', e.message); }

  // 4. DeliverySession
  try {
    const sessions = sqlite.prepare('SELECT * FROM "DeliverySession"').all();
    console.log(`\n🛵 Migrando ${sessions.length} turnos de delivery...`);
    await prisma.$executeRawUnsafe('TRUNCATE "DeliverySession" RESTART IDENTITY CASCADE');
    for (const s of sessions) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "DeliverySession" (id, date, "startTime", "endTime", hours, earnings, orders) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        s.id, new Date(s.date), s.startTime, s.endTime, s.hours, s.earnings, s.orders
      );
    }
    await prisma.$executeRawUnsafe(`SELECT setval('"DeliverySession_id_seq"', COALESCE((SELECT MAX(id) FROM "DeliverySession"), 0))`);
    console.log('   ✅ Delivery OK');
  } catch (e) { console.log('   ⚠️  Delivery:', e.message); }

  // 5. HabitGroups
  try {
    const groups = sqlite.prepare('SELECT * FROM "HabitGroup"').all();
    console.log(`\n🏃 Migrando ${groups.length} grupos de hábitos...`);
    await prisma.$executeRawUnsafe('TRUNCATE "HabitGroup" RESTART IDENTITY CASCADE');
    for (const g of groups) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "HabitGroup" (id, name) VALUES ($1, $2)`,
        g.id, g.name
      );
    }
    await prisma.$executeRawUnsafe(`SELECT setval('"HabitGroup_id_seq"', (SELECT MAX(id) FROM "HabitGroup"))`);
    console.log('   ✅ HabitGroups OK');
  } catch (e) { console.log('   ⚠️  HabitGroups:', e.message); }

  // 6. Habits
  try {
    const habits = sqlite.prepare('SELECT * FROM "Habit"').all();
    console.log(`\n✅ Migrando ${habits.length} hábitos...`);
    await prisma.$executeRawUnsafe('TRUNCATE "Habit" RESTART IDENTITY CASCADE');
    for (const h of habits) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Habit" (id, name, "groupId") VALUES ($1, $2, $3)`,
        h.id, h.name, h.groupId
      );
    }
    await prisma.$executeRawUnsafe(`SELECT setval('"Habit_id_seq"', (SELECT MAX(id) FROM "Habit"))`);
    console.log('   ✅ Hábitos OK');
  } catch (e) { console.log('   ⚠️  Hábitos:', e.message); }

  // 7. HabitLogs
  try {
    const logs = sqlite.prepare('SELECT * FROM "HabitLog"').all();
    console.log(`\n📅 Migrando ${logs.length} registros de hábitos...`);
    await prisma.$executeRawUnsafe('TRUNCATE "HabitLog" RESTART IDENTITY CASCADE');
    for (const l of logs) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "HabitLog" (id, "habitId", date, status) VALUES ($1, $2, $3, $4)`,
        l.id, l.habitId, new Date(l.date), l.status
      );
    }
    await prisma.$executeRawUnsafe(`SELECT setval('"HabitLog_id_seq"', COALESCE((SELECT MAX(id) FROM "HabitLog"), 0))`);
    console.log('   ✅ HabitLogs OK');
  } catch (e) { console.log('   ⚠️  HabitLogs:', e.message); }

  // 8. StudyTasks
  try {
    const tasks = sqlite.prepare('SELECT * FROM "StudyTask"').all();
    console.log(`\n📚 Migrando ${tasks.length} tareas de estudio...`);
    await prisma.$executeRawUnsafe('TRUNCATE "StudyTask" RESTART IDENTITY CASCADE');
    for (const t of tasks) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "StudyTask" (id, date, subject, completed) VALUES ($1, $2, $3, $4)`,
        t.id, new Date(t.date), t.subject, t.completed === 1
      );
    }
    await prisma.$executeRawUnsafe(`SELECT setval('"StudyTask_id_seq"', COALESCE((SELECT MAX(id) FROM "StudyTask"), 0))`);
    console.log('   ✅ StudyTasks OK');
  } catch (e) { console.log('   ⚠️  StudyTasks:', e.message); }

  // 9. AgendaEvents
  try {
    const events = sqlite.prepare('SELECT * FROM "AgendaEvent"').all();
    console.log(`\n📆 Migrando ${events.length} eventos de agenda...`);
    await prisma.$executeRawUnsafe('TRUNCATE "AgendaEvent" RESTART IDENTITY CASCADE');
    for (const e of events) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "AgendaEvent" (id, "dayNumber", "startTime", "endTime", title, type) VALUES ($1, $2, $3, $4, $5, $6)`,
        e.id, e.dayNumber, e.startTime, e.endTime, e.title, e.type
      );
    }
    await prisma.$executeRawUnsafe(`SELECT setval('"AgendaEvent_id_seq"', COALESCE((SELECT MAX(id) FROM "AgendaEvent"), 0))`);
    console.log('   ✅ AgendaEvents OK');
  } catch (e) { console.log('   ⚠️  AgendaEvents:', e.message); }

  await prisma.$disconnect();
  sqlite.close();

  console.log('\n🎉 ¡Migración completada! Tu base de datos en Neon tiene todos tus datos.');
}

migrate().catch(async (e) => {
  console.error('❌ Error en la migración:', e);
  await prisma.$disconnect();
  sqlite.close();
  process.exit(1);
});
