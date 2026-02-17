import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LevelBadge } from '@/components/common/LevelBadge';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  level?: number;
  className?: string;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

export function UserAvatar({ name, avatarUrl, size = 'md', level, className }: UserAvatarProps) {
  const initial = name?.charAt(0)?.toUpperCase() || '?';
  
  return (
    <div className="relative inline-flex">
      <Avatar className={cn(sizeClasses[size], className)}>
        {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
        <AvatarFallback className="bg-secondary text-muted-foreground font-medium">
          {initial}
        </AvatarFallback>
      </Avatar>
      {level != null && level > 0 && (
        <LevelBadge level={level} size={size} />
      )}
    </div>
  );
}
