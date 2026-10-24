import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Checkbox } from 'primereact/checkbox';

interface Props {
  visible: boolean;
  onHide: () => void;
  agenda: {
    title: string;
    attendees?: any[];
    items?: any[];
    includeStandardItems?: boolean;
  };
  currentUser?: any;
}

// "Neue Agenda erstellen": copies title, selected people and selected (by default pinned) items into a new agenda
export default function CreateFollowUpAgendaDialog({ visible, onHide, agenda, currentUser }: Props) {
  const [selectedAttendeeKeys, setSelectedAttendeeKeys] = useState<string[]>([]);
  const [selectedItemKeys, setSelectedItemKeys] = useState<string[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newIncludeStandardItems, setNewIncludeStandardItems] = useState(false);

  // System standard items are recreated by the server and must not be copied over
  const getCopyableItems = (): any[] => ((agenda as any).items || []).filter((i: any) => !i.systemKey);

  // Preselect all people, pinned items and the standard items setting whenever the dialog opens
  useEffect(() => {
    if (!visible) return;
    const attendees = (agenda as any).attendees || [];
    const allAttKeys = attendees.map((a: any) => a._id || a.id || a.name);
    setSelectedAttendeeKeys(allAttKeys);

    const items = getCopyableItems();
    const pinnedKeys = items
      .filter((i: any) => i.pinned)
      .map((i: any, idx: number) => i._id || i.title || String(idx));
    setSelectedItemKeys(pinnedKeys);
    setNewIncludeStandardItems(!!agenda.includeStandardItems);
  }, [visible]);

  const toggleAttendeeKey = (key: string) => {
    setSelectedAttendeeKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleAllAttendees = () => {
    const attendees = (agenda as any).attendees || [];
    const allAttKeys = attendees.map((a: any) => a._id || a.id || a.name);
    if (selectedAttendeeKeys.length === allAttKeys.length) {
      setSelectedAttendeeKeys([]);
    } else {
      setSelectedAttendeeKeys(allAttKeys);
    }
  };

  const toggleItemKey = (key: string) => {
    setSelectedItemKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleAllItems = () => {
    const items = getCopyableItems();
    const allItemKeys = items.map((i: any, idx: number) => i._id || i.title || String(idx));
    if (selectedItemKeys.length === allItemKeys.length) {
      setSelectedItemKeys([]);
    } else {
      setSelectedItemKeys(allItemKeys);
    }
  };

  const handleConfirmCreateNew = async () => {
    setIsCreatingNew(true);
    try {
      const attendees = (agenda as any).attendees || [];
      const selectedAttendees = attendees
        .filter((a: any) => selectedAttendeeKeys.includes(a._id || a.id || a.name))
        .map((a: any) => ({
          id: a.id || a._id,
          name: a.name,
          avatarUrl: a.avatarUrl,
          joinedAt: new Date(),
          lastSeen: new Date()
        }));

      const items = getCopyableItems();
      const selectedItems = items
        .filter((i: any, idx: number) => selectedItemKeys.includes(i._id || i.title || String(idx)))
        .map((i: any) => ({
          title: i.title,
          description: i.description,
          author: 'System',
          createdBy: 'system',
          imageUrl: i.imageUrl,
          pinned: !!i.pinned,
          completed: false,
          upvotes: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));

      const response = await fetch('/api/agendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: agenda.title,
          attendees: selectedAttendees,
          items: selectedItems,
          includeStandardItems: newIncludeStandardItems,
          createdBy: currentUser?.id || currentUser?._id || currentUser?.name
        })
      });
      if (!response.ok) throw new Error('Failed to create agenda');
      const data = await response.json();
      if (data?._id) {
        localStorage.setItem(`flashagenda_created_${data._id}`, 'true');
        onHide();
        window.open(`/agenda/${data._id}`, '_blank');
      }
    } catch (err) {
      console.error('Error creating new agenda:', err);
    } finally {
      setIsCreatingNew(false);
    }
  };

  return (
  <Dialog
    header={
      <div className="flex align-items-center gap-2">
        <i className="pi pi-plus-circle text-yellow-400 text-xl" />
        <span>Neue Agenda erstellen</span>
      </div>
    }
    visible={visible}
    style={{ width: '92vw', maxWidth: '600px' }}
    onHide={onHide}
    className="glass-panel"
    modal
    blockScroll
  >
    <div className="flex flex-column gap-4 pt-2">
      <p className="text-gray-300 text-sm m-0 font-medium">
        Wähle Personen und Themen aus, die in die neue Agenda übernommen werden sollen:
      </p>

      {/* Section 1: Personen */}
      <div className="bg-gray-900 border-round p-3 border-1 border-gray-700">
        <div className="flex justify-content-between align-items-center mb-3">
          <span className="font-bold text-yellow-400 text-base flex align-items-center gap-2">
            <i className="pi pi-users text-sm"></i>
            Personen
          </span>
          {((agenda as any).attendees || []).length > 0 && (
            <Button
              label={selectedAttendeeKeys.length === ((agenda as any).attendees || []).length ? 'Alle abwählen' : 'Alle wählen'}
              text
              className="p-0 text-xs text-gray-400 hover:text-yellow-400 font-normal"
              onClick={toggleAllAttendees}
            />
          )}
        </div>

        {((agenda as any).attendees || []).length === 0 ? (
          <p className="text-gray-500 text-xs italic m-0">Keine Personen vorhanden</p>
        ) : (
          <div className="flex flex-column gap-2 max-h-12rem overflow-y-auto pr-1">
            {((agenda as any).attendees || []).map((att: any, idx: number) => {
              const key = att._id || att.id || att.name;
              const isChecked = selectedAttendeeKeys.includes(key);
              return (
                <div
                  key={key || idx}
                  className="flex align-items-center gap-3 p-2 border-round bg-gray-800 hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={() => toggleAttendeeKey(key)}
                >
                  <Checkbox
                    checked={isChecked}
                    onChange={() => {}}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-white text-sm font-semibold">{att.name}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Agenda-Themen */}
      <div className="bg-gray-900 border-round p-3 border-1 border-gray-700">
        <div className="flex justify-content-between align-items-center mb-3">
          <span className="font-bold text-yellow-400 text-base flex align-items-center gap-2">
            <i className="pi pi-list text-sm"></i>
            Agenda-Themen
          </span>
          {getCopyableItems().length > 0 && (
            <Button
              label={selectedItemKeys.length === getCopyableItems().length ? 'Alle abwählen' : 'Alle wählen'}
              text
              className="p-0 text-xs text-gray-400 hover:text-yellow-400 font-normal"
              onClick={toggleAllItems}
            />
          )}
        </div>

        {getCopyableItems().length === 0 ? (
          <p className="text-gray-500 text-xs italic m-0">Keine Agendapunkte vorhanden</p>
        ) : (
          <div className="flex flex-column gap-2 max-h-14rem overflow-y-auto pr-1">
            {getCopyableItems().map((item: any, idx: number) => {
              const key = item._id || item.title || String(idx);
              const isChecked = selectedItemKeys.includes(key);
              return (
                <div
                  key={key}
                  className="flex align-items-center justify-content-between p-2 border-round bg-gray-800 hover:bg-gray-700 cursor-pointer transition-colors gap-2"
                  onClick={() => toggleItemKey(key)}
                >
                  <div className="flex align-items-center gap-3 min-w-0 flex-1">
                    <Checkbox
                      checked={isChecked}
                      onChange={() => {}}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-white text-sm font-semibold word-break-break-word">{item.title}</span>
                  </div>
                  {item.pinned && (
                    <span className="text-yellow-400 text-xs font-bold flex align-items-center gap-1 bg-yellow-950-alpha px-2 py-1 border-round flex-shrink-0">
                      <i className="mdi mdi-pin text-xs"></i>
                      Angepinnt
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 3: Standardpunkte */}
      <div
        className="flex align-items-center gap-3 p-3 border-round bg-gray-900 border-1 border-gray-700 cursor-pointer"
        onClick={() => setNewIncludeStandardItems((v) => !v)}
      >
        <Checkbox
          inputId="new-include-standard-items"
          checked={newIncludeStandardItems}
          onChange={(e) => setNewIncludeStandardItems(!!e.checked)}
          onClick={(e) => e.stopPropagation()}
        />
        <span className="text-white text-sm font-semibold">
          Standardpunkte (Begrüßung, Neuer Termin, Location) übernehmen
        </span>
      </div>

      <div className="flex gap-2 justify-content-end mt-2">
        <Button
          label="Abbrechen"
          icon="pi pi-times"
          onClick={onHide}
          className="p-button-text text-gray-400 hover:text-white"
        />
        <Button
          label="Neue Agenda erstellen"
          icon="pi pi-check"
          loading={isCreatingNew}
          onClick={handleConfirmCreateNew}
          className="p-button-warning comic-button font-bold"
        />
      </div>
    </div>
  </Dialog>
  );
}
