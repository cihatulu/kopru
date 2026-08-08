import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { SSH_STATUS_META, isSshClosed, nextSshStatus } from '../domain/labels';
import { useSshDetail } from '../api/useSshDetail';
import { useAdvanceSsh, useSetSshImages } from '../api/useServiceMutations';
import { PhotoUploader } from './PhotoUploader';
import { StatusTimeline } from './StatusTimeline';

interface Props {
  sshId: string;
  myOrgId: string;
  onClose: () => void;
}

/**
 * Servis talebinin detay paneli — kendi verisini çeken kapsayıcı.
 *
 * Durumu sayfaya taşımak `ServicePage`'i 150 satır bütçesinin (A19) üstüne
 * çıkarırdı. Katman kuralı korunuyor: doğrudan supabase çağrısı yok, yalnız
 * bu feature'ın kendi api hook'ları.
 */
export function SshDetailDrawer({ sshId, myOrgId, onClose }: Props) {
  const detail = useSshDetail(sshId);
  const advance = useAdvanceSsh();
  const setImages = useSetSshImages();
  const [note, setNote] = useState('');

  const d = detail.data;
  const closed = d ? isSshClosed(d.status) : true;
  const isManufacturer = d?.manufacturerOrgId === myOrgId;
  const nextStatus = d ? nextSshStatus(d.status) : null;

  const move = (status: NonNullable<ReturnType<typeof nextSshStatus>>) => {
    advance.mutate({ id: sshId, status, ...(note.trim() ? { note: note.trim() } : {}) });
    setNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Servis talebi detayı"
        className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-xl"
      >
        {detail.isPending && (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        )}

        {detail.isError && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            Talep yüklenemedi.
          </p>
        )}

        {d && (
          <div className="space-y-6">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{d.title}</h2>
                <p className="mt-1 text-xs text-slate-400">
                  {new Date(d.createdAt).toLocaleString('tr-TR')}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${SSH_STATUS_META[d.status].className}`}
              >
                {SSH_STATUS_META[d.status].label}
              </span>
            </header>

            {d.description && (
              <p className="whitespace-pre-wrap text-sm text-slate-600">{d.description}</p>
            )}

            {(d.customerName ?? d.customerPhone) && (
              <section className="rounded-lg bg-slate-50 p-3 text-sm ring-1 ring-inset ring-slate-200">
                <h3 className="text-xs font-semibold uppercase text-slate-500">Son müşteri</h3>
                <p className="mt-1 text-slate-700">
                  {d.customerName ?? '—'}
                  {d.customerPhone ? ` · ${d.customerPhone}` : ''}
                </p>
              </section>
            )}

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">Fotoğraflar</h3>
              <PhotoUploader
                relationshipId={d.relationshipId}
                sshId={d.id}
                paths={d.imagePaths}
                urls={d.imageUrls}
                disabled={closed}
                onChange={(paths) => setImages.mutate({ id: d.id, paths })}
              />
            </section>

            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase text-slate-500">
                Durum geçmişi
              </h3>
              <StatusTimeline logs={d.logs} myOrgId={myOrgId} />
            </section>

            {!closed && (
              <section className="space-y-3 border-t border-slate-100 pt-4">
                <label className="block">
                  <span className="label">Not (isteğe bağlı)</span>
                  <textarea
                    className="input"
                    rows={2}
                    value={note}
                    placeholder="Yapılan işlem, gönderilen parça, iptal sebebi…"
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    variant="ghost"
                    loading={advance.isPending}
                    onClick={() => move('iptal')}
                  >
                    İptal et
                  </Button>
                  {isManufacturer && nextStatus && (
                    <Button loading={advance.isPending} onClick={() => move(nextStatus)}>
                      {SSH_STATUS_META[nextStatus].label} olarak işaretle
                    </Button>
                  )}
                </div>

                {advance.isError && (
                  <p role="alert" className="text-xs text-red-600">
                    Durum güncellenemedi.
                  </p>
                )}
              </section>
            )}

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <Button variant="secondary" onClick={onClose}>
                Kapat
              </Button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
