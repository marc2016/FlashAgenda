import { Component, type ReactNode } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface Props {
  value: string;
  size?: number;
  bgColor?: string;
  fgColor?: string;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
  className?: string;
}

interface State {
  hasError: boolean;
}

export class SafeQRCode extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn('SafeQRCode error caught:', error);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-column align-items-center justify-content-center p-3 text-center text-xs text-yellow-400 bg-gray-900 border-round">
          <i className="pi pi-exclamation-triangle text-xl mb-1" />
          <span>QR-Code Daten zu lang</span>
        </div>
      );
    }

    let safeValue = this.props.value || '';
    if (safeValue.length > 1200) {
      try {
        const url = new URL(safeValue);
        url.search = '';
        safeValue = url.toString();
      } catch {
        safeValue = safeValue.slice(0, 1000);
      }
    }

    return (
      <QRCodeSVG
        value={safeValue}
        size={this.props.size || 180}
        bgColor={this.props.bgColor || '#ffffff'}
        fgColor={this.props.fgColor || '#1a1a1a'}
        level={this.props.level || 'L'}
        includeMargin={this.props.includeMargin ?? false}
        className={this.props.className}
      />
    );
  }
}

export default SafeQRCode;
