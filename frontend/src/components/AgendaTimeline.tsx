import { useState, useRef } from 'react';
import { Timeline } from 'primereact/timeline';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Badge } from 'primereact/badge';
import {
  MDXEditor,
  type MDXEditorMethods,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  ListsToggle,
  BlockTypeSelect,
  CreateLink,
  InsertImage
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';

const EDITOR_PLUGINS = [
  headingsPlugin(),
  listsPlugin(),
  quotePlugin(),
  thematicBreakPlugin(),
  markdownShortcutPlugin(),
  linkPlugin(),
  linkDialogPlugin(),
  imagePlugin(),
  toolbarPlugin({
    toolbarContents: () => (
      <>
        <UndoRedo />
        <BoldItalicUnderlineToggles />
        <BlockTypeSelect />
        <ListsToggle />
        <CreateLink />
        <InsertImage />
      </>
    )
  })
];

const READONLY_PLUGINS = [
  headingsPlugin(),
  listsPlugin(),
  quotePlugin(),
  thematicBreakPlugin(),
  linkPlugin(),
  imagePlugin()
];

interface AgendaItem {
  _id?: string;
  title: string;
  description?: string;
  author?: string;
  createdBy?: string;
  imageUrl?: string;
  completed?: boolean;
  upvotes?: string[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface Props {
  agenda?: any;
  items: AgendaItem[];
  attendees?: any[];
  currentUser: any;
  isCreator?: boolean;
  onUpdate: (items: AgendaItem[]) => Promise<void>;
  onUpdateAgenda?: (updates: any) => Promise<void>;
}

export default function AgendaTimeline({ agenda, items, attendees = [], currentUser, isCreator = true, onUpdate, onUpdateAgenda }: Props) {
  const [visible, setVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<MDXEditorMethods>(null);
  const [editorKey, setEditorKey] = useState(0);

  const getAuthorName = (item: AgendaItem) => {
    if (item.createdBy) {
      const attendee = attendees.find((a: any) =>
        (a.id && a.id === item.createdBy) ||
        (a._id && a._id === item.createdBy) ||
        (a.name && a.name.trim().toLowerCase() === item.createdBy?.trim().toLowerCase())
      );
      if (attendee) return attendee.name;
    }
    if (item.author && item.author !== 'Unbekannt') {
      return item.author;
    }
    return item.createdBy || item.author || 'Unbekannt';
  };

  let isClosed = !!(agenda && agenda.isManuallyClosed);
  if (!isClosed && agenda && agenda.date) {
    const agendaDate = new Date(agenda.date).getTime();
    const offsetMs = (agenda.closeBeforeHours ?? 12) * 60 * 60 * 1000;
    isClosed = Date.now() > agendaDate - offsetMs;
  }

  const toggleManualClose = async () => {
    if (onUpdateAgenda) {
      await onUpdateAgenda({ isManuallyClosed: !agenda?.isManuallyClosed });
    }
  };

  const openNew = () => {
    setTitle('');
    setDescription('');
    setImageUrl('');
    setEditingIndex(null);
    setShowDetails(false);
    if (editorRef.current) {
      editorRef.current.setMarkdown('');
    } else {
      setEditorKey(k => k + 1);
    }
    setVisible(true);
  };

  const openEdit = (index: number) => {
    const item = items[index];
    const newDesc = item.description || '';
    setTitle(item.title);
    setDescription(newDesc);
    setImageUrl(item.imageUrl || '');
    setEditingIndex(index);
    setShowDetails(!!(item.description || item.imageUrl));
    if (editorRef.current) {
      editorRef.current.setMarkdown(newDesc);
    } else {
      setEditorKey(k => k + 1);
    }
    setVisible(true);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const rawData = evt.target?.result as string;
        if (!rawData) return;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setImageUrl(compressedDataUrl);
        };
        img.src = rawData;
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleCompleted = async (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    let updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      completed: !updatedItems[index].completed,
      updatedAt: new Date().toISOString()
    };
    await onUpdate(updatedItems);
  };

  const toggleUpvote = async (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const userId = currentUser?.id || currentUser?._id || currentUser?.name;
    if (!userId) return;

    let updatedItems = [...items];
    const item = { ...updatedItems[index] };
    const upvotes = item.upvotes || [];

    if (upvotes.includes(userId)) {
      item.upvotes = upvotes.filter((id: string) => id !== userId);
    } else {
      item.upvotes = [...upvotes, userId];
    }

    item.updatedAt = new Date().toISOString();

    updatedItems[index] = item;
    await onUpdate(updatedItems);
  };

  const deleteItem = async (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updatedItems = items.filter((_, i) => i !== index);
    await onUpdate(updatedItems);
  };

  const sortByDate = async () => {
    const sorted = [...items].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateA - dateB;
    });
    await onUpdate(sorted);
  };

  const sortByRating = async () => {
    const sorted = [...items].sort((a, b) => {
      const votesA = a.upvotes?.length || 0;
      const votesB = b.upvotes?.length || 0;
      return votesB - votesA;
    });
    await onUpdate(sorted);
  };

  const sortRandomly = async () => {
    const sorted = [...items].sort(() => Math.random() - 0.5);
    await onUpdate(sorted);
  };

  const saveItem = async () => {
    if (!title.trim()) return;

    let updatedItems = [...items];
    if (editingIndex !== null) {
      updatedItems[editingIndex] = {
        ...updatedItems[editingIndex],
        title,
        description,
        imageUrl,
        updatedAt: new Date().toISOString()
      };
    } else {
      const authorName = currentUser?.name || 'Unbekannt';
      const createdById = currentUser?.id || currentUser?._id || authorName;
      updatedItems.push({
        title,
        description,
        imageUrl,
        author: authorName,
        createdBy: createdById,
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    await onUpdate(updatedItems);
    setVisible(false);
  };

  const customizedMarker = (item: AgendaItem, index: number) => {
    const isCompleted = !!item.completed;
    return (
      <span
        onClick={(e) => toggleCompleted(index, e)}
        className="flex w-2rem h-2rem align-items-center justify-content-center border-circle z-1 shadow-1 cursor-pointer transition-transform hover:scale-110"
        style={{ backgroundColor: '#eab308' }}
        title={isCompleted ? "Als noch nicht besprochen markieren" : "Als besprochen markieren"}
      >
        {isCompleted ? (
          <i className="pi pi-check text-gray-900 font-bold"></i>
        ) : (
          <span className="border-circle" style={{ width: '0.65rem', height: '0.65rem', backgroundColor: '#111827', display: 'block' }} />
        )}
      </span>
    );
  };

  const customizedContent = (item: AgendaItem, index: number) => {
    const hasDetails = !!item.description || !!item.imageUrl || (item.upvotes && item.upvotes.length > 0);
    const isCompleted = !!item.completed;
    const currentUserId = currentUser?.id || currentUser?._id || currentUser?.name;
    const hasUpvoted = (item.upvotes || []).includes(currentUserId);
    const upvoteCount = item.upvotes?.length || 0;

    return (
      <div className={`mb-4 comic-panel-dark p-3 sm:p-4 transition-opacity ${isCompleted ? 'opacity-80' : ''}`}>
        <div className="flex flex-column sm:flex-row justify-content-between align-items-start sm:align-items-center mb-2 gap-2">
          <div className="flex-1 min-w-0 w-full sm:w-auto">
            <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
              {item.createdAt && (
                <span className="flex align-items-center gap-1" title="Erstellt am">
                  <i className="pi pi-calendar-plus" style={{ fontSize: '0.7rem' }}></i>
                  {new Date(item.createdAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {item.updatedAt && (
                <span className="flex align-items-center gap-1" title="Zuletzt bearbeitet am">
                  <i className="pi pi-pencil" style={{ fontSize: '0.7rem' }}></i>
                  {new Date(item.updatedAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <div className={`text-xl font-bold mb-1 word-break-break-word ${isCompleted ? 'line-through text-gray-400' : ''}`}>
              {item.title}
            </div>
            <div className="text-sm text-gray-400">Erstellt von: {getAuthorName(item)}</div>
          </div>
          <div className="flex gap-1 sm:gap-2 align-items-center flex-wrap self-end sm:self-center mt-2 sm:mt-0">
            <Button
              text
              rounded
              className={`p-button-sm ${hasUpvoted ? "text-yellow-400" : "text-gray-400 hover:text-yellow-400"}`}
              title="Daumen hoch"
              onClick={(e) => toggleUpvote(index, e)}
            >
              <i className={`pi ${hasUpvoted ? 'pi-thumbs-up-fill' : 'pi-thumbs-up'} text-xl`}></i>
              {upvoteCount > 0 && (
                <Badge value={upvoteCount} severity="warning" className="ml-2"></Badge>
              )}
            </Button>
            <Button
              icon={isCompleted ? "pi pi-check-circle" : "pi pi-circle"}
              rounded
              text
              className={isCompleted ? "text-yellow-400" : "text-gray-400 hover:text-yellow-400"}
              title={isCompleted ? "Als noch nicht besprochen markieren" : "Als besprochen markieren"}
              onClick={(e) => toggleCompleted(index, e)}
            />
            <Button icon="pi pi-pencil" rounded text className="text-gray-400 hover:text-yellow-400" title="Bearbeiten" onClick={() => openEdit(index)} />
            <Button icon="pi pi-trash" rounded text className="text-gray-400 hover:text-red-400" title="Löschen" onClick={(e) => deleteItem(index, e)} />
            <Button
              icon="pi pi-angle-down"
              rounded
              text
              disabled={!hasDetails}
              className={hasDetails ? "text-gray-400 hover:text-yellow-400" : "text-gray-600 opacity-40"}
              title={hasDetails ? "Details anzeigen/einklappen" : "Keine Details vorhanden"}
              onClick={(e) => {
                if (!hasDetails) return;
                const cardEl = e.currentTarget.closest('.comic-panel-dark');
                const detailsEl = cardEl?.querySelector('.agenda-details-container');
                if (detailsEl) {
                  detailsEl.classList.toggle('hidden');
                }
              }}
            />
          </div>
        </div>

        {hasDetails && (
          <div className="agenda-details-container hidden mt-3 pt-3 border-top-1 border-gray-700 text-gray-300 line-height-3">
            <div className="flex flex-column md:flex-row gap-4 align-items-start justify-content-between">
              {/* Links: Details-Text */}
              <div className="flex-1 min-w-0">
                {item.description && (
                  <MDXEditor
                    markdown={item.description}
                    readOnly
                    plugins={READONLY_PLUGINS}
                  />
                )}
                {item.upvotes && item.upvotes.length > 0 && (
                  <div className="mt-3 text-sm text-gray-400 bg-gray-800 p-2 border-round inline-block">
                    <i className="pi pi-thumbs-up mr-2 text-yellow-500"></i>
                    <span className="font-bold text-gray-300">Daumen hoch von: </span>
                    {item.upvotes.map((id: string) => {
                      const attendee = attendees.find((a: any) => a.id === id || a._id === id || a.name === id);
                      return attendee ? attendee.name : id;
                    }).join(', ')}
                  </div>
                )}
              </div>

              {/* Rechts: Bild (unverzerrt & skaliert) */}
              {item.imageUrl && (
                <div className="border-round-lg overflow-hidden flex-shrink-0 bg-black-alpha-40 border-1 border-gray-700 w-full md:w-auto p-1 self-center md:self-start">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-auto border-round cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ maxHeight: '220px', maxWidth: '280px', width: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                    onClick={() => setSelectedPreviewImage(item.imageUrl || null)}
                    title="Klicken zum Vergrößern"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mb-6">
      <div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center mb-4 gap-3">
        <h3 className="text-2xl m-0 text-yellow-500 font-medium font-luckiest">Agendapunkte</h3>

        <div className="flex gap-2 flex-wrap align-items-center justify-content-between w-full md:w-auto">
          {items && items.length > 1 && (
            <div className="flex gap-2 align-items-center">
              <Button icon="pi pi-calendar" onClick={sortByDate} className="comic-button-secondary flex-shrink-0" title="Nach Datum sortieren" />
              <Button icon="pi pi-thumbs-up" onClick={sortByRating} className="comic-button-secondary flex-shrink-0" title="Nach Bewertung sortieren" />
              <Button icon="mdi mdi-dice-multiple" onClick={sortRandomly} className="comic-button-secondary flex-shrink-0" title="Zufällig sortieren" />
            </div>
          )}

          {items && items.length > 1 && isCreator && (
            <div className="border-left-2 border-gray-600 mx-1 align-self-center" style={{ height: '2.2rem' }} />
          )}

          {isCreator && (
            <div className="flex gap-2 flex-wrap ml-auto md:ml-0">
              <Button
                icon={agenda?.isManuallyClosed ? "pi pi-lock-open" : "pi pi-lock"}
                onClick={toggleManualClose}
                className="comic-button-secondary flex-shrink-0"
                title={agenda?.isManuallyClosed ? "Agenda öffnen" : "Agenda schließen"}
              />
            </div>
          )}
        </div>
      </div>

      {isClosed && (
        <div className="p-3 mb-4 border-round-xl border-3 border-black text-center" style={{ backgroundColor: 'var(--gray-800)', boxShadow: '4px 4px 0px #000' }}>
          <i className="pi pi-lock text-yellow-500 text-3xl mb-2"></i>
          <h3 className="m-0 text-white font-luckiest tracking-wider text-xl">Agenda ist geschlossen</h3>
          <p className="m-0 text-sm mt-1 text-gray-400 font-bold">Der Annahmeschluss wurde erreicht. Es können keine neuen Punkte hinzugefügt werden.</p>
        </div>
      )}

      {items && items.length > 0 ? (
        <Timeline
          align="left"
          value={items}
          content={(item) => customizedContent(item, items.indexOf(item))}
          marker={(item) => customizedMarker(item, items.indexOf(item))}
          className="w-full"
        />
      ) : (
        <p className="text-gray-400 mb-4">Noch keine Agendapunkte vorhanden.</p>
      )}



      {/* Floating Action Button (FAB) */}
      {!isClosed && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000 }}>
          <Button
            icon="pi pi-plus text-2xl font-bold"
            onClick={openNew}
            className="p-button-warning comic-button border-circle flex align-items-center justify-content-center p-0 shadow-none"
            style={{ width: '3.75rem', height: '3.75rem' }}
            title="Neuen Agendapunkt hinzufügen"
          />
        </div>
      )}

      {/* Edit / New Item Dialog */}
      <Dialog
        header={editingIndex !== null ? 'Agendapunkt bearbeiten' : 'Neuer Agendapunkt'}
        visible={visible}
        style={{ width: '96vw', maxWidth: '1200px' }}
        contentStyle={{ maxHeight: '82vh', overflowY: 'auto' }}
        onHide={() => setVisible(false)}
        onShow={() => {
          setTimeout(() => {
            titleInputRef.current?.focus();
          }, 50);
        }}
        className="glass-panel"
      >
        <div className="flex flex-column gap-3 pt-3">
          <div className="p-inputgroup">
            <span className="p-inputgroup-addon bg-gray-700 border-gray-600"><i className="pi pi-bookmark"></i></span>
            <InputText ref={titleInputRef} placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus className="bg-gray-800 text-white border-gray-600" />
          </div>

          {/* Toggle Button for Details & Bild */}
          <div className="border-top-1 border-gray-700 pt-2 flex align-items-center">
            <Button
              icon={showDetails ? "pi pi-chevron-up" : "pi pi-chevron-down"}
              label={showDetails ? "Details & Bild einklappen" : "Details & Bild hinzufügen..."}
              text
              className="text-gray-400 hover:text-yellow-400 p-0 text-sm font-bold"
              onClick={() => setShowDetails(!showDetails)}
            />
          </div>

          {showDetails && (
            <div className="flex flex-column gap-3">
              {/* Bild Upload / URL Feld */}
              <div className="flex flex-column gap-2">
                <label className="text-sm font-bold text-gray-300">Bild hinzufügen:</label>
                <div className="flex gap-2 align-items-center flex-wrap">
                  <input
                    type="file"
                    accept="image/*"
                    id="agenda-image-upload"
                    className="hidden"
                    onChange={handleImageFileChange}
                  />
                  <label
                    htmlFor="agenda-image-upload"
                    className="p-button p-button-outlined p-button-warning cursor-pointer flex align-items-center gap-2 text-sm py-2 px-3 border-round"
                  >
                    <i className="pi pi-upload"></i>
                    <span>Bild von Gerät hochladen</span>
                  </label>
                  <span className="text-gray-400 text-xs">oder URL:</span>
                  <InputText
                    placeholder="https://..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="bg-gray-800 text-white flex-1 text-sm p-2 border-gray-600"
                  />
                  {imageUrl && (
                    <Button
                      icon="pi pi-times"
                      rounded
                      text
                      className="text-red-400"
                      title="Bild entfernen"
                      onClick={() => setImageUrl('')}
                    />
                  )}
                </div>
                {imageUrl && (
                  <div className="mt-2 border-round overflow-hidden max-h-12rem bg-black-alpha-40 flex justify-content-center p-2 border-1 border-gray-700 relative">
                    <img src={imageUrl} alt="Vorschau" className="max-h-10rem object-contain border-round" />
                  </div>
                )}
              </div>

              <div className="flex flex-column gap-2">
                <label className="text-sm font-bold text-gray-300">Details:</label>
                <MDXEditor
                  key={editorKey}
                  ref={editorRef}
                  markdown={description}
                  onChange={(newMarkdown) => setDescription(newMarkdown)}
                  placeholder="Details eingeben..."
                  plugins={EDITOR_PLUGINS}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            {editingIndex !== null && (
              <Button
                label="Löschen"
                icon="pi pi-trash"
                onClick={async () => {
                  await deleteItem(editingIndex);
                  setVisible(false);
                }}
                className="p-button-danger p-button-outlined flex-1"
              />
            )}
            <Button label="Speichern" icon="pi pi-check" onClick={saveItem} className="p-button-warning flex-1" disabled={!title.trim()} />
          </div>
        </div>
      </Dialog>

      {/* Lightbox Modal for enlarged image */}
      <Dialog
        visible={!!selectedPreviewImage}
        onHide={() => setSelectedPreviewImage(null)}
        header="Bildansicht"
        style={{ width: '90vw', maxWidth: '1000px' }}
        className="glass-panel"
        modal
      >
        {selectedPreviewImage && (
          <div className="flex justify-content-center p-2">
            <img src={selectedPreviewImage} alt="Vorschau" className="w-full h-full object-contain max-h-80vh border-round-lg" />
          </div>
        )}
      </Dialog>
    </div>
  );
}
