// src/components/ui/Skeleton.tsx
import { clsx } from 'clsx';

// Fix: Changed from an empty interface to a type alias to resolve the ESLint error.
type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
    return (
        <div
            className={clsx('animate-pulse rounded-md bg-gray-200', className)}
            {...props}
        />
    );
}