import { useEffect, useState } from 'react';
import { User, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';

export function UserTag({ 
  userId, 
  userName, 
  timestamp, 
  action = 'created',
  size = 'default',
  className 
}) {
  const [resolvedName, setResolvedName] = useState(userName || null);

  useEffect(() => {
    let mounted = true;
    if (!resolvedName && userId) {
      // First try local cache stored in localStorage (pricepilot_all_users)
      const tryLocal = () => {
        try {
          const all = JSON.parse(localStorage.getItem('pricepilot_all_users') || '[]');
          const found = all.find(u => String(u.id) === String(userId));
          if (found && found.username) return `@${found.username}`;
        } catch (e) {
          // ignore
        }
        return null;
      };

      const local = tryLocal();
      if (local) {
        setResolvedName(local);
      } else {
        // fallback to fetching user record for nickname
        (async () => {
          try {
            const u = await base44.entities.User.get(String(userId));
            if (mounted && u) {
              const uname = u.username || u.full_name || u.name || null;
              setResolvedName(uname ? `@${uname}` : null);
            }
          } catch (e) {
            // ignore
          }
        })();
      }
    }
    return () => { mounted = false; };
  }, [userId, resolvedName]);
  const sizeClasses = {
    small: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-1',
    large: 'text-base px-3 py-1.5'
  };
  
  const iconSizes = {
    small: 'w-2.5 h-2.5',
    default: 'w-3 h-3',
    large: 'w-4 h-4'
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // If we have a userId, make the entire badge clickable (bigger target)
  if (userId) {
    return (
      <Link to={`/User?id=${encodeURIComponent(userId)}`} className="no-underline">
        <Badge
          variant="secondary"
          className={cn(
            'flex items-center gap-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200',
            sizeClasses[size],
            className
          )}
        >
          <User className={iconSizes[size]} />
          <span className="font-medium">{resolvedName || userName || userId || 'Anonymous'}</span>
          {timestamp && (
            <>
              <span className="text-slate-400">•</span>
              <Clock className={iconSizes[size]} />
              <span>{formatTimestamp(timestamp)}</span>
            </>
          )}
        </Badge>
      </Link>
    );
  }

  return (
    <Badge 
      variant="secondary" 
      className={cn(
        'flex items-center gap-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200',
        sizeClasses[size],
        className
      )}
    >
      <User className={iconSizes[size]} />
      <span className="font-medium">{resolvedName || userName || userId || 'Anonymous'}</span>
      {timestamp && (
        <>
          <span className="text-slate-400">•</span>
          <Clock className={iconSizes[size]} />
          <span>{formatTimestamp(timestamp)}</span>
        </>
      )}
    </Badge>
  );
}
