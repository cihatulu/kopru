/**
 * Giriş ekranının davranış testi.
 *
 * Tasarım beş sekmeye çevrildi ama SÖZLEŞME AYNI: yalnız admin e-posta ile
 * girer, diğer herkes vergi numarası (kullanıcı kodu) ile; misafir sekmeleri
 * ayrıca sponsorun vergi numarasını ister.
 */
import { describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginTabs } from './LoginTabs';
import { LoginFormFields } from './LoginFormFields';
import { LOGIN_TABS, tabById } from '../domain/portals';

const noop = () => undefined;
const base = { pending: false, onSubmit: noop } as const;

describe('LoginTabs', () => {
  test('beş giriş yolu sunar', () => {
    render(<LoginTabs active="member-manufacturer" onSelect={noop} />);
    for (const label of [
      'ÜYE ÜRETİCİ',
      'ÜYE MAĞAZA',
      'MİSAFİR ÜRETİCİ',
      'MİSAFİR MAĞAZA',
      'ADMIN',
    ]) {
      expect(screen.getByRole('tab', { name: label })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('tab')).toHaveLength(5);
  });

  test('aktif sekme işaretlenir', () => {
    render(<LoginTabs active="admin" onSelect={noop} />);
    expect(screen.getByRole('tab', { name: 'ADMIN' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'ÜYE ÜRETİCİ' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  test('sekmeye basınca bildirilir', async () => {
    const onSelect = vi.fn();
    render(<LoginTabs active="member-manufacturer" onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('tab', { name: 'MİSAFİR MAĞAZA' }));
    expect(onSelect).toHaveBeenCalledWith('guest-retailer');
  });
});

describe('sekme → portal/mod eşlemesi bozulmamalı', () => {
  test('beş sekme doğru portal ve modu taşır', () => {
    expect(LOGIN_TABS.map((t) => [t.id, t.portal, t.mode])).toEqual([
      ['member-manufacturer', 'manufacturer', 'subscriber'],
      ['member-retailer', 'retailer', 'subscriber'],
      ['guest-manufacturer', 'manufacturer', 'guest'],
      ['guest-retailer', 'retailer', 'guest'],
      ['admin', 'admin', 'subscriber'],
    ]);
  });

  test('misafir üreticinin sponsoru PERAKENDECİ, misafir perakendecininki ÜRETİCİdir', () => {
    expect(tabById('guest-manufacturer').sponsorLabel).toContain('perakendeci');
    expect(tabById('guest-retailer').sponsorLabel).toContain('üretici');
  });

  test('üye sekmelerinde sponsor alanı yoktur', () => {
    expect(tabById('member-manufacturer').sponsorLabel).toBeUndefined();
    expect(tabById('member-retailer').sponsorLabel).toBeUndefined();
  });
});

describe('LoginFormFields — alanlar sekmeye göre değişir', () => {
  test('üye girişi: vergi no + şifre, sponsor alanı YOK', () => {
    render(<LoginFormFields {...base} tab={tabById('member-manufacturer')} />);
    expect(screen.getByLabelText(/Vergi No \/ Kullanıcı Kodu/)).toBeInTheDocument();
    expect(screen.getByLabelText('Şifre')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Sizi ekleyen/)).not.toBeInTheDocument();
  });

  test('misafir üretici: PERAKENDECİ vergi numarası istenir', () => {
    render(<LoginFormFields {...base} tab={tabById('guest-manufacturer')} />);
    expect(screen.getByLabelText(/Sizi ekleyen perakendecinin/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Vergi No \/ Kullanıcı Kodu/)).toBeInTheDocument();
  });

  test('misafir perakendeci: ÜRETİCİ vergi numarası istenir', () => {
    render(<LoginFormFields {...base} tab={tabById('guest-retailer')} />);
    expect(screen.getByLabelText(/Sizi ekleyen üreticinin/)).toBeInTheDocument();
  });

  test('YALNIZ admin e-posta ister', () => {
    render(<LoginFormFields {...base} tab={tabById('admin')} />);
    expect(screen.getByLabelText('E-posta')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Vergi No/)).not.toBeInTheDocument();
  });

  test('geçersiz vergi no ile gönderilirse onSubmit çağrılmaz', async () => {
    const onSubmit = vi.fn();
    render(<LoginFormFields {...base} tab={tabById('member-retailer')} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByLabelText('Yetkili Girişi'));
    await userEvent.type(screen.getByLabelText(/Vergi No/), '111111111'); // 9 hane — geçersiz format
    await userEvent.type(screen.getByLabelText('Şifre'), 'sifre123');
    await userEvent.click(screen.getByRole('button', { name: 'Giriş Yap' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findByText(/Geçerli bir VKN/)).toBeInTheDocument();
  });

  test('geçerli bilgilerle onSubmit çağrılır ve kod normalize edilir', async () => {
    const onSubmit = vi.fn();
    render(<LoginFormFields {...base} tab={tabById('member-retailer')} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByLabelText('Yetkili Girişi'));
    await userEvent.type(screen.getByLabelText(/Vergi No/), '123-456 7890');
    await userEvent.type(screen.getByLabelText('Şifre'), 'sifre123');
    await userEvent.click(screen.getByRole('button', { name: 'Giriş Yap' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ userCode: '1234567890' });
  });

  test('misafir kendi vergi numarasını sponsor olarak giremez', async () => {
    const onSubmit = vi.fn();
    render(<LoginFormFields {...base} tab={tabById('guest-retailer')} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByLabelText('Yetkili Girişi'));
    await userEvent.type(screen.getByLabelText(/Sizi ekleyen üreticinin/), '1234567890');
    await userEvent.type(screen.getByLabelText(/Vergi No/), '1234567890');
    await userEvent.type(screen.getByLabelText('Şifre'), 'sifre123');
    await userEvent.click(screen.getByRole('button', { name: 'Giriş Yap' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findByText(/kendi numaranızla aynı olamaz/)).toBeInTheDocument();
  });

  test('sunucudan gelen hata mesajı gösterilir', () => {
    render(
      <LoginFormFields
        {...base}
        tab={tabById('member-retailer')}
        errorMessage="Giriş bilgileri hatalı."
      />,
    );
    expect(
      within(screen.getByRole('alert')).getByText('Giriş bilgileri hatalı.'),
    ).toBeInTheDocument();
  });
});
