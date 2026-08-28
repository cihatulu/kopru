import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { TH as TH_SHARED } from '@/components/ui/Table';
import { downloadCSV } from '@/lib/csv';
import {
  buildDetailReport,
  toCsvRows,
  type ReportKind,
  type ReportSources,
} from '../domain/reportColumns';

const TH = TH_SHARED;
const SELECT = 'w-full sm:w-auto border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500/20 outline-none bg-white';
const FILTER_LABEL = 'text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1';

const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' } as const;

interface Props {
  kind: ReportKind;
  sources: ReportSources;
  categories: string[];
  onClose: () => void;
}

/** Rapor Detay Modalı — Masaüstünde geniş tablo, mobilde Akıllı Kartlar. */
export function ReportDetailModal({ kind, sources, categories, onClose }: Props) {
  const [category, setCategory] = useState('');
  const [order, setOrder] = useState<'desc' | 'asc'>('desc');

  const report = useMemo(() => buildDetailReport(kind, sources), [kind, sources]);

  const rows = useMemo(() => {
    const filtered = category ? report.rows.filter((r) => r.category === category) : report.rows;
    return [...filtered].sort((a, b) => (order === 'desc' ? b.metric - a.metric : a.metric - b.metric));
  }, [report, category, order]);

  return (
    <Modal
      label={report.title}
      panelClassName="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-left"
      onClose={onClose}
    >
      {/* Modal Başlığı */}
      <div className="flex justify-between items-center px-4 sm:px-6 py-3.5 border-b bg-slate-50">
        <h3 className="text-sm sm:text-base font-bold text-slate-800">{report.title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="size-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-xl font-light cursor-pointer"
        >
          ×
        </button>
      </div>

      {/* Filtre ve İndir Butonları */}
      <div className="p-3.5 sm:p-4 border-b flex flex-wrap gap-3 items-end justify-between bg-white">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {report.hasCategory && (
            <div className="w-full sm:w-auto">
              <label className={FILTER_LABEL}>Kategori Filtrele</label>
              <select className={SELECT} value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Tüm Kategoriler</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}
          <div className="w-full sm:w-auto">
            <label className={FILTER_LABEL}>Sıralama</label>
            <select
              className={SELECT}
              value={order}
              onChange={(e) => setOrder(e.target.value === 'asc' ? 'asc' : 'desc')}
            >
              <option value="desc">Azalan (En yüksek öncelikli)</option>
              <option value="asc">Artan (En düşük öncelikli)</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => downloadCSV(report.headers, toCsvRows(report, rows), report.fileName)}
          className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-2xs transition-colors cursor-pointer text-center"
        >
          Excel İndir (.csv)
        </button>
      </div>

      {/* İçerik: Mobilde Akıllı Kartlar + Masaüstünde Tablo */}
      <div className="flex-1 overflow-auto p-4 sm:p-0 scrollbar-thin">
        {/* 📱 MOBİL GÖRÜNÜM: Akıllı Kartlar (md altı ekranlar) */}
        <div className="space-y-3 md:hidden">
          {rows.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs font-semibold text-slate-400">
              Gösterilecek veri bulunmuyor.
            </div>
          )}

          {rows.map((row) => (
            <div
              key={row.key}
              className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs hover:shadow-md transition-shadow"
            >
              {/* Kart Başlığı: Başlık & Metrik Rozeti */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-bold text-slate-900 block truncate" title={row.title}>
                    {row.title}
                  </span>
                  {row.subtitle && (
                    <span className="text-xs font-medium text-slate-400 block mt-0.5">
                      {row.subtitle}
                    </span>
                  )}
                </div>

                {/* İlk Hücre / Ana Metrik Rozeti */}
                {row.cells[0] && (
                  <div className="shrink-0 text-right">
                    {row.cells[0].badge ? (
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${row.cells[0].badge}`}>
                        {row.cells[0].text}
                      </span>
                    ) : (
                      <span className="text-sm font-black text-slate-900 font-mono">
                        {row.cells[0].text}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Kart Gövdesi: Kategori ve Diğer Bilgiler */}
              <div className="flex items-center justify-between gap-2 pt-2.5 text-xs">
                {report.hasCategory && (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    {row.category ?? '—'}
                  </span>
                )}

                {/* Varsa diğer hücreler (2. hücre ve sonrası) */}
                {row.cells.slice(1).map((cell, i) => (
                  <div key={i} className="text-right">
                    {cell.badge ? (
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${cell.badge}`}>
                        {cell.text}
                      </span>
                    ) : (
                      <span className="font-bold text-slate-800">
                        {cell.text}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 🖥️ MASAÜSTÜ GÖRÜNÜM: Geniş Tablo (md ve üzeri) */}
        <div className="hidden md:block">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                {report.tableHeaders.map((h, i) => (
                  <th key={h} className={`${TH} ${i === 0 ? 'text-left' : 'text-center'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100 text-sm">
              {rows.map((row) => (
                <tr key={row.key} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-bold text-slate-800">{row.title}</div>
                    {row.subtitle && <div className="text-xs text-slate-400 mt-0.5">{row.subtitle}</div>}
                  </td>
                  {report.hasCategory && (
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">{row.category ?? '—'}</td>
                  )}
                  {row.cells.map((cell, i) => (
                    <td key={i} className={`px-6 py-4 whitespace-nowrap font-semibold text-slate-700 ${ALIGN[cell.align]}`}>
                      {cell.badge ? (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${cell.badge}`}>
                          {cell.text}
                        </span>
                      ) : (
                        cell.text
                      )}
                    </td>
                  ))}
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={report.tableHeaders.length} className="px-6 py-8 text-center text-slate-400 italic">
                    Gösterilecek veri bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
