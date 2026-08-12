import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { downloadCSV } from '@/lib/csv';
import {
  buildDetailReport,
  toCsvRows,
  type ReportKind,
  type ReportSources,
} from '../domain/reportColumns';

const TH = 'px-6 py-3 text-xs font-bold text-slate-550 uppercase tracking-wider';
const SELECT = 'border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500/20 outline-none bg-white';
const FILTER_LABEL = 'text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1';

// Tam sınıf adı: Tailwind `text-${align}` kurgusunu üretim derlemesinde bulamaz.
const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' } as const;

interface Props {
  kind: ReportKind;
  sources: ReportSources;
  categories: string[];
  onClose: () => void;
}

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
      <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
        <h3 className="text-base font-bold text-slate-800">{report.title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-xl font-light cursor-pointer"
        >
          ×
        </button>
      </div>

      <div className="p-4 border-b flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {report.hasCategory && (
            <div>
              <label className={FILTER_LABEL}>Kategori Filtrele</label>
              <select className={SELECT} value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Tüm Kategoriler</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}
          <div>
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
          className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors cursor-pointer"
        >
          Excel İndir (.csv)
        </button>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin">
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
    </Modal>
  );
}
