import { Image } from 'lucide-react';
import React from 'react';

interface PreviewBoxProps {
  imageUrl: string | null;
  isLoading?: boolean;
  label?: string;
  placeholderLines?: [string, string] | string;
  altText: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PreviewBox: React.FC<PreviewBoxProps> = ({
  imageUrl,
  isLoading = false,
  label,
  placeholderLines = ['No', 'image'],
  altText,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-13 h-13',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  };

  const renderPlaceholder = () => {
    if (typeof placeholderLines === 'string') {
      return <span className="text-xs text-text-subtle text-center">{placeholderLines}</span>;
    }
    return (
      <span className="text-2xs text-text-subtle text-center leading-tight">
        {placeholderLines[0]}
        <br />
        {placeholderLines[1]}
      </span>
    );
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-xl border border-border-light checkerboard flex items-center justify-center p-1.5 shadow-inset bg-surface-dark overflow-hidden relative`}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 w-full h-full">
            <div className="spinner-circle animate-rotate"></div>
            <span className="text-2xs text-text-subtle text-center leading-tight">Loading...</span>
          </div>
        ) : imageUrl ? (
          <img src={imageUrl} alt={altText} className="w-full h-full rounded-lg object-contain" />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5">
            <Image className="w-5 h-5 stroke-text-subtle" strokeWidth={1.5} />
            {renderPlaceholder()}
          </div>
        )}
      </div>
      {label && (
        <span className="text-[9px] text-text-subtle uppercase tracking-wide">{label}</span>
      )}
    </div>
  );
};
