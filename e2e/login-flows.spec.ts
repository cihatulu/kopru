import { expect, test } from '@playwright/test';

/**
 * Gerçek giriş yolları — tohumlanmış hesaplarla.
 *
 * Çalıştırmadan önce:  node scripts/seed.mjs
 * Şifreler değiştiği için ortam değişkeniyle verilir:
 *   E2E_MFR_CODE / E2E_MFR_PW  ·  E2E_RTL_CODE / E2E_RTL_PW
 *   E2E_GUEST_RTL_CODE / E2E_GUEST_RTL_PW / E2E_GUEST_RTL_SPONSOR
 *
 * Bilgi verilmemişse testler atlanır — CI'da sır olmadan da yeşil kalır.
 */
const MFR = { code: process.env.E2E_MFR_CODE, pw: process.env.E2E_MFR_PW };
const RTL = { code: process.env.E2E_RTL_CODE, pw: process.env.E2E_RTL_PW };
const GUEST = {
  code: process.env.E2E_GUEST_RTL_CODE,
  pw: process.env.E2E_GUEST_RTL_PW,
  sponsor: process.env.E2E_GUEST_RTL_SPONSOR,
};

test.describe('abone girişleri', () => {
  test.skip(!MFR.code || !RTL.code, 'Tohum bilgileri verilmedi');

  test('abone üretici kendi paneline düşer', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Üretici Üye Girişi/ }).click();
    await page.getByText('Bizden hizmet alan üretici').click();
    await page.getByLabel(/Kullanıcı kodu/).fill(MFR.code!);
    await page.getByLabel('Şifre').fill(MFR.pw!);
    await page.getByRole('button', { name: 'Giriş yap' }).click();

    await expect(page).toHaveURL(/\/m/);
    await expect(page.getByRole('link', { name: 'Ürünlerim' })).toBeVisible();
  });

  test('abone perakendeci kendi paneline düşer', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Perakendeci Üye Girişi/ }).click();
    await page.getByText('Bizden hizmet alan perakendeci').click();
    await page.getByLabel(/Kullanıcı kodu/).fill(RTL.code!);
    await page.getByLabel('Şifre').fill(RTL.pw!);
    await page.getByRole('button', { name: 'Giriş yap' }).click();

    await expect(page).toHaveURL(/\/r/);
    await expect(page.getByRole('link', { name: 'Katalog' })).toBeVisible();
  });

  test('abone, MİSAFİR kapısından giremez', async ({ page }) => {
    // Sunucu WRONG_MODE ile reddeder; istemci tek tip mesaj gösterir.
    await page.goto('/login');
    await page.getByRole('button', { name: /Üretici Üye Girişi/ }).click();
    await page.getByText('Perakendeci daveti ile üretici').click();
    await page.getByLabel(/Sizi ekleyen perakendecinin/).fill(RTL.code!);
    await page.getByLabel(/Kullanıcı kodu/).fill(MFR.code!);
    await page.getByLabel('Şifre').fill(MFR.pw!);
    await page.getByRole('button', { name: 'Giriş yap' }).click();

    await expect(page.getByText('Giriş bilgileri hatalı.')).toBeVisible();
  });

  test('üretici, PERAKENDECİ kapısından giremez', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Perakendeci Üye Girişi/ }).click();
    await page.getByText('Bizden hizmet alan perakendeci').click();
    await page.getByLabel(/Kullanıcı kodu/).fill(MFR.code!);
    await page.getByLabel('Şifre').fill(MFR.pw!);
    await page.getByRole('button', { name: 'Giriş yap' }).click();

    await expect(page.getByText('Giriş bilgileri hatalı.')).toBeVisible();
  });
});

test.describe('misafir girişi', () => {
  test.skip(!GUEST.code || !GUEST.sponsor, 'Misafir tohum bilgileri verilmedi');

  test('misafir perakendeci, sponsor VKN si ile girer', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Perakendeci Üye Girişi/ }).click();
    await page.getByText('Üretici daveti ile perakendeci').click();
    await page.getByLabel(/Sizi ekleyen üreticinin/).fill(GUEST.sponsor!);
    await page.getByLabel(/Kullanıcı kodu/).fill(GUEST.code!);
    await page.getByLabel('Şifre').fill(GUEST.pw!);
    await page.getByRole('button', { name: 'Giriş yap' }).click();

    await expect(page).toHaveURL(/\/r/);
  });

  test('yanlış sponsor VKN si ile giremez', async ({ page }) => {
    // Sponsor VKN bir kolaylık değil, kimlik faktörüdür.
    await page.goto('/login');
    await page.getByRole('button', { name: /Perakendeci Üye Girişi/ }).click();
    await page.getByText('Üretici daveti ile perakendeci').click();
    await page.getByLabel(/Sizi ekleyen üreticinin/).fill('1234567890');
    await page.getByLabel(/Kullanıcı kodu/).fill(GUEST.code!);
    await page.getByLabel('Şifre').fill(GUEST.pw!);
    await page.getByRole('button', { name: 'Giriş yap' }).click();

    await expect(page.getByText('Giriş bilgileri hatalı.')).toBeVisible();
  });
});
