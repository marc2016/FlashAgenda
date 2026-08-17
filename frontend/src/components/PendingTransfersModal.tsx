import React, { useState, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { PersonChip, getAttendeeColor } from './PersonChip';

export interface IItemTransfer {
  toUserId?: string;
  toUserName: string;
  fromUserId?: string;
  fromUserName?: string;
  status: 'pending' | 'accepted' | 'rejected';
  transferredAt?: string | Date;
}

export interface PendingItem {
  _id?: string;
  id?: string;
  title: string;
  description?: string;
  author?: string;
  createdBy?: string;
  transferredTo?: IItemTransfer;
  [key: string]: any;
}

interface PendingTransfersModalProps {
  visible: boolean;
  onHide: () => void;
  items: PendingItem[];
  attendees: any[];
  onAccept: (item: PendingItem) => Promise<void>;
  onReject: (item: PendingItem) => Promise<void>;
  onBatchAccept: (items: PendingItem[]) => Promise<void>;
  onBatchReject: (items: PendingItem[]) => Promise<void>;
}

export const PendingTransfersModal: React.FC<PendingTransfersModalProps> = ({
  visible,
  onHide,
  items,
  attendees,
  onAccept,
  onReject,
  onBatchAccept,
  onBatchReject,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingBatch, setProcessingBatch] = useState(false);

  const lastItemsRef = useRef<PendingItem[]>(items);
  if (items && items.length > 0) {
    lastItemsRef.current = items;
  }
  const renderItems = items && items.length > 0 ? items : lastItemsRef.current;

  const getItemId = (item: PendingItem) => item._id || item.id || item.title;

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === renderItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(renderItems.map(getItemId));
    }
  };

  const handleSingleAccept = async (item: PendingItem) => {
    const id = getItemId(item);
    setProcessingId(id);
    try {
      if (items.length <= 1) {
        onHide();
      }
      await onAccept(item);
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    } finally {
      setProcessingId(null);
    }
  };

  const handleSingleReject = async (item: PendingItem) => {
    const id = getItemId(item);
    setProcessingId(id);
    try {
      if (items.length <= 1) {
        onHide();
      }
      await onReject(item);
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkAcceptAll = async () => {
    setProcessingBatch(true);
    try {
      onHide();
      await onBatchAccept(items);
      setSelectedIds([]);
    } finally {
      setProcessingBatch(false);
    }
  };

  const handleBulkRejectAll = async () => {
    setProcessingBatch(true);
    try {
      onHide();
      await onBatchReject(items);
      setSelectedIds([]);
    } finally {
      setProcessingBatch(false);
    }
  };

  const handleBulkAcceptSelected = async () => {
    const selectedItems = items.filter((it) => selectedIds.includes(getItemId(it)));
    if (selectedItems.length === 0) return;
    setProcessingBatch(true);
    try {
      if (selectedItems.length >= items.length) {
        onHide();
      }
      await onBatchAccept(selectedItems);
      setSelectedIds([]);
    } finally {
      setProcessingBatch(false);
    }
  };

  const handleBulkRejectSelected = async () => {
    const selectedItems = items.filter((it) => selectedIds.includes(getItemId(it)));
    if (selectedItems.length === 0) return;
    setProcessingBatch(true);
    try {
      if (selectedItems.length >= items.length) {
        onHide();
      }
      await onBatchReject(selectedItems);
      setSelectedIds([]);
    } finally {
      setProcessingBatch(false);
    }
  };

  const getSenderData = (item: PendingItem) => {
    const senderName = item.transferredTo?.fromUserName || item.author || item.createdBy || 'Jemand';
    const senderId = item.transferredTo?.fromUserId || item.createdBy;
    const { attendee, color } = getAttendeeColor(attendees, senderId || senderName);
    return { senderName, attendee, chipColor: color };
  };

  if (!renderItems || renderItems.length === 0) return null;

  return (
    <Dialog
      visible={visible && items.length > 0}
      onHide={onHide}
      header={
        <div className="flex align-items-center gap-2">
          <i className="pi pi-send text-yellow-400 text-xl font-bold" />
          <span className="font-bold text-white text-lg">Übertragene Agendapunkte</span>
        </div>
      }
      style={{ width: '95vw', maxWidth: '650px' }}
      className="p-fluid comic-dialog"
      modal
      dismissableMask
    >
      <div className="flex flex-column gap-3 pt-2">
        <p className="text-gray-300 text-sm m-0">
          Folgende Agendapunkte wurden dir übertragen. Du kannst diese einzeln oder gesammelt bestätigen oder ablehnen:
        </p>

        {/* Global batch toolbar if multiple items */}
        {items.length > 1 && (
          <div className="flex justify-content-between align-items-center bg-gray-900 border-round p-2 border-1 border-gray-700 flex-wrap gap-2">
            <div className="flex align-items-center gap-2">
              <Checkbox
                inputId="selectAllTransfers"
                onChange={handleSelectAll}
                checked={selectedIds.length === items.length && items.length > 0}
              />
              <label htmlFor="selectAllTransfers" className="text-xs text-gray-300 cursor-pointer font-bold select-none">
                {selectedIds.length === items.length ? 'Alle abwählen' : 'Alle auswählen'} ({selectedIds.length}/{items.length})
              </label>
            </div>

            <div className="flex gap-2 flex-wrap">
              {selectedIds.length > 0 && selectedIds.length < renderItems.length ? (
                <>
                  <Button
                    label={`Ausgewählte annehmen (${selectedIds.length})`}
                    icon="pi pi-check"
                    className="comic-button-success p-button-sm py-1 px-2 text-xs font-bold"
                    style={{ backgroundColor: '#16a34a', borderColor: '#000000', color: '#ffffff' }}
                    onClick={handleBulkAcceptSelected}
                    loading={processingBatch}
                  />
                  <Button
                    label={`Ausgewählte ablehnen (${selectedIds.length})`}
                    icon="pi pi-times"
                    className="comic-button-danger p-button-sm py-1 px-2 text-xs font-bold"
                    style={{ backgroundColor: '#dc2626', borderColor: '#000000', color: '#ffffff' }}
                    onClick={handleBulkRejectSelected}
                    loading={processingBatch}
                  />
                </>
              ) : (
                <>
                  <Button
                    label="Alle annehmen"
                    icon="pi pi-check"
                    className="comic-button-success p-button-sm py-1 px-3 text-xs font-bold"
                    style={{ backgroundColor: '#16a34a', borderColor: '#000000', color: '#ffffff' }}
                    onClick={handleBulkAcceptAll}
                    loading={processingBatch}
                  />
                  <Button
                    label="Alle ablehnen"
                    icon="pi pi-times"
                    className="comic-button-danger p-button-sm py-1 px-3 text-xs font-bold"
                    style={{ backgroundColor: '#dc2626', borderColor: '#000000', color: '#ffffff' }}
                    onClick={handleBulkRejectAll}
                    loading={processingBatch}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* Item List */}
        <div className="flex flex-column gap-2 max-h-30rem overflow-y-auto pr-1">
          {renderItems.map((item) => {
            const id = getItemId(item);
            const isSelected = selectedIds.includes(id);
            const isProcessing = processingId === id || processingBatch;
            const { senderName, attendee, chipColor } = getSenderData(item);

            return (
              <div
                key={id}
                className={`p-3 border-round border-1 flex flex-column sm:flex-row sm:align-items-center justify-content-between gap-3 transition-colors ${
                  isSelected ? 'bg-gray-800 border-yellow-500' : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                }`}
                style={{
                  border: '2px solid #000000',
                  boxShadow: '2px 2px 0px #000000',
                }}
              >
                <div className="flex align-items-start gap-3 flex-1 min-w-0">
                  {renderItems.length > 1 && (
                    <div className="pt-1">
                      <Checkbox
                        inputId={`cb_${id}`}
                        onChange={() => handleToggleSelect(id)}
                        checked={isSelected}
                      />
                    </div>
                  )}

                  <div className="flex flex-column gap-1 flex-1 min-w-0">
                    <div className="flex align-items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-base word-break-break-word">
                        {item.title}
                      </span>
                    </div>

                    <div className="flex align-items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">von:</span>
                      <PersonChip
                        name={senderName}
                        avatarUrl={attendee?.avatarUrl}
                        color={chipColor}
                        size="xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Individual Action Buttons */}
                <div className="flex align-items-center gap-2 self-end sm:self-center flex-shrink-0">
                  <Button
                    label="Bestätigen"
                    icon="pi pi-check"
                    className="comic-button-success p-button-sm text-xs py-2 px-3 font-bold flex align-items-center gap-1"
                    style={{
                      backgroundColor: '#16a34a',
                      borderColor: '#000000',
                      color: '#ffffff',
                    }}
                    onClick={() => handleSingleAccept(item)}
                    loading={isProcessing}
                    disabled={isProcessing}
                    data-testid={`accept-transfer-${id}`}
                  />
                  <Button
                    label="Ablehnen"
                    icon="pi pi-times"
                    className="comic-button-danger p-button-sm text-xs py-2 px-3 font-bold flex align-items-center gap-1"
                    style={{
                      backgroundColor: '#dc2626',
                      borderColor: '#000000',
                      color: '#ffffff',
                    }}
                    onClick={() => handleSingleReject(item)}
                    loading={isProcessing}
                    disabled={isProcessing}
                    data-testid={`reject-transfer-${id}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
};
