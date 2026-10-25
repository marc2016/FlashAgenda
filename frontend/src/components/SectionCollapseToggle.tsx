import { Button } from 'primereact/button';

interface Props {
  sectionId: string;
  label: string;
  collapsed: boolean;
  onToggle: () => void;
}

// Chevron button placed in front of a section heading to collapse/expand the section
export default function SectionCollapseToggle({ sectionId, label, collapsed, onToggle }: Props) {
  const actionLabel = `${label} ${collapsed ? 'ausklappen' : 'einklappen'}`;
  return (
    <Button
      icon={collapsed ? 'pi pi-chevron-right' : 'pi pi-chevron-down'}
      rounded
      text
      onClick={onToggle}
      className="text-gray-400 hover:text-yellow-400 p-0 flex-shrink-0"
      style={{ width: '2.2rem', height: '2.2rem' }}
      title={actionLabel}
      aria-label={actionLabel}
      aria-expanded={!collapsed}
      data-testid={`collapse-toggle-${sectionId}`}
    />
  );
}
