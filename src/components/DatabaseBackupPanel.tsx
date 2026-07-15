import { useState, useRef, ChangeEvent } from 'react';
import { Database, Download, Upload, ShieldAlert, CheckCircle, ArrowRight } from 'lucide-react';
import { api } from '../api';

export default function DatabaseBackupPanel() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExporting(true);
    setErrorMsg(null);
    try {
      const data = await api.get('/api/admin/export');
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(data, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `kohartist_mongodb_export_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err: any) {
      console.error('Export failed:', err);
      setErrorMsg('Failed to generate export file.');
    } finally {
      setExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setErrorMsg(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.collections) {
          throw new Error('Invalid file format. Missing "collections" field.');
        }

        const res = await api.post('/api/admin/import', json);
        setImportResult(res);
      } catch (err: any) {
        console.error('Import failed:', err);
        setErrorMsg(err.message || 'Failed to parse or import JSON backup file.');
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-[#0F0F0F] border border-[#222] rounded-3xl p-6 mt-6" id="database-backup-panel">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-[#F27D26]/10 border border-[#F27D26]/20 text-[#F27D26] flex items-center justify-center shrink-0">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">MongoDB & JSON Data Management</h3>
          <p className="text-xs text-gray-500">Easily export and import platform database states</p>
        </div>
      </div>

      <div className="bg-[#111] rounded-2xl p-4 border border-[#222]/40 mb-6 text-xs text-gray-400 leading-relaxed space-y-2">
        <p>
          <strong className="text-white">Seamless MongoDB Host Integration:</strong> Kohartist utilizes a high-performance database schema compatible with MongoDB. You can run it with any managed database or export the collections to an external cluster.
        </p>
        <p>
          To change target clusters, simply configure the <code className="text-xs bg-gray-950 px-1.5 py-0.5 rounded text-[#F27D26]">MONGO_URI</code> environment variable inside your host system's configuration panel.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Export Card */}
        <div className="bg-gray-900/40 border border-[#222] rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-[#F27D26]" /> Download Backup
            </h4>
            <p className="text-[11px] text-gray-400 mb-4">
              Download all registered artists, past sets, live streams, and tipping ledger history as a structured JSON file compatible with mongoimport.
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full bg-[#161616] hover:bg-[#222] border border-[#222] rounded-xl py-2.5 text-xs font-bold text-white transition-all flex items-center justify-center gap-2"
          >
            {exporting ? (
              <span className="w-4 h-4 border-2 border-t-[#F27D26] border-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-[#F27D26]" />
                EXPORT DATABASE JSON
              </>
            )}
          </button>
        </div>

        {/* Import Card */}
        <div className="bg-gray-900/40 border border-[#222] rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-emerald-400" /> Restore Backup
            </h4>
            <p className="text-[11px] text-gray-400 mb-4">
              Restore previous tipping platform records by uploading your exported Kohartist JSON database file. This will upsert matching records.
            </p>
          </div>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
          
          <button
            onClick={handleImportClick}
            disabled={importing}
            className="w-full bg-[#161616] hover:bg-emerald-950/20 border border-[#222] hover:border-emerald-500/30 rounded-xl py-2.5 text-xs font-bold text-white transition-all flex items-center justify-center gap-2"
          >
            {importing ? (
              <span className="w-4 h-4 border-2 border-t-emerald-400 border-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                RESTORE FROM JSON FILE
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3.5 flex gap-2.5 text-xs">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <p>{errorMsg}</p>
        </div>
      )}

      {importResult && (
        <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-3.5 text-xs space-y-2">
          <div className="flex gap-2.5 items-center">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <p className="font-bold">Database import completed successfully!</p>
          </div>
          <div className="font-mono text-[11px] text-gray-400 pl-6 space-y-0.5">
            <div>• Artists synchronized: {importResult.summary?.artists ?? 0}</div>
            <div>• Events restored: {importResult.summary?.events ?? 0}</div>
            <div>• Tips ledger restored: {importResult.summary?.tips ?? 0}</div>
          </div>
        </div>
      )}
    </div>
  );
}
