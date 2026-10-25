interface Props {
  sectionId: string;
  text: string;
}

// Subtle one-line summary shown next to a collapsed section heading (no border, truncates when space is short)
export default function SectionSummary({ sectionId, text }: Props) {
  return (
    <span
      className="text-xs sm:text-sm text-gray-400 font-normal white-space-nowrap overflow-hidden text-overflow-ellipsis flex-1"
      style={{ minWidth: '5.5rem' }}
      title={text}
      data-testid={`section-summary-${sectionId}`}
    >
      {text}
    </span>
  );
}
