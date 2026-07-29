import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { RadioButton } from 'primereact/radiobutton';
import { Checkbox } from 'primereact/checkbox';

export interface IPollOption {
  id: string;
  text: string;
  votes: string[];
}

export interface IPoll {
  question?: string;
  options: IPollOption[];
  allowMultiple?: boolean;
}

interface PollVoteModalProps {
  visible: boolean;
  onHide: () => void;
  itemTitle: string;
  poll?: IPoll;
  currentUserId: string;
  onVote: (updatedPoll: IPoll) => Promise<void>;
}

export const PollVoteModal: React.FC<PollVoteModalProps> = ({
  visible,
  onHide,
  itemTitle,
  poll,
  currentUserId,
  onVote,
}) => {
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (poll && currentUserId) {
      const userVotes = poll.options
        .filter((opt) => opt.votes.includes(currentUserId))
        .map((opt) => opt.id);
      setSelectedOptionIds(userVotes);
    } else {
      setSelectedOptionIds([]);
    }
  }, [poll, currentUserId, visible]);

  if (!poll || !poll.options || poll.options.length === 0) return null;

  const questionText = poll.question?.trim() || itemTitle;

  const handleToggleOption = (optId: string) => {
    if (poll.allowMultiple) {
      if (selectedOptionIds.includes(optId)) {
        setSelectedOptionIds(selectedOptionIds.filter((id) => id !== optId));
      } else {
        setSelectedOptionIds([...selectedOptionIds, optId]);
      }
    } else {
      setSelectedOptionIds([optId]);
    }
  };

  const handleSubmit = async () => {
    if (!poll || submitting) return;
    setSubmitting(true);

    try {
      const updatedOptions = poll.options.map((opt) => {
        const isSelected = selectedOptionIds.includes(opt.id);
        const filteredVotes = (opt.votes || []).filter((v) => v !== currentUserId);
        const newVotes = isSelected ? [...filteredVotes, currentUserId] : filteredVotes;
        return {
          ...opt,
          votes: newVotes,
        };
      });

      const updatedPoll: IPoll = {
        ...poll,
        options: updatedOptions,
      };

      await onVote(updatedPoll);
      onHide();
    } catch (err) {
      console.error('Failed to submit vote:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      header={
        <div className="flex align-items-center gap-2">
          <i className="pi pi-chart-bar text-yellow-400 text-xl" />
          <span>Abstimmung</span>
        </div>
      }
      visible={visible}
      onHide={onHide}
      style={{ width: '92vw', maxWidth: '520px' }}
      className="glass-panel"
      modal
      blockScroll
    >
      <div className="pt-2">

        <div className="mb-4">
          <p className="text-gray-300 text-sm font-bold m-0 mb-1 uppercase tracking-wider">
            Frage / Thema
          </p>
          <h4 className="m-0 text-white text-base sm:text-lg font-bold">
            {questionText}
          </h4>
          {poll.allowMultiple && (
            <span className="text-yellow-400 text-xs font-bold mt-1 inline-block">
              (Mehrfachauswahl möglich)
            </span>
          )}
        </div>

        <div className="flex flex-column gap-3 mb-4">
          {poll.options.map((opt) => {
            const isSelected = selectedOptionIds.includes(opt.id);
            return (
              <div
                key={opt.id}
                onClick={() => handleToggleOption(opt.id)}
                className={`comic-input p-3 flex align-items-center gap-3 cursor-pointer transition-all border-round-xl ${
                  isSelected ? 'bg-yellow-500 text-gray-900 font-bold' : 'bg-gray-800 text-white'
                }`}
                style={{
                  boxShadow: isSelected ? '4px 4px 0px #000000' : '2px 2px 0px #000000',
                  transform: isSelected ? 'translateY(-2px)' : 'none',
                }}
              >
                {poll.allowMultiple ? (
                  <Checkbox
                    checked={isSelected}
                    onChange={() => handleToggleOption(opt.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <RadioButton
                    checked={isSelected}
                    onChange={() => handleToggleOption(opt.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                <span className="text-sm sm:text-base font-bold flex-1">
                  {opt.text}
                </span>
                {isSelected && (
                  <i className={`pi pi-check-circle ${isSelected ? 'text-gray-900' : 'text-yellow-400'} text-lg`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-content-end gap-2 pt-2 border-top-1 border-gray-700">
          <Button
            label="Abbrechen"
            icon="pi pi-times"
            onClick={onHide}
            className="comic-button-secondary p-button-sm"
          />
          <Button
            label="Stimme abgeben"
            icon="pi pi-check"
            onClick={handleSubmit}
            loading={submitting}
            className="p-button-warning comic-button p-button-sm font-bold"
          />
        </div>
      </div>
    </Dialog>
  );
};
