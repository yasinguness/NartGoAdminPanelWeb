import { Breadcrumbs as MuiBreadcrumbs, Link, Typography, styled } from '@mui/material';
import { NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

export interface BreadcrumbItem {
    label: string;
    href?: string;
    active?: boolean;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
}

const StyledBreadcrumb = styled(Typography)(({ theme }) => ({
    color: theme.palette.text.primary,
    fontWeight: theme.typography.fontWeightMedium,
}));

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
    return (
        <MuiBreadcrumbs 
            aria-label="breadcrumb" 
            separator={<NavigateNextIcon fontSize="small" />}
            sx={{ mb: 2 }}
        >
            {items.map((item, index) => {
                const isLast = index === items.length - 1;
                
                if (isLast || item.active) {
                    return (
                        <StyledBreadcrumb key={index} color="text.primary">
                            {item.label}
                        </StyledBreadcrumb>
                    );
                }
                
                return (
                    <Link
                        key={index}
                        component={item.href ? RouterLink : 'button'}
                        to={item.href || '#'}
                        underline="hover"
                        color="inherit"
                        sx={{ cursor: 'pointer' }}
                        onClick={(e) => {
                            if (!item.href) {
                                e.preventDefault();
                            }
                        }}
                    >
                        {item.label}
                    </Link>
                );
            })}
        </MuiBreadcrumbs>
    );
}
