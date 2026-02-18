/**
 * ActionMenu Component
 * 
 * A standardized dropdown menu for grouped actions.
 * Commonly used as the "three dots" menu in tables.
 * 
 * Usage:
 * ```tsx
 * <ActionMenu>
 *   <MenuItem onClick={handleEdit}>
 *     <ListItemIcon><EditIcon /></ListItemIcon>
 *     <ListItemText>Edit</ListItemText>
 *   </MenuItem>
 *   <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
 *     <ListItemIcon><DeleteIcon color="error" /></ListItemIcon>
 *     <ListItemText>Delete</ListItemText>
 *   </MenuItem>
 * </ActionMenu>
 * ```
 */

import { useState, MouseEvent, ReactNode } from 'react';
import { Menu, IconButton, MenuProps } from '@mui/material';
import { MoreVert as MoreVertIcon } from '@mui/icons-material';
import { shadows, borderRadius } from '../../theme/spacing';

interface ActionMenuProps extends Partial<MenuProps> {
  /** Menu items */
  children: ReactNode;
  /** Custom icon (defaults to vertical dots) */
  icon?: ReactNode;
  /** Tooltip title */
  title?: string;
  /** Button size */
  size?: 'small' | 'medium' | 'large';
}

export default function ActionMenu({
  children,
  icon = <MoreVertIcon />,
  title = 'More actions',
  size = 'small',
  ...props
}: ActionMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (event: object, reason: string) => {
    if (reason !== 'backdropClick') {
       // stop propagation if needed? usually backdrop click is fine.
    }
    // event.stopPropagation? No, handleClose is called by Menu.
    setAnchorEl(null);
  };
  
  // Wrapper for item clicks to close menu
  // Actually, consumer usually handles closing, but we can't easily intercept children clicks unless we clone them.
  // Standard pattern: consumer calls close, or we just rely on consumer logic. 
  // BETTER: Provide a function to children? No, too complex. 
  // Let's just be a simple uncontrolled wrapper for the Anchor.

  return (
    <>
      <IconButton
        aria-label={title}
        aria-controls={open ? 'action-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
        size={size}
      >
        {icon}
      </IconButton>
      <Menu
        id="action-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={(e) => {
            e.stopPropagation();
            setAnchorEl(null); // Auto close on click
        }}
        PaperProps={{
          elevation: 0,
          sx: {
            boxShadow: shadows.dropdown,
            borderRadius: borderRadius.md,
            minWidth: 160,
            overflow: 'visible',
            mt: 0.5,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        {...props}
      >
        {children}
      </Menu>
    </>
  );
}
