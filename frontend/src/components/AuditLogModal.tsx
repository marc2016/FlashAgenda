import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface AuditEntry {
  _id?: string;
  action: string;
  user?: string;
  details?: string;
  timestamp: string | Date;
}

interface Props {
  agendaId: string;
  visible: boolean;
  onHide: () => void;
}

export default function AuditLogModal({ agendaId, visible, onHide }: Props) {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');

  useEffect(() => {
    if (visible && agendaId) {
      fetchAuditLogs();
    }
  }, [visible, agendaId]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/agendas/${agendaId}/audits`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (rowData: AuditEntry) => {
    if (!rowData.timestamp) return '-';
    try {
      const d = new Date(rowData.timestamp);
      return format(d, 'dd.MM.yyyy HH:mm:ss', { locale: de });
    } catch {
      return String(rowData.timestamp);
    }
  };

  return (
    <Dialog
      header={
        <div className="flex align-items-center gap-2">
          <i className="pi pi-history text-yellow-400 text-xl" />
          <span>Agenda Audit-Protokoll</span>
        </div>
      }
      visible={visible}
      onHide={onHide}
      style={{ width: '94vw', maxWidth: '1000px' }}
      contentStyle={{ maxHeight: '80vh', overflowY: 'auto' }}
      className="glass-panel"
      modal
      blockScroll
    >
      <div className="flex flex-column gap-3 pt-2">
        <div className="flex justify-content-between align-items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-0 flex align-items-center">
            <i className="pi pi-search text-gray-400 absolute z-2" style={{ left: '0.75rem', pointerEvents: 'none' }} />
            <InputText
              type="search"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Protokoll durchsuchen..."
              className="comic-input text-white text-sm w-full py-2 pr-3"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <Button
            icon="pi pi-refresh"
            onClick={fetchAuditLogs}
            className="comic-button-secondary p-button-sm flex-shrink-0"
            title="Aktualisieren"
            loading={loading}
          />
        </div>

        <div className="comic-input overflow-hidden border-round-xl">
          <DataTable
            value={logs}
            loading={loading}
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            globalFilter={globalFilter}
            emptyMessage="Keine Audit-Einträge vorhanden."
            className="p-datatable-sm text-sm"
            stripedRows
            responsiveLayout="scroll"
          >
            <Column
              field="timestamp"
              header="Zeitpunkt"
              body={formatDate}
              sortable
              style={{ width: '180px' }}
              className="text-yellow-400 font-bold"
            />
            <Column
              field="user"
              header="Benutzer"
              sortable
              style={{ width: '140px' }}
              className="font-bold text-white"
            />
            <Column
              field="action"
              header="Aktion"
              sortable
              style={{ width: '180px' }}
              body={(rowData: AuditEntry) => (
                <span className="p-1 px-2 border-round bg-yellow-500 text-gray-900 font-bold text-xs inline-block">
                  {rowData.action}
                </span>
              )}
            />
            <Column
              field="details"
              header="Details"
              body={(rowData: AuditEntry) => (
                <span className="text-gray-300 text-xs sm:text-sm">{rowData.details || '-'}</span>
              )}
            />
          </DataTable>
        </div>
      </div>
    </Dialog>
  );
}
