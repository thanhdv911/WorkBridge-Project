import logoHorizontal from '../../assets/workbridge-logo-horizontal.png';
import logoMark from '../../assets/workbridge-mark.png';

const LOGO_VARIANTS = {
  horizontal: logoHorizontal,
  mark: logoMark,
};

export default function WorkBridgeLogo({
  variant = 'horizontal',
  className = '',
  imageClassName = 'h-10 w-auto',
  alt = 'WorkBridge',
}) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <img
        src={LOGO_VARIANTS[variant] || logoHorizontal}
        alt={alt}
        className={`block object-contain ${imageClassName}`}
        loading="eager"
      />
    </span>
  );
}
