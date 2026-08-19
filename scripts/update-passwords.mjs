const SUPABASE_URL = 'https://jlcbvvvcojilizdlycgw.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const NEW_PASSWORD = '1q2w3e4r';

const headers = {
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};

// 1. Tüm kullanıcıları listele
async function listAllUsers() {
  const users = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=${perPage}`,
      { headers }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    
    const batch = data.users ?? [];
    users.push(...batch);
    if (batch.length < perPage) break;
    page++;
  }
  return users;
}

// 2. Admin kontrolü - app_metadata.role === 'admin' olanları atla
function isAdmin(user) {
  const role = user.app_metadata?.role;
  return role === 'admin';
}

// 3. Şifre güncelle
async function updatePassword(userId, email) {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users/${userId}`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify({ password: NEW_PASSWORD }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function main() {
  console.log('Kullanıcılar listeleniyor...');
  const users = await listAllUsers();
  console.log(`Toplam ${users.length} kullanıcı bulundu.\n`);

  let updated = 0;
  let skipped = 0;

  for (const user of users) {
    const email = user.email ?? user.phone ?? user.id;
    const role = user.app_metadata?.role ?? '(rol yok)';

    if (isAdmin(user)) {
      console.log(`⏭️  ATLA (admin): ${email} [role=${role}]`);
      skipped++;
      continue;
    }

    try {
      await updatePassword(user.id, email);
      console.log(`✅ Güncellendi: ${email} [role=${role}]`);
      updated++;
    } catch (err) {
      console.error(`❌ Hata (${email}): ${err.message}`);
    }
  }

  console.log(`\n✅ ${updated} kullanıcı güncellendi, ${skipped} admin atlandı.`);
}

main().catch(console.error);
