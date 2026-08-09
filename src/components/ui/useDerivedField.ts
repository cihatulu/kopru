import { useState } from 'react';

export interface DerivedField {
  value: string;
  onChange: (v: string) => void;
  /** Kullanıcı alana dokundu mu — hesaplanan değer artık ezilmez. */
  edited: boolean;
}

/**
 * Hesaplanan ama ELLE DEĞİŞTİRİLEBİLEN alan.
 *
 * Takım fiyatı gibi alanlar içerikten türetilir; kullanıcı yazana kadar
 * hesaplanan değeri gösterir, yazdıktan sonra bir daha ezilmez. Bayrak
 * olmasaydı, kullanıcı fiyatı yazdıktan sonra bir miktarı değiştirdiğinde
 * yazdığı değer sessizce silinirdi.
 */
export function useDerivedField(computed: string): DerivedField {
  const [typed, setTyped] = useState('');
  const [edited, setEdited] = useState(false);

  return {
    value: edited ? typed : computed,
    edited,
    onChange: (v: string) => {
      setEdited(true);
      setTyped(v);
    },
  };
}
