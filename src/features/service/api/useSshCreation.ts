import { useState } from 'react';
import { uploadServicePhoto } from '@/lib/servicePhotos';
import {
  MAX_SSH_PHOTOS,
  photoRejectReason,
  sshBlockReason,
  sshTitle,
  validateSshDraft,
  type SshItemSelection,
} from '../domain/sshDraft';
import { useCreateSsh, useSetSshImages } from './useServiceMutations';
import type { SshEligibleOrder } from './useSshEligibleOrders';

export interface SshFormFields {
  customProductName: string;
  description: string;
  customerName: string;
  customerPhone: string;
}

const EMPTY_FIELDS: SshFormFields = {
  customProductName: '',
  description: '',
  customerName: '',
  customerPhone: '',
};

/**
 * Yeni SSH talebi formunun durumu ve gönderimi.
 *
 * Kota kuralı İKİ kez sorulur: sipariş seçilirken ve gönderim anında. Araya
 * geçen sürede başka bir sekmeden talep açılmış olabilir; sunucu da reddeder
 * ama kullanıcının anlamlı bir mesaj görmesi gerekir.
 */
export function useSshCreation(defaultRelId: string, onDone: () => void) {
  const [step, setStep] = useState<1 | 2>(1);
  const [order, setOrder] = useState<SshEligibleOrder | null>(null);
  const [relId, setRelId] = useState(defaultRelId);
  const [items, setItems] = useState<SshItemSelection[]>([]);
  const [fields, setFields] = useState<SshFormFields>(EMPTY_FIELDS);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSsh = useCreateSsh();
  const setSshImages = useSetSshImages();

  const selectOrder = (o: SshEligibleOrder) => {
    const blocked = sshBlockReason(o);
    if (blocked) {
      setError(blocked);
      return;
    }
    setOrder(o);
    setRelId(o.relationshipId);
    setItems(
      o.items.map((i, idx) => ({
        id: i.id,
        productId: i.productId,
        name: i.name,
        maxQty: i.quantity,
        qty: i.quantity,
        selected: idx === 0,
      })),
    );
    setError(null);
    setStep(2);
  };

  const addFiles = (chosen: File[]) => {
    const rejected = chosen.map(photoRejectReason).find(Boolean);
    if (rejected) {
      setError(rejected);
      return;
    }
    setFiles((prev) => [...prev, ...chosen].slice(0, MAX_SSH_PHOTOS));
    setError(null);
  };

  /** Fotoğraflar talebi bloklamaz: kayıt açıldıktan SONRA yüklenir. */
  const attachPhotos = async (sshId: string) => {
    const paths: string[] = [];
    for (const file of files) {
      const res = await uploadServicePhoto(file, relId, sshId);
      if (res.path) paths.push(res.path);
    }
    if (paths.length > 0) await setSshImages.mutateAsync({ id: sshId, paths });
  };

  const submit = async () => {
    if (submitting) return;

    const draft = { order, items, ...fields };
    const invalid = (order ? sshBlockReason(order) : null) ?? validateSshDraft(draft);
    if (invalid || !relId) {
      setError(invalid ?? 'Aktif bir tedarikçi ilişkisi bulunamadı.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const sshId = await createSsh.mutateAsync({
        relationshipId: relId,
        title: sshTitle(draft),
        description: fields.description.trim(),
        orderId: order?.id,
        productId: items.find((i) => i.selected)?.productId || undefined,
        customerName: fields.customerName.trim() || undefined,
        customerPhone: fields.customerPhone.trim() || undefined,
      });

      // Fotoğraf yüklenemese de talep açıldı; kullanıcı sonradan ekleyebilir.
      if (files.length > 0 && sshId) await attachPhotos(sshId).catch(() => undefined);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SSH talebi oluşturulurken bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    step,
    setStep,
    order,
    relId,
    setRelId,
    items,
    setItems,
    fields,
    setField: (key: keyof SshFormFields, value: string) =>
      setFields((prev) => ({ ...prev, [key]: value })),
    files,
    addFiles,
    removeFile: (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i)),
    submitting,
    error,
    selectOrder,
    selectManual: () => { setOrder(null); setItems([]); setError(null); setStep(2); },
    submit,
  };
}
