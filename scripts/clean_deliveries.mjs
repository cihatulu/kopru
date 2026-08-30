import fs from 'node:fs';

const settings = JSON.parse(fs.readFileSync('.claude/settings.local.json', 'utf8'));
const REF = settings.env.SUPABASE_PROJECT_REF;
const TOKEN = settings.env.SUPABASE_ACCESS_TOKEN;

async function run() {
  const sql = `
    DELETE FROM public.customer_deliveries;
    DELETE FROM public.order_status_logs WHERE note LIKE 'Müşteri Teslimatı Planlandı%';
  `;

  const res = await fetch('https://api.supabase.com/v1/projects/' + REF + '/database/query', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Result:', text);
}

run();
