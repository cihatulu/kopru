import { expect, test } from '@playwright/test';

/**
 * Giriş akışı — PLAN §11'deki 7 senaryo.
 *
 * En kritik iddia: AÇILIŞTA HİÇBİR FORM ALANI YOKTUR. Bir portala basılmadan
 * o tarafın alanları gelmez. Kullanıcının açık talebi buydu.
 */

test.describe('giriş ekranı', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('açılışta yalnız üç buton var, hiç input yok', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Üretici Üye Girişi/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Perakendeci Üye Girişi/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Admin/ })).toBeVisible();
    await expect(page.locator('input')).toHaveCount(0);
  });

  test('üretici portalı iki giriş yolu sunar', async ({ page }) => {
    await page.getByRole('button', { name: /Üretici Üye Girişi/ }).click();
    await expect(page.getByText('Bizden hizmet alan üretici')).toBeVisible();
    await expect(page.getByText('Perakendeci daveti ile üretici')).toBeVisible();
    // Mod seçiminde de hâlâ input yok.
    await expect(page.locator('input')).toHaveCount(0);
  });

  test('perakendeci portalı aynanın diğer yüzüdür', async ({ page }) => {
    await page.getByRole('button', { name: /Perakendeci Üye Girişi/ }).click();
    await expect(page.getByText('Bizden hizmet alan perakendeci')).toBeVisible();
    await expect(page.getByText('Üretici daveti ile perakendeci')).toBeVisible();
  });

  test('misafir üretici, PERAKENDECİ VKN si ister', async ({ page }) => {
    await page.getByRole('button', { name: /Üretici Üye Girişi/ }).click();
    await page.getByText('Perakendeci daveti ile üretici').click();
    await expect(page.getByLabel(/Sizi ekleyen perakendecinin/)).toBeVisible();
    await expect(page.getByLabel(/Kullanıcı kodu/)).toBeVisible();
  });

  test('misafir perakendeci, ÜRETİCİ VKN si ister', async ({ page }) => {
    await page.getByRole('button', { name: /Perakendeci Üye Girişi/ }).click();
    await page.getByText('Üretici daveti ile perakendeci').click();
    await expect(page.getByLabel(/Sizi ekleyen üreticinin/)).toBeVisible();
  });

  test('admin e-posta ister, VKN değil', async ({ page }) => {
    await page.getByRole('button', { name: /^Admin/ }).click();
    await expect(page.getByLabel('E-posta')).toBeVisible();
    await expect(page.getByLabel(/Kullanıcı kodu/)).toHaveCount(0);
  });

  test('geçersiz VKN sunucuya gitmeden reddedilir', async ({ page }) => {
    await page.getByRole('button', { name: /Perakendeci Üye Girişi/ }).click();
    await page.getByText('Bizden hizmet alan perakendeci').click();
    await page.getByLabel(/Kullanıcı kodu/).fill('1111111111');
    await page.getByLabel('Şifre').fill('sifre123');
    await page.getByRole('button', { name: 'Giriş yap' }).click();
    await expect(page.getByText(/Geçerli bir VKN/)).toBeVisible();
  });

  test('geri butonu bir adım geri alır', async ({ page }) => {
    await page.getByRole('button', { name: /Üretici Üye Girişi/ }).click();
    await page.getByText('Bizden hizmet alan üretici').click();
    await expect(page.getByLabel(/Kullanıcı kodu/)).toBeVisible();

    await page.getByRole('button', { name: 'Geri' }).click();
    await expect(page.getByText('Bizden hizmet alan üretici')).toBeVisible();

    await page.getByRole('button', { name: 'Geri' }).click();
    await expect(page.getByRole('button', { name: /Perakendeci Üye Girişi/ })).toBeVisible();
  });
});
