
import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function LikeDislike({ 
  likes = [], 
  dislikes = [], 
  currentUserId, 
  onLike, 
  onDislike,
  size = 'default',
  className
}) {
  const hasLiked = currentUserId && likes.includes(currentUserId);
  const hasDisliked = currentUserId && dislikes.includes(currentUserId);
  
  const sizeClasses = {
    small: 'h-7 px-2 text-xs gap-1',
    default: 'h-9 px-3 text-sm gap-1.5',
    large: 'h-11 px-4 text-base gap-2'
  };

  const iconSizes = {
    small: 'w-3 h-3',
    default: 'w-4 h-4',
    large: 'w-5 h-5'
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant={hasLiked ? 'default' : 'outline'}
        size="sm"
        onClick={(e) => {
          if (e) {
            e.preventDefault();
            e.stopPropagation();
          }
          if (onLike) onLike(e);
        }}
        className={cn(
          sizeClasses[size],
          hasLiked ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500' : 'text-slate-600 border-slate-200 hover:bg-slate-50'
        )}
      >
        <ThumbsUp className={cn(iconSizes[size], hasLiked && "fill-current")} />
        <span>{likes.length}</span>
      </Button>
      
      <Button
        variant={hasDisliked ? 'default' : 'outline'}
        size="sm"
        onClick={(e) => {
          if (e) {
            e.preventDefault();
            e.stopPropagation();
          }
          if (onDislike) onDislike(e);
        }}
        className={cn(
          sizeClasses[size],
          hasDisliked ? 'bg-red-500 hover:bg-red-600 text-white border-red-500' : 'text-slate-600 border-slate-200 hover:bg-slate-50'
        )}
      >
        <ThumbsDown className={cn(iconSizes[size], hasDisliked && "fill-current")} />
        <span>{dislikes.length}</span>
      </Button>
    </div>
  );
}
