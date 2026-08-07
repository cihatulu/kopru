import { expect, test } from '@playwright/test';

/**
 * Gerçek giriş yolları — tohumlanmış hesaplarla.
 *
 * Çalıştırmadan önce:  npm run seed
 * Şifreler her tohumlamada değiştiği için ortam değişkeniyle verilir:
 *   E2E_MFR_CODE / E2E_MFR_PW  ·  E2E_RTL_CODE / E2E_RTL_PW
 *   E2E_GUEST_RTL_CODE / E2E_GUEST_RTL_PW / E2E_GUEST_RTL_SPONSOR
 *
 * Bilgi verilmemişse atlanır — CI'da sır olmadan da yeşil kalır.
 */
const MFR = { code: process.env.E2E_MFR_CODE, pw: process.env.E2E_MFR_PW };
const RTL = { code: process.env.E2E_RTL_CODE, pw: process.env.E2E_RTL_PW };
const GUEST = {
  code: process.env.E2E_GUEST_RTL_CODE,
  pw: process.env.E2E_GUEST_RTL_PW,
  sponsor: process.env.E2E_GUEST_RTL_SPONSOR,
};

test.describe('üye girişleri', () => {
  test.skip(!MFR.code || !RTL.code, 'Tohum bilgileri verilmedi');

  test('üye üretici kendi paneline düşer', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('tab', { name: 'ÜYE ÜRETİCİ' }).click();
    await page.getByLabel(/Vergi No/).fill(MFR.code!);
    await page.getByLabel('Şifre').fill(MFR.pw!);
    await page.getByRole('button', { name: 'Giriş Yap' }).click();

    // Uzak veritabanına giden tur (Edge Function + Auth + oturum sorgusu) için
    // gerçekçi süre; varsayılan 5 sn paralel çalışan testlerde yetmiyor.
    await expect(page).toHaveURL(/\/m/, { timeout: 20_000 });
    await expect(page.getByRole('link', { name: 'Ürünlerim' })).toBeVisible();
  });

  test('üye perakendeci kendi paneline düşer', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('tab', { name: 'ÜYE PERAKENDECİ' }).click();
    await page.getByLabel(/Vergi No/).fill(RTL.code!);
    await page.getByLabel('Şifre').fill(RTL.pw!);
    await page.getByRole('button', { name: 'Giriş Yap' }).click();

    await expect(page).toHaveURL(/\/r/, { timeout: 20_000 });
    await expect(page.getByRole('link', { name: 'Katalog' })).toBeVisible();
  });

  test('üye, MİSAFİR sekmesinden giremez', async ({ page }) => {
    // Sunucu WRONG_MODE ile reddeder; istemci tek tip mesaj gösterir.
    await page.goto('/login');
    await page.getByRole('tab', { name: 'MİSAFİR ÜRETİCİ' }).click();
    await page.getByLabel(/Sizi ekleyen perakendecinin/).fill(RTL.code!);
    await page.getByLabel(/Vergi No/).fill(MFR.code!);
    await page.getByLabel('Şifre').fill(MFR.pw!);
    await page.getByRole('button', { name: 'Giriş Yap' }).click();

    await expect(page.getByText('Giriş bilgileri hatalı.')).toBeVisible({ timeout: 20_000 });
  });

  test('üretici, PERAKENDECİ sekmesinden giremez', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('tab', { name: 'ÜYE PERAKENDECİ' }).click();
    await page.getByLabel(/Vergi No/).fill(MFR.code!);
    await page.getByLabel('Şifre').fill(MFR.pw!);
    await page.getByRole('button', { name: 'Giriş Yap' }).click();

    await expect(page.getByText('Giriş bilgileri hatalı.')).toBeVisible({ timeout: 20_000 });
  });
});

test.describe('misafir girişi', () => {
  test.skip(!GUEST.code || !GUEST.sponsor, 'Misafir tohum bilgileri verilmedi');

  test('misafir perakendeci, sponsor vergi numarası ile girer', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('tab', { name: 'MİSAFİR PERAKENDECİ' }).click();
    await page.getByLabel(/Sizi ekleyen üreticinin/).fill(GUEST.sponsor!);
    await page.getByLabel(/Vergi No/).fill(GUEST.code!);
    await page.getByLabel('Şifre').fill(GUEST.pw!);
    await page.getByRole('button', { name: 'Giriş Yap' }).click();

    await expect(page).toHaveURL(/\/r/, { timeout: 20_000 });
  });

  test('yanlış sponsor vergi numarası ile giremez', async ({ page }) => {
    // Sponsor VKN bir kolaylık değil, kimlik faktörüdür.
    await page.goto('/login');
    await page.getByRole('tab', { name: 'MİSAFİR PERAKENDECİ' }).click();
    await page.getByLabel(/Sizi ekleyen üreticinin/).fill('1234567890');
    await page.getByLabel(/Vergi No/).fill(GUEST.code!);
    await page.getByLabel('Şifre').fill(GUEST.pw!);
    await page.getByRole('button', { name: 'Giriş Yap' }).click();

    await expect(page.getByText('Giriş bilgileri hatalı.')).toBeVisible({ timeout: 20_000 });
  });
});
