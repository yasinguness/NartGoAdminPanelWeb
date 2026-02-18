import React from 'react';
import { Skeleton } from '@mui/material';

interface SkeletonProps {
    variant?: 'text' | 'rectangular' | 'circular';
    width?: number | string;
    height?: number | string;
    count?: number;
    animation?: 'pulse' | 'wave' | false;
}

export const CustomSkeleton: React.FC<SkeletonProps> = ({
    variant = 'text',
    width,
    height,
    count = 1,
    animation = 'pulse'
}) => {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <Skeleton
                    key={index}
                    variant={variant}
                    width={width}
                    height={height}
                    animation={animation}
                />
            ))}
        </>
    );
};

export default CustomSkeleton;
