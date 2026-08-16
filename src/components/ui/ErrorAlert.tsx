interface Props {
  children: React.ReactNode;
}

/**
 * Sayfa üstünde gösterilen hata şeridi. Boş mesajla çağrılmaz.
 *
 * Rozetlerdeki hata diliyle aynı: açık zemin + ince çerçeve + koyu metin.
 * Çerçevesiz düz zemin, açık gri sayfa arkasında şeridin kenarını
 * belirsiz bırakıyordu.
 */
export function ErrorAlert({ children }: Props) {
  return (
    <p
      role="alert"
      className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700
        ring-1 ring-inset ring-red-200"
    >
      {children}
    </p>
  );
}
