import React, { useState, useMemo } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';

interface TransferItemModalProps {
  visible: boolean;
  onHide: () => void;
  itemTitle: string;
  attendees: any[];
  currentUserId?: string;
  currentUserName?: string;
  onTransfer: (targetAttendee: any) => Promise<void>;
}

export const TransferItemModal: React.FC<TransferItemModalProps> = ({
  visible,
  onHide,
  itemTitle,
  attendees,
  currentUserId,
  currentUserName,
  onTransfer,
}) => {
  const [search, setSearch] = useState('');
  const [selectedAttendee, setSelectedAttendee] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Filter out current user from candidate list
  const candidateAttendees = useMemo(() => {
    return attendees.filter((a) => {
      const aId = a.id || a._id;
      const aName = a.name?.trim().toLowerCase();
      const isCurrent =
        (currentUserId && aId === currentUserId) ||
        (currentUserName && aName === currentUserName.trim().toLowerCase());
      return !isCurrent;
    });
  }, [attendees, currentUserId, currentUserName]);

  const filteredAttendees = useMemo(() => {
    if (!search.trim()) return candidateAttendees;
    const query = search.trim().toLowerCase();
    return candidateAttendees.filter((a) => a.name?.toLowerCase().includes(query));
  }, [candidateAttendees, search]);

  const handleConfirmTransfer = async () => {
    if (!selectedAttendee) return;
    setLoading(true);
    try {
      await onTransfer(selectedAttendee);
      onHide();
      setSelectedAttendee(null);
      setSearch('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      visible={visible}
      onHide={() => {
        onHide();
        setSelectedAttendee(null);
        setSearch('');
      }}
      header={
        <div className="flex align-items-center gap-2">
          <i className="pi pi-share-alt text-yellow-400 text-xl font-bold" />
          <span className="font-bold text-white text-lg">Agendapunkt übertragen</span>
        </div>
      }
      style={{ width: '95vw', maxWidth: '480px' }}
      className="p-fluid comic-dialog"
      modal
      dismissableMask
    >
      <div className="flex flex-column gap-3 pt-2">
        <div>
          <span className="text-xs text-gray-400">Ausgewählter Agendapunkt:</span>
          <div className="font-bold text-white text-base mt-1 word-break-break-word">
            „{itemTitle}“
          </div>
        </div>

        <p className="text-gray-300 text-sm m-0">
          Wähle eine Person aus, an die du diesen Punkt übertragen möchtest. Der Empfänger erhält eine Benachrichtigung und kann die Übernahme bestätigen:
        </p>

        {candidateAttendees.length > 5 && (
          <div className="p-input-icon-left">
            <i className="pi pi-search" />
            <InputText
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Teilnehmer suchen..."
              className="p-inputtext-sm"
            />
          </div>
        )}

        {candidateAttendees.length === 0 ? (
          <div className="text-center p-3 text-gray-400 border-1 border-dashed border-gray-700 border-round">
            Keine weiteren Teilnehmer in dieser Agenda vorhanden.
          </div>
        ) : (
          <div className="flex flex-column gap-2 max-h-20rem overflow-y-auto pr-1">
            {filteredAttendees.map((att, idx) => {
              const attId = att.id || att._id || att.name;
              const isSelected = selectedAttendee && (selectedAttendee.id === att.id || selectedAttendee._id === att._id || selectedAttendee.name === att.name);
              const personColors = ['#0a4b7c', '#8b0000', '#006400', '#4b0082', '#b8860b', '#008b8b', '#8b008b', '#2f4f4f'];
              const chipColor = att.cardColor || personColors[idx % personColors.length];

              return (
                <div
                  key={attId}
                  onClick={() => setSelectedAttendee(att)}
                  className={`p-2 border-round border-1 flex align-items-center justify-content-between cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-yellow-900 border-yellow-400 text-white'
                      : 'bg-gray-900 border-gray-700 hover:border-gray-500 text-gray-200'
                  }`}
                  style={{
                    border: isSelected ? '2px solid #eab308' : '2px solid #000000',
                    boxShadow: '2px 2px 0px #000000',
                  }}
                  data-testid={`transfer-target-${att.name}`}
                >
                  <div className="flex align-items-center gap-2">
                    <span
                      className="inline-flex align-items-center justify-content-center border-circle"
                      style={{
                        width: '2rem',
                        height: '2rem',
                        background: chipColor,
                        border: '1px solid #000',
                      }}
                    >
                      {att.avatarUrl ? (
                        <img
                          src={att.avatarUrl}
                          alt={att.name}
                          className="border-circle object-cover w-full h-full"
                        />
                      ) : (
                        <i className="pi pi-user text-white text-xs" />
                      )}
                    </span>
                    <span className="font-bold text-sm">{att.name}</span>
                  </div>

                  {isSelected && (
                    <i className="pi pi-check-circle text-yellow-400 text-lg font-bold" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-content-end gap-2 mt-2">
          <Button
            label="Abbrechen"
            icon="pi pi-times"
            text
            className="p-button-secondary font-bold text-sm"
            onClick={() => {
              onHide();
              setSelectedAttendee(null);
            }}
          />
          <Button
            label="Übertragen"
            icon="pi pi-send"
            className="p-button-warning comic-button font-bold text-sm"
            disabled={!selectedAttendee || loading}
            loading={loading}
            onClick={handleConfirmTransfer}
            data-testid="confirm-transfer-btn"
          />
        </div>
      </div>
    </Dialog>
  );
};
