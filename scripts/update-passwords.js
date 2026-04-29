/**
 * Oshxona POS — Parollarni yangilash skripti
 *
 * Ishlatish:
 *   node scripts/update-passwords.js
 *
 * Yoki faqat bitta foydalanuvchi:
 *   node scripts/update-passwords.js kassir@oshxona.uz YangiParol123!
 */

import fetch from 'node-fetch';

const API = process.env.API_URL || 'http://localhost:3002/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@oshxona.uz';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin1234!';

// ─── Yangi parollarni shu yerda o'zgartiring ──────────────────────────────
const USERS = [
  { email: 'admin@oshxona.uz',       newPassword: 'Admin1234!',       newPin: '0000' },
  { email: 'manager@oshxona.uz',     newPassword: 'Manager1234!',     newPin: '1111' },
  { email: 'kassir@oshxona.uz',      newPassword: 'Kassir1234!',      newPin: '1234' },
  { email: 'oshpaz@oshxona.uz',      newPassword: 'Oshpaz1234!',      newPin: '2222' },
  { email: 'ofitsiant@oshxona.uz',   newPassword: 'Waiter1234!',      newPin: '3333' },
  { email: 'ombor@oshxona.uz',       newPassword: 'Ombor1234!',       newPin: '4444' },
  { email: 'buxgalter@oshxona.uz',   newPassword: 'Buxgalter1234!',   newPin: '5555' },
];

async function main() {
  // 1. Admin login
  console.log(`\n🔐 Admin sifatida login: ${ADMIN_EMAIL}`);
  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });

  if (!loginRes.ok) {
    console.error('❌ Login muvaffaqiyatsiz:', await loginRes.text());
    process.exit(1);
  }

  const { data: loginData } = await loginRes.json();
  const token = loginData.accessToken;
  console.log('✅ Login muvaffaqiyatli\n');

  // 2. Foydalanuvchilar ro'yxatini olish
  const usersRes = await fetch(`${API}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const { data: users } = await usersRes.json();

  // CLI orqali bitta foydalanuvchi
  const [targetEmail, targetPass] = process.argv.slice(2);
  const updateList = targetEmail
    ? USERS.filter(u => u.email === targetEmail).map(u => ({ ...u, newPassword: targetPass || u.newPassword }))
    : USERS;

  // 3. Har birini yangilash
  let updated = 0, failed = 0;
  for (const u of updateList) {
    const user = users.find(x => x.email === u.email);
    if (!user) {
      console.log(`⚠️  ${u.email} — topilmadi`);
      continue;
    }

    const body = { password: u.newPassword };
    if (u.newPin) body.pin = u.newPin;

    const res = await fetch(`${API}/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      console.log(`✅ ${u.email.padEnd(28)} parol: ${u.newPassword}  PIN: ${u.newPin || '-'}`);
      updated++;
    } else {
      const err = await res.json();
      console.log(`❌ ${u.email} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Natija: ${updated} yangilandi, ${failed} xato`);
  console.log('\n💡 Yangi parollarni o\'zgartirish uchun:');
  console.log('   scripts/update-passwords.js faylidagi USERS massivini tahrirlang');
}

main().catch(console.error);
