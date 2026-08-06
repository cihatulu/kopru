/**
 * Giriş akışının davranış testi — kullanıcının tarif ettiği ekranı sabitler.
 *
 * En kritik iddia: AÇILIŞTA HİÇBİR FORM ALANI YOKTUR. Bir portala basılmadan
 * o tarafın alanları gelmez. Bu test o davranışın geri gelmesini engeller.
 */
import { describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PortalPicker } from './PortalPicker';
import { ModePicker } from './ModePicker';
import { LoginFormFields } from './LoginFormFields';

const noop = () => undefined;

describe('PortalPicker — açılış ekranı', () => {
  test('tam üç portal butonu gösterir', () => {
    render(<PortalPicker onSelect={noop} />);
    expect(screen.getByRole('button', { name: /Üretici Üye Girişi/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Perakendeci Üye Girişi/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Admin/ })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  test('açılışta HİÇBİR input yoktur', () => {
    const { container } = render(<PortalPicker onSelect={noop} />);
    expect(container.querySelectorAll('input')).toHaveLength(0);
    expect(container.querySelectorAll('form')).toHaveLength(0);
  });

  test('butona basınca seçilen portal bildirilir', async () => {
    const onSelect = vi.fn();
    render(<PortalPicker onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: /Üretici Üye Girişi/ }));
    expect(onSelect).toHaveBeenCalledWith('manufacturer');
  });
});

describe('ModePicker — iki giriş yolu', () => {
  test('üretici portalı: abone ve perakendeci daveti seçenekleri', () => {
    render(<ModePicker portal="manufacturer" onSelect={noop} onBack={noop} />);
    expect(screen.getByText('Bizden hizmet alan üretici')).toBeInTheDocument();
    expect(screen.getByText('Perakendeci daveti ile üretici')).toBeInTheDocument();
  });

  test('perakendeci portalı: abone ve üretici daveti seçenekleri', () => {
    render(<ModePicker portal="retailer" onSelect={noop} onBack={noop} />);
    expect(screen.getByText('Bizden hizmet alan perakendeci')).toBeInTheDocument();
    expect(screen.getByText('Üretici daveti ile perakendeci')).toBeInTheDocument();
  });

  test('mod seçiminde hâlâ input yoktur', () => {
    const { container } = render(<ModePicker portal="retailer" onSelect={noop} onBack={noop} />);
    expect(container.querySelectorAll('input')).toHaveLength(0);
  });
});

describe('LoginFormFields — alanlar moda göre değişir', () => {
  const base = { pending: false, onBack: noop, onSubmit: noop } as const;

  test('abone girişi: kullanıcı kodu + şifre, sponsor alanı YOK', () => {
    render(<LoginFormFields {...base} portal="manufacturer" mode="subscriber" />);
    expect(screen.getByLabelText(/Kullanıcı kodu/)).toBeInTheDocument();
    expect(screen.getByLabelText('Şifre')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Sizi ekleyen/)).not.toBeInTheDocument();
  });

  test('misafir üretici: sponsor olarak PERAKENDECİ VKN si istenir', () => {
    render(<LoginFormFields {...base} portal="manufacturer" mode="guest" />);
    expect(screen.getByLabelText(/Sizi ekleyen perakendecinin/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Kullanıcı kodu/)).toBeInTheDocument();
  });

  test('misafir perakendeci: sponsor olarak ÜRETİCİ VKN si istenir', () => {
    render(<LoginFormFields {...base} portal="retailer" mode="guest" />);
    expect(screen.getByLabelText(/Sizi ekleyen üreticinin/)).toBeInTheDocument();
  });

  test('admin: e-posta ister, kullanıcı kodu istemez', () => {
    render(<LoginFormFields {...base} portal="admin" mode="subscriber" />);
    expect(screen.getByLabelText('E-posta')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Kullanıcı kodu/)).not.toBeInTheDocument();
  });

  test('geçersiz VKN ile gönderilirse onSubmit çağrılmaz', async () => {
    const onSubmit = vi.fn();
    render(
      <LoginFormFields {...base} portal="retailer" mode="subscriber" onSubmit={onSubmit} />,
    );

    await userEvent.type(screen.getByLabelText(/Kullanıcı kodu/), '1111111111');
    await userEvent.type(screen.getByLabelText('Şifre'), 'sifre123');
    await userEvent.click(screen.getByRole('button', { name: 'Giriş yap' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findByText(/Geçerli bir VKN/)).toBeInTheDocument();
  });

  test('geçerli bilgilerle onSubmit çağrılır ve kod normalize edilir', async () => {
    const onSubmit = vi.fn();
    render(
      <LoginFormFields {...base} portal="retailer" mode="subscriber" onSubmit={onSubmit} />,
    );

    await userEvent.type(screen.getByLabelText(/Kullanıcı kodu/), '123-456 7890');
    await userEvent.type(screen.getByLabelText('Şifre'), 'sifre123');
    await userEvent.click(screen.getByRole('button', { name: 'Giriş yap' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ userCode: '1234567890' });
  });

  test('misafir kendi VKN sini sponsor olarak giremez', async () => {
    const onSubmit = vi.fn();
    render(<LoginFormFields {...base} portal="retailer" mode="guest" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/Sizi ekleyen üreticinin/), '1234567890');
    await userEvent.type(screen.getByLabelText(/Kullanıcı kodu/), '1234567890');
    await userEvent.type(screen.getByLabelText('Şifre'), 'sifre123');
    await userEvent.click(screen.getByRole('button', { name: 'Giriş yap' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findByText(/kendi numaranızla aynı olamaz/)).toBeInTheDocument();
  });

  test('sunucudan gelen hata mesajı gösterilir', () => {
    render(
      <LoginFormFields
        {...base}
        portal="retailer"
        mode="subscriber"
        errorMessage="Giriş bilgileri hatalı."
      />,
    );
    expect(within(screen.getByRole('alert')).getByText('Giriş bilgileri hatalı.')).toBeInTheDocument();
  });
});
