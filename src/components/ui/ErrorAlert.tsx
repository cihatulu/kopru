interface Props {
  children: React.ReactNode;
}

/** Sayfa üstünde gösterilen hata şeridi. Boş mesajla çağrılmaz. */
export function ErrorAlert({ children }: Props) {
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
      {children}
    </p>
  );
}
