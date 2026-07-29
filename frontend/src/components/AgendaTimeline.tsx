import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
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

import { Checkbox } from 'primereact/checkbox';
import { PollVoteModal, type IPoll } from './PollVoteModal';

interface AgendaItem {
  _id?: string;
  title: string;
  description?: string;
  author?: string;
  createdBy?: string;
  imageUrl?: string;
  completed?: boolean;
  upvotes?: string[];
  pinned?: boolean;
  poll?: IPoll;
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

// ─── Helper for sorting while retaining pinned items' positions ───────────
const sortWithPinned = (
  items: AgendaItem[],
  compareFn: (a: AgendaItem, b: AgendaItem) => number
): AgendaItem[] => {
  const unpinnedItems: AgendaItem[] = [];
  const result: (AgendaItem | null)[] = new Array(items.length).fill(null);

  items.forEach((item, index) => {
    if (item.pinned) {
      result[index] = item;
    } else {
      unpinnedItems.push(item);
    }
  });

  unpinnedItems.sort(compareFn);

  let unpinnedIdx = 0;
  for (let i = 0; i < result.length; i++) {
    if (result[i] === null) {
      result[i] = unpinnedItems[unpinnedIdx++];
    }
  }

  return result as AgendaItem[];
};

// ─── Memoized AgendaCard ───────────────────────────────────────────────────
interface AgendaCardProps {
  item: AgendaItem;
  index: number;
  currentUserId: string | undefined;
  attendees: any[];
  isCreator: boolean;
  onToggleCompleted: (index: number) => void;
  onToggleUpvote: (index: number) => void;
  onTogglePinned: (index: number) => void;
  onDelete: (index: number) => void;
  onEdit: (index: number) => void;
  onPreviewImage: (url: string) => void;
  onOpenVoteModal: (index: number) => void;
}

const AgendaCard = memo(function AgendaCard({
  item,
  index,
  currentUserId,
  attendees,
  onToggleCompleted,
  onToggleUpvote,
  onTogglePinned,
  onDelete,
  onEdit,
  onPreviewImage,
  onOpenVoteModal,
}: AgendaCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const hasDetails = !!(item.description || item.imageUrl || (item.upvotes && item.upvotes.length > 0));
  const isCompleted = !!item.completed;
  const isPinned = !!item.pinned;
  const hasUpvoted = useMemo(
    () => !!(currentUserId && (item.upvotes || []).includes(currentUserId)),
    [currentUserId, item.upvotes]
  );
  const upvoteCount = item.upvotes?.length || 0;

  const authorName = useMemo(() => {
    if (item.createdBy) {
      const attendee = attendees.find(
        (a: any) =>
          (a.id && a.id === item.createdBy) ||
          (a._id && a._id === item.createdBy) ||
          (a.name && a.name.trim().toLowerCase() === item.createdBy?.trim().toLowerCase())
      );
      if (attendee) return attendee.name;
    }
    if (item.author && item.author !== 'Unbekannt') return item.author;
    return item.createdBy || item.author || 'Unbekannt';
  }, [item.createdBy, item.author, attendees]);

  const authorAttendeeData = useMemo(() => {
    const personColors = ['#007ad9', '#ed5565', '#26a69a', '#ab47bc', '#d4e157', '#ff7043', '#ec407a', '#78909c'];
    const personIndex = attendees.findIndex(
      (a: any) =>
        (a.id && a.id === item.createdBy) ||
        (a._id && a._id === item.createdBy) ||
        (a.name && a.name.trim().toLowerCase() === authorName.trim().toLowerCase())
    );
    const attendee = personIndex !== -1 ? attendees[personIndex] : null;
    const chipColor = personIndex !== -1 ? personColors[personIndex % personColors.length] : '#374151';
    return { attendee, chipColor };
  }, [item.createdBy, authorName, attendees]);

  const createdAtLabel = useMemo(
    () =>
      item.createdAt
        ? new Date(item.createdAt).toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : null,
    [item.createdAt]
  );

  const updatedAtLabel = useMemo(
    () =>
      item.updatedAt
        ? new Date(item.updatedAt).toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : null,
    [item.updatedAt]
  );

  return (
    <div className={`mb-4 comic-panel-dark p-3 sm:p-4 transition-opacity ${isCompleted ? 'opacity-80' : ''} ${isPinned ? 'border-left-3 border-yellow-400' : ''}`}>
      <div className="flex flex-column sm:flex-row justify-content-between align-items-start sm:align-items-center mb-2 gap-2">
        <div className="flex-1 min-w-0 w-full sm:w-auto">
          <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2 align-items-center">
            {createdAtLabel && (
              <span className="flex align-items-center gap-1" title="Erstellt am">
                <i className="pi pi-calendar-plus" style={{ fontSize: '0.7rem' }}></i>
                {createdAtLabel}
              </span>
            )}
            {updatedAtLabel && (
              <span className="flex align-items-center gap-1" title="Zuletzt bearbeitet am">
                <i className="pi pi-pencil" style={{ fontSize: '0.7rem' }}></i>
                {updatedAtLabel}
              </span>
            )}
            <span
              className="inline-flex align-items-center font-bold text-white text-xs"
              title={`Erstellt von ${authorName}`}
              style={{
                backgroundColor: authorAttendeeData.chipColor,
                border: '2px solid #000000',
                boxShadow: '2px 2px 0px #000000',
                borderRadius: '8px',
                lineHeight: 1.2,
                gap: '0.5rem',
                padding: '0.35rem 0.85rem',
              }}
            >
              {authorAttendeeData.attendee?.avatarUrl ? (
                <img
                  src={authorAttendeeData.attendee.avatarUrl}
                  alt={authorName}
                  className="border-circle object-cover flex-shrink-0"
                  style={{ width: '1.1rem', height: '1.1rem', border: '1px solid #000' }}
                />
              ) : (
                <i className="pi pi-user text-white flex-shrink-0" style={{ fontSize: '0.75rem' }} />
              )}
              <span>{authorName}</span>
            </span>
          </div>
          <div className={`text-xl font-bold mb-1 word-break-break-word ${isCompleted ? 'line-through text-gray-400' : ''}`}>
            {item.title}
          </div>
        </div>
        <div className="flex gap-1 sm:gap-2 align-items-center flex-wrap self-end sm:self-center mt-2 sm:mt-0">
          <Button
            icon={isPinned ? 'mdi mdi-pin text-xl text-yellow-400' : 'mdi mdi-pin-outline text-xl'}
            rounded
            text
            style={isPinned ? { color: '#facc15' } : undefined}
            className={isPinned ? 'text-yellow-400 font-bold' : 'text-gray-400 hover:text-yellow-400'}
            title={isPinned ? 'Anpinnung aufheben' : 'Agendapunkt anpinnen'}
            onClick={() => onTogglePinned(index)}
          />
          <Button
            text
            rounded
            className={`p-button-sm ${hasUpvoted ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'}`}
            title="Daumen hoch"
            onClick={() => onToggleUpvote(index)}
          >
            <i className={`pi ${hasUpvoted ? 'pi-thumbs-up-fill' : 'pi-thumbs-up'} text-xl`}></i>
            {upvoteCount > 0 && (
              <Badge value={upvoteCount} severity="warning" className="ml-2"></Badge>
            )}
          </Button>
          <Button
            icon={isCompleted ? 'pi pi-check-circle' : 'pi pi-circle'}
            rounded
            text
            className={isCompleted ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'}
            title={isCompleted ? 'Als noch nicht besprochen markieren' : 'Als besprochen markieren'}
            onClick={() => onToggleCompleted(index)}
          />
          <Button
            icon="pi pi-pencil"
            rounded
            text
            className="text-gray-400 hover:text-yellow-400"
            title="Bearbeiten"
            onClick={() => onEdit(index)}
          />
          <Button
            icon="pi pi-trash"
            rounded
            text
            className="text-gray-400 hover:text-red-400"
            title="Löschen"
            onClick={() => onDelete(index)}
          />
          <Button
            icon={detailsOpen ? 'pi pi-angle-up' : 'pi pi-angle-down'}
            rounded
            text
            disabled={!hasDetails}
            className={hasDetails ? 'text-gray-400 hover:text-yellow-400' : 'text-gray-600 opacity-40'}
            title={hasDetails ? 'Details anzeigen/einklappen' : 'Keine Details vorhanden'}
            onClick={() => {
              if (hasDetails) setDetailsOpen((o) => !o);
            }}
          />
        </div>
      </div>

      {/* Poll / Abstimmung Ergebnisse auf der Karte */}
      {item.poll && item.poll.options && item.poll.options.length > 0 && (
        <div className="mt-3 pt-3 border-top-1 border-gray-700">
          <div className="flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
            <div className="flex align-items-center gap-2">
              <i className="pi pi-chart-bar text-yellow-500 text-base font-bold" />
              <span className="font-bold text-white text-sm sm:text-base">
                {item.poll.question?.trim() || 'Abstimmung'}
              </span>
            </div>
            <Button
              label="Abstimmen"
              icon="pi pi-check-square"
              onClick={() => onOpenVoteModal(index)}
              className="p-button-warning comic-button p-button-xs font-bold py-1 px-2 text-xs"
            />
          </div>

          <div className="flex flex-column gap-3 mt-3">
            {item.poll.options.map((opt) => {
              const totalVotesCount = item.poll!.options.reduce((sum, o) => sum + (o.votes?.length || 0), 0);
              const optionVotesCount = opt.votes?.length || 0;
              const percentage = totalVotesCount > 0 ? Math.round((optionVotesCount / totalVotesCount) * 100) : 0;
              return (
                <div key={opt.id} className="flex flex-column gap-1">
                  <div className="flex justify-content-between align-items-center text-xs text-gray-200 font-bold">
                    <span>{opt.text}</span>
                    <span className="text-yellow-400 font-bold">
                      {optionVotesCount} {optionVotesCount === 1 ? 'Stimme' : 'Stimmen'} ({percentage}%)
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full border-round overflow-hidden relative" style={{ height: '16px', border: '2px solid #000000', backgroundColor: '#111827' }}>
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: '#eab308',
                        height: '100%',
                        minWidth: percentage > 0 ? '8px' : '0px',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
                        transition: 'width 0.4s ease-in-out',
                      }}
                    />
                  </div>

                  {/* Voter Name Chips in Button Style with Person Card Color */}
                  {opt.votes && opt.votes.length > 0 && (
                    <div className="flex align-items-center gap-2 mt-1 flex-wrap">
                      {opt.votes.map((voterId) => {
                        const personColors = ['#007ad9', '#ed5565', '#26a69a', '#ab47bc', '#d4e157', '#ff7043', '#ec407a', '#78909c'];
                        const personIndex = attendees.findIndex(
                          (a: any) => a.id === voterId || a._id === voterId || a.name === voterId
                        );
                        const attendee = personIndex !== -1 ? attendees[personIndex] : null;
                        const voterName = attendee ? attendee.name : voterId;
                        const chipColor = personIndex !== -1 ? personColors[personIndex % personColors.length] : '#374151';

                        return (
                          <span
                            key={voterId}
                            className="inline-flex align-items-center font-bold text-white text-xs"
                            style={{
                              backgroundColor: chipColor,
                              border: '2px solid #000000',
                              boxShadow: '2px 2px 0px #000000',
                              borderRadius: '8px',
                              lineHeight: 1.2,
                              gap: '0.5rem',
                              padding: '0.35rem 0.85rem',
                            }}
                          >
                            {attendee?.avatarUrl ? (
                              <img
                                src={attendee.avatarUrl}
                                alt={voterName}
                                className="border-circle object-cover flex-shrink-0"
                                style={{ width: '1.1rem', height: '1.1rem', border: '1px solid #000' }}
                              />
                            ) : (
                              <i className="pi pi-user text-white flex-shrink-0" style={{ fontSize: '0.75rem' }} />
                            )}
                            <span>{voterName}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Details are only rendered in the DOM when opened — avoids heavy MDXEditor instances */}
      {hasDetails && detailsOpen && (
        <div className="agenda-details-container mt-3 pt-3 border-top-1 border-gray-700 text-gray-300 line-height-3">
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
                <div className="mt-3 pt-3 border-top-1 border-gray-700 flex align-items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-gray-300 flex align-items-center gap-2 mr-2">
                    <i className="pi pi-thumbs-up text-yellow-400 text-sm" />
                    <span>Daumen hoch von:</span>
                  </span>
                  {item.upvotes.map((voterId) => {
                    const personColors = ['#007ad9', '#ed5565', '#26a69a', '#ab47bc', '#d4e157', '#ff7043', '#ec407a', '#78909c'];
                    const personIndex = attendees.findIndex(
                      (a: any) => a.id === voterId || a._id === voterId || a.name === voterId
                    );
                    const attendee = personIndex !== -1 ? attendees[personIndex] : null;
                    const voterName = attendee ? attendee.name : voterId;
                    const chipColor = personIndex !== -1 ? personColors[personIndex % personColors.length] : '#374151';

                    return (
                      <span
                        key={voterId}
                        className="inline-flex align-items-center font-bold text-white text-xs"
                        style={{
                          backgroundColor: chipColor,
                          border: '2px solid #000000',
                          boxShadow: '2px 2px 0px #000000',
                          borderRadius: '8px',
                          lineHeight: 1.2,
                          gap: '0.5rem',
                          padding: '0.35rem 0.85rem',
                        }}
                      >
                        {attendee?.avatarUrl ? (
                          <img
                            src={attendee.avatarUrl}
                            alt={voterName}
                            className="border-circle object-cover flex-shrink-0"
                            style={{ width: '1.1rem', height: '1.1rem', border: '1px solid #000' }}
                          />
                        ) : (
                          <i className="pi pi-user text-white flex-shrink-0" style={{ fontSize: '0.75rem' }} />
                        )}
                        <span>{voterName}</span>
                      </span>
                    );
                  })}
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
                  loading="lazy"
                  onClick={() => onPreviewImage(item.imageUrl!)}
                  title="Klicken zum Vergrößern"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

// ─── Main Component ────────────────────────────────────────────────────────
export default function AgendaTimeline({
  agenda,
  items,
  attendees = [],
  currentUser,
  isCreator = true,
  onUpdate,
  onUpdateAgenda,
}: Props) {
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
  const [sortMode, setSortMode] = useState<'date' | 'rating' | 'random'>(
    (agenda?.sortMode as any) || 'date'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    agenda?.sortOrder || 'asc'
  );

  // Poll creation & voting state
  const [enablePoll, setEnablePoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['Option 1', 'Option 2']);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);

  const [voteModalVisible, setVoteModalVisible] = useState(false);
  const [activeVoteIndex, setActiveVoteIndex] = useState<number | null>(null);

  const openVoteModal = useCallback((index: number) => {
    setActiveVoteIndex(index);
    setVoteModalVisible(true);
  }, []);

  const handleVoteOnItem = useCallback(
    async (updatedPoll: IPoll) => {
      if (activeVoteIndex === null) return;
      const updatedItems = [...items];
      updatedItems[activeVoteIndex] = {
        ...updatedItems[activeVoteIndex],
        poll: updatedPoll,
        updatedAt: new Date().toISOString(),
      };
      await onUpdate(updatedItems);
    },
    [activeVoteIndex, items, onUpdate]
  );

  useEffect(() => {
    if (agenda?.sortMode) {
      setSortMode(agenda.sortMode);
    }
    if (agenda?.sortOrder) {
      setSortOrder(agenda.sortOrder);
    }
  }, [agenda?.sortMode, agenda?.sortOrder]);

  const currentUserId = useMemo(
    () => currentUser?.id || currentUser?._id || currentUser?.name,
    [currentUser]
  );

  const isClosed = useMemo(() => {
    if (agenda?.isManuallyClosed === true) return true;
    if (agenda?.isManuallyClosed === false) return false;
    if (agenda?.date) {
      const agendaDate = new Date(agenda.date).getTime();
      const offsetMs = (agenda.closeBeforeHours ?? 12) * 60 * 60 * 1000;
      return Date.now() > agendaDate - offsetMs;
    }
    return false;
  }, [agenda]);

  const toggleManualClose = useCallback(async () => {
    if (!isCreator) return;
    if (onUpdateAgenda) {
      await onUpdateAgenda({ isManuallyClosed: !isClosed });
    }
  }, [onUpdateAgenda, isClosed, isCreator]);

  const openNew = useCallback(() => {
    setTitle('');
    setDescription('');
    setImageUrl('');
    setEnablePoll(false);
    setPollQuestion('');
    setPollOptions(['Option 1', 'Option 2']);
    setPollAllowMultiple(false);
    setEditingIndex(null);
    setShowDetails(false);
    if (editorRef.current) {
      editorRef.current.setMarkdown('');
    } else {
      setEditorKey((k) => k + 1);
    }
    setVisible(true);
  }, []);

  const openEdit = useCallback(
    (index: number) => {
      const item = items[index];
      const newDesc = item.description || '';
      setTitle(item.title);
      setDescription(newDesc);
      setImageUrl(item.imageUrl || '');
      setEditingIndex(index);

      if (item.poll) {
        setEnablePoll(true);
        setPollQuestion(item.poll.question || '');
        setPollOptions(item.poll.options.map((o) => o.text));
        setPollAllowMultiple(!!item.poll.allowMultiple);
      } else {
        setEnablePoll(false);
        setPollQuestion('');
        setPollOptions(['Option 1', 'Option 2']);
        setPollAllowMultiple(false);
      }

      setShowDetails(!!(item.description || item.imageUrl || item.poll));
      if (editorRef.current) {
        editorRef.current.setMarkdown(newDesc);
      } else {
        setEditorKey((k) => k + 1);
      }
      setVisible(true);
    },
    [items]
  );

  const handleImageFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, []);

  const toggleCompleted = useCallback(
    async (index: number) => {
      const updatedItems = [...items];
      updatedItems[index] = {
        ...updatedItems[index],
        completed: !updatedItems[index].completed,
        updatedAt: new Date().toISOString(),
      };
      await onUpdate(updatedItems);
    },
    [items, onUpdate]
  );

  const toggleUpvote = useCallback(
    async (index: number) => {
      if (!currentUserId) return;
      const updatedItems = [...items];
      const item = { ...updatedItems[index] };
      const upvotes = item.upvotes || [];
      item.upvotes = upvotes.includes(currentUserId)
        ? upvotes.filter((id: string) => id !== currentUserId)
        : [...upvotes, currentUserId];
      item.updatedAt = new Date().toISOString();
      updatedItems[index] = item;
      await onUpdate(updatedItems);
    },
    [items, onUpdate, currentUserId]
  );

  const togglePinned = useCallback(
    async (index: number) => {
      const updatedItems = [...items];
      updatedItems[index] = {
        ...updatedItems[index],
        pinned: !updatedItems[index].pinned,
        updatedAt: new Date().toISOString(),
      };
      await onUpdate(updatedItems);
    },
    [items, onUpdate]
  );

  const deleteItem = useCallback(
    async (index: number) => {
      const updatedItems = items.filter((_, i) => i !== index);
      await onUpdate(updatedItems);
    },
    [items, onUpdate]
  );

  const sortByDate = useCallback(async () => {
    const newOrder = sortMode === 'date' ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'asc';
    setSortMode('date');
    setSortOrder(newOrder);

    const sorted = sortWithPinned(items, (a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return newOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
    await onUpdate(sorted);
    if (onUpdateAgenda) {
      await onUpdateAgenda({ sortMode: 'date', sortOrder: newOrder });
    }
  }, [items, onUpdate, onUpdateAgenda, sortMode, sortOrder]);

  const sortByRating = useCallback(async () => {
    const newOrder = sortMode === 'rating' ? (sortOrder === 'desc' ? 'asc' : 'desc') : 'desc';
    setSortMode('rating');
    setSortOrder(newOrder);

    const sorted = sortWithPinned(items, (a, b) => {
      const ratingA = a.upvotes?.length || 0;
      const ratingB = b.upvotes?.length || 0;
      return newOrder === 'desc' ? ratingB - ratingA : ratingA - ratingB;
    });
    await onUpdate(sorted);
    if (onUpdateAgenda) {
      await onUpdateAgenda({ sortMode: 'rating', sortOrder: newOrder });
    }
  }, [items, onUpdate, onUpdateAgenda, sortMode, sortOrder]);

  const sortRandomly = useCallback(async () => {
    setSortMode('random');
    const sorted = sortWithPinned(items, () => Math.random() - 0.5);
    await onUpdate(sorted);
    if (onUpdateAgenda) {
      await onUpdateAgenda({ sortMode: 'random', sortOrder });
    }
  }, [items, onUpdate, onUpdateAgenda, sortOrder]);

  const saveItem = useCallback(async () => {
    if (!title.trim()) return;
    const updatedItems = [...items];

    let pollData: IPoll | undefined = undefined;
    if (enablePoll) {
      const validOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (validOptions.length >= 2) {
        const existingItem = editingIndex !== null ? items[editingIndex] : null;
        pollData = {
          question: pollQuestion.trim() || undefined,
          allowMultiple: pollAllowMultiple,
          options: validOptions.map((text, idx) => {
            const existingOpt = existingItem?.poll?.options?.find((o) => o.text === text);
            return {
              id: existingOpt?.id || `opt_${Date.now()}_${idx}`,
              text,
              votes: existingOpt?.votes || [],
            };
          }),
        };
      }
    }

    if (editingIndex !== null) {
      updatedItems[editingIndex] = {
        ...updatedItems[editingIndex],
        title,
        description,
        imageUrl,
        poll: pollData,
        updatedAt: new Date().toISOString(),
      };
    } else {
      const authorName = currentUser?.name || 'Unbekannt';
      const createdById = currentUser?.id || currentUser?._id || authorName;
      updatedItems.push({
        title,
        description,
        imageUrl,
        poll: pollData,
        author: authorName,
        createdBy: createdById,
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    await onUpdate(updatedItems);
    setVisible(false);
  }, [
    title,
    description,
    imageUrl,
    enablePoll,
    pollQuestion,
    pollOptions,
    pollAllowMultiple,
    editingIndex,
    items,
    currentUser,
    onUpdate,
  ]);

  // Stable marker renderer — avoids O(n²) indexOf
  const customizedMarker = useCallback(
    (item: AgendaItem, index: number) => {
      const isCompleted = !!item.completed;
      const isPinned = !!item.pinned;
      return (
        <span
          onClick={() => toggleCompleted(index)}
          className="flex w-2rem h-2rem align-items-center justify-content-center border-circle z-1 shadow-1 cursor-pointer transition-transform hover:scale-110"
          style={{ backgroundColor: isPinned ? '#f59e0b' : '#eab308' }}
          title={isCompleted ? 'Als noch nicht besprochen markieren' : 'Als besprochen markieren'}
        >
          {isCompleted ? (
            <i className="pi pi-check text-gray-900 font-bold"></i>
          ) : isPinned ? (
            <i className="mdi mdi-pin text-gray-900 font-bold" style={{ fontSize: '0.9rem' }}></i>
          ) : (
            <span
              className="border-circle"
              style={{ width: '0.65rem', height: '0.65rem', backgroundColor: '#111827', display: 'block' }}
            />
          )}
        </span>
      );
    },
    [toggleCompleted]
  );

  // Stable content renderer — index comes directly from PrimeReact, no indexOf needed
  const customizedContent = useCallback(
    (item: AgendaItem, index: number) => (
      <AgendaCard
        key={item._id ?? index}
        item={item}
        index={index}
        currentUserId={currentUserId}
        attendees={attendees}
        isCreator={isCreator}
        onToggleCompleted={toggleCompleted}
        onToggleUpvote={toggleUpvote}
        onTogglePinned={togglePinned}
        onDelete={deleteItem}
        onEdit={openEdit}
        onPreviewImage={setSelectedPreviewImage}
        onOpenVoteModal={openVoteModal}
      />
    ),
    [currentUserId, attendees, isCreator, toggleCompleted, toggleUpvote, togglePinned, deleteItem, openEdit, openVoteModal]
  );

  const totalCount = items?.length || 0;
  const completedCount = useMemo(
    () => (items || []).filter((i) => i.completed).length,
    [items]
  );

  return (
    <div className="mb-6">
      <div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center mb-4 gap-3">
        <div className="flex align-items-center gap-2 flex-wrap">
          <h3 className="text-2xl m-0 text-yellow-500 font-bold" style={{ textShadow: '2px 2px 0px #000' }}>Agendapunkte</h3>
          
          <span
            className="inline-flex align-items-center gap-2 text-xs sm:text-sm font-bold text-yellow-400"
            style={{
              backgroundColor: '#1f2937',
              border: '2px solid #000',
              boxShadow: '2px 2px 0px #000',
              borderRadius: '10px',
              padding: '6px 14px'
            }}
            title={`${completedCount} von ${totalCount} Agendampunkten besprochen`}
          >
            <i className="pi pi-check-circle text-yellow-400 text-sm"></i>
            <span>{completedCount}/{totalCount} besprochen</span>
          </span>
        </div>

        <div className="flex gap-2 flex-wrap align-items-center justify-content-between w-full md:w-auto">
          {items && items.length > 1 && (
            <div className="flex gap-2 align-items-center">
              <Button
                onClick={sortByDate}
                className={sortMode === 'date' ? 'comic-button flex-shrink-0 flex align-items-center gap-1' : 'comic-button-secondary flex-shrink-0 flex align-items-center gap-1'}
                title={
                  sortMode === 'date'
                    ? `Nach Datum sortiert (${sortOrder === 'asc' ? 'älteste zuerst' : 'neueste zuerst'}). Klicken zum Ändern.`
                    : 'Nach Datum sortieren'
                }
              >
                <i className="pi pi-calendar"></i>
                {sortMode === 'date' && (
                  <i className={`pi ${sortOrder === 'asc' ? 'pi-sort-amount-up-alt' : 'pi-sort-amount-down'} text-xs`}></i>
                )}
              </Button>
              <Button
                onClick={sortByRating}
                className={sortMode === 'rating' ? 'comic-button flex-shrink-0 flex align-items-center gap-1' : 'comic-button-secondary flex-shrink-0 flex align-items-center gap-1'}
                title={
                  sortMode === 'rating'
                    ? `Nach Bewertung sortiert (${sortOrder === 'desc' ? 'meiste zuerst' : 'wenigste zuerst'}). Klicken zum Ändern.`
                    : 'Nach Bewertung sortieren'
                }
              >
                <i className="pi pi-thumbs-up"></i>
                {sortMode === 'rating' && (
                  <i className={`pi ${sortOrder === 'desc' ? 'pi-sort-amount-down' : 'pi-sort-amount-up-alt'} text-xs`}></i>
                )}
              </Button>
              <Button
                onClick={sortRandomly}
                className={sortMode === 'random' ? 'comic-button flex-shrink-0 flex align-items-center' : 'comic-button-secondary flex-shrink-0 flex align-items-center'}
                title={sortMode === 'random' ? 'Zufällig sortiert. Erneut klicken zum Mischen.' : 'Zufällig sortieren'}
              >
                <i className="mdi mdi-dice-multiple"></i>
              </Button>
            </div>
          )}

          {items && items.length > 1 && isCreator && (
            <div className="border-left-2 border-gray-600 mx-1 align-self-center" style={{ height: '2.2rem' }} />
          )}

          {isCreator && (
            <div className="flex gap-2 flex-wrap ml-auto md:ml-0">
              <Button
                icon={isClosed ? 'pi pi-lock-open' : 'pi pi-lock'}
                onClick={toggleManualClose}
                className="comic-button-secondary flex-shrink-0"
                title={isClosed ? 'Agenda wieder öffnen' : 'Agenda schließen'}
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
          content={customizedContent}
          marker={customizedMarker}
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
        header={
          <div className="flex align-items-center gap-2">
            <i className="pi pi-bookmark text-yellow-400 text-xl" />
            <span>{editingIndex !== null ? 'Agendapunkt bearbeiten' : 'Neuer Agendapunkt'}</span>
          </div>
        }
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
        modal
        blockScroll
      >
        <div className="flex flex-column gap-3 pt-3">
          <div className="p-inputgroup">
            <span className="p-inputgroup-addon bg-gray-700 border-gray-600"><i className="pi pi-bookmark"></i></span>
            <InputText ref={titleInputRef} placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus className="bg-gray-800 text-white border-gray-600" />
          </div>

          {/* Toggle Button for Details & Bild */}
          <div className="border-top-1 border-gray-700 pt-2 flex align-items-center">
            <Button
              icon={showDetails ? 'pi pi-chevron-up' : 'pi pi-chevron-down'}
              label={showDetails ? 'Details & Bild einklappen' : 'Details & Bild hinzufügen...'}
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

              {/* Abstimmung / Umfrage Erstellbereich */}
              <div className="border-top-1 border-gray-700 pt-3 flex flex-column gap-2">
                <div className="flex align-items-center justify-content-between flex-wrap gap-2">
                  <label className="text-sm font-bold text-gray-300 flex align-items-center gap-2">
                    <i className="pi pi-chart-bar text-yellow-500 text-base" />
                    <span>Abstimmung / Umfrage zu diesem Punkt:</span>
                  </label>
                  <Button
                    icon={enablePoll ? 'pi pi-check-square' : 'pi pi-plus'}
                    label={enablePoll ? 'Abstimmung entfernen' : 'Abstimmung hinzufügen'}
                    type="button"
                    className={enablePoll ? 'p-button-danger p-button-text p-0 text-xs font-bold' : 'comic-button-secondary p-button-xs py-1 px-2 text-xs font-bold'}
                    onClick={() => {
                      if (enablePoll) {
                        setEnablePoll(false);
                      } else {
                        setEnablePoll(true);
                        if (pollOptions.length < 2) {
                          setPollOptions(['Option 1', 'Option 2']);
                        }
                      }
                    }}
                  />
                </div>

                {enablePoll && (
                  <div className="bg-gray-800 p-3 border-round-xl border-1 border-gray-700 flex flex-column gap-3 mt-1">
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-1">
                        Optionale Frage (falls Titel nicht die Frage ist):
                      </label>
                      <InputText
                        placeholder={title || 'z. B. Wo wollen wir essen?'}
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value)}
                        className="comic-input text-white text-sm w-full py-2 px-3"
                      />
                    </div>

                    <div className="flex flex-column gap-2">
                      <label className="text-xs font-bold text-gray-400 block">Antwort-Optionen:</label>
                      {pollOptions.map((optText, idx) => (
                        <div key={idx} className="flex align-items-center gap-2">
                          <span className="text-xs font-bold text-yellow-500 w-1rem text-center">{idx + 1}.</span>
                          <InputText
                            placeholder={`Option ${idx + 1}`}
                            value={optText}
                            onChange={(e) => {
                              const newOpts = [...pollOptions];
                              newOpts[idx] = e.target.value;
                              setPollOptions(newOpts);
                            }}
                            className="comic-input text-white text-sm flex-1 py-1 px-2"
                          />
                          {pollOptions.length > 2 && (
                            <Button
                              icon="pi pi-trash"
                              type="button"
                              rounded
                              text
                              className="text-red-400 p-1"
                              onClick={() => {
                                setPollOptions(pollOptions.filter((_, i) => i !== idx));
                              }}
                            />
                          )}
                        </div>
                      ))}

                      <Button
                        icon="pi pi-plus"
                        label="Option hinzufügen"
                        type="button"
                        className="comic-button-secondary p-button-xs align-self-start mt-1 text-xs font-bold"
                        onClick={() => setPollOptions([...pollOptions, `Option ${pollOptions.length + 1}`])}
                      />
                    </div>

                    <div className="flex align-items-center gap-2 pt-2 border-top-1 border-gray-700">
                      <Checkbox
                        inputId="pollAllowMultiple"
                        checked={pollAllowMultiple}
                        onChange={(e) => setPollAllowMultiple(!!e.checked)}
                      />
                      <label htmlFor="pollAllowMultiple" className="text-xs text-gray-300 cursor-pointer font-bold">
                        Mehrfachauswahl erlauben
                      </label>
                    </div>
                  </div>
                )}
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
        header={
          <div className="flex align-items-center gap-2">
            <i className="pi pi-image text-yellow-400 text-xl" />
            <span>Bildansicht</span>
          </div>
        }
        style={{ width: '90vw', maxWidth: '1200px' }}
        className="glass-panel"
        modal
        blockScroll
      >
        {selectedPreviewImage && (
          <div className="flex justify-content-center p-2">
            <img src={selectedPreviewImage} alt="Vorschau" className="w-full h-full object-contain max-h-80vh border-round-lg" />
          </div>
        )}
      </Dialog>

      {/* Voting Modal */}
      {activeVoteIndex !== null && items[activeVoteIndex]?.poll && (
        <PollVoteModal
          visible={voteModalVisible}
          onHide={() => {
            setVoteModalVisible(false);
            setActiveVoteIndex(null);
          }}
          itemTitle={items[activeVoteIndex].title}
          poll={items[activeVoteIndex].poll}
          currentUserId={currentUserId || currentUser?.name || 'Unbekannt'}
          onVote={handleVoteOnItem}
        />
      )}
    </div>
  );
}
