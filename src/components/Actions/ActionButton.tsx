/**
 * ActionButton Component
 * 
 * A standardized icon button with tooltip support.
 * Used for primary actions in tables, headers, and cards.
 * 
 * Usage:
 * ```tsx
 * <ActionButton 
 *   icon={<EditIcon />} 
 *   title="Edit User" 
 *   onClick={handleEdit} 
 * />
 * ```
 */

import { ReactNode, MouseEvent } from 'react';
import { IconButton, IconButtonProps, Tooltip } from '@mui/material';
import { componentSpacing } from '../../theme/spacing';

interface ActionButtonProps extends Omit<IconButtonProps, 'title'> {
  /** Icon to display */
  icon: ReactNode;
  /** Tooltip text (required for accessibility) */
  title: string;
  /** Button color variant */
  color?: IconButtonProps['color'] | 'default';
  /** Click handler */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}

export default function ActionButton({
  icon,
  title,
  color = 'default',
  size = componentSpacing.iconButtonSize,
  onClick,
  ...props
}: ActionButtonProps) {
  return (
    <Tooltip title={title} arrow>
      <span>
        <IconButton
          size={size}
          color={color === 'default' ? undefined : color}
          onClick={onClick}
          aria-label={title}
          {...props}
        >
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );
}
