import { expect, test } from '@playwright/test';

/**
 * Giriş ekranı — beş sekmeli tasarım.
 *
 * Tasarım değişti ama SÖZLEŞME AYNI: yalnız admin e-posta ile girer, diğer
 * herkes vergi numarası (kullanıcı kodu) ile; misafir sekmeleri ayrıca
 * sponsorun vergi numarasını ister.
 */

test.describe('giriş ekranı', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('beş giriş yolu sekme olarak sunulur', async ({ page }) => {
    for (const label of [
      'ÜYE ÜRETİCİ', 'ÜYE PERAKENDECİ', 'MİSAFİR ÜRETİCİ', 'MİSAFİR PERAKENDECİ', 'ADMIN',
    ]) {
      await expect(page.getByRole('tab', { name: label })).toBeVisible();
    }
    await expect(page.getByRole('tab')).toHaveCount(5);
  });

  test('üye üretici: vergi no ister, sponsor alanı yok', async ({ page }) => {
    await page.getByRole('tab', { name: 'ÜYE ÜRETİCİ' }).click();
    await expect(page.getByLabel(/Vergi No \/ Kullanıcı Kodu/)).toBeVisible();
    await expect(page.getByLabel(/Sizi ekleyen/)).toHaveCount(0);
  });

  test('misafir üretici: PERAKENDECİ vergi numarası ister', async ({ page }) => {
    await page.getByRole('tab', { name: 'MİSAFİR ÜRETİCİ' }).click();
    await expect(page.getByLabel(/Sizi ekleyen perakendecinin/)).toBeVisible();
    await expect(page.getByLabel(/Vergi No \/ Kullanıcı Kodu/)).toBeVisible();
  });

  test('misafir perakendeci: ÜRETİCİ vergi numarası ister', async ({ page }) => {
    await page.getByRole('tab', { name: 'MİSAFİR PERAKENDECİ' }).click();
    await expect(page.getByLabel(/Sizi ekleyen üreticinin/)).toBeVisible();
  });

  test('YALNIZ admin e-posta ister', async ({ page }) => {
    await page.getByRole('tab', { name: 'ADMIN' }).click();
    await expect(page.getByLabel('E-posta')).toBeVisible();
    await expect(page.getByLabel(/Vergi No/)).toHaveCount(0);
  });

  test('geçersiz vergi no sunucuya gitmeden reddedilir', async ({ page }) => {
    await page.getByRole('tab', { name: 'ÜYE PERAKENDECİ' }).click();
    await page.getByLabel(/Vergi No/).fill('1111111111');
    await page.getByLabel('Şifre').fill('sifre123');
    await page.getByRole('button', { name: 'Giriş Yap' }).click();
    await expect(page.getByText(/Geçerli bir VKN/)).toBeVisible();
  });

  test('sekme değişince form durumu sıfırlanır', async ({ page }) => {
    // Alanlar sekmeler arasında taşınmamalı; yanlış kapıya yanlış bilgi gitmesin.
    await page.getByRole('tab', { name: 'ÜYE ÜRETİCİ' }).click();
    await page.getByLabel(/Vergi No/).fill('1234567890');

    await page.getByRole('tab', { name: 'ÜYE PERAKENDECİ' }).click();
    await expect(page.getByLabel(/Vergi No/)).toHaveValue('');
  });
});
