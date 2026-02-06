import { useState } from 'react';
import { History, User, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export function EditHistory({ history = [], className }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!history || history.length === 0) {
    return null;
  }

  const formatTimestamp = (tsOrDate) => {
    if (!tsOrDate) return '';
    const ts = tsOrDate.date || tsOrDate.timestamp || tsOrDate;
    const date = new Date(ts);
    return date.toLocaleString();
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const resolveStoredUsername = (id) => {
    try {
      const all = JSON.parse(localStorage.getItem('pricepilot_all_users') || '[]');
      const found = all.find(u => String(u.id) === String(id));
      if (found && found.username) return `@${found.username}`;
    } catch (e) {
      // ignore
    }
    return null;
  };

  const displayName = (entry) => {
    if (!entry) return 'Anonymous';
    if (entry.by_name) return entry.by_name;
    if (entry.user_name) return entry.user_name;
    if (entry.by && typeof entry.by === 'string') {
      const resolved = resolveStoredUsername(entry.by);
      if (resolved) return resolved;
      return entry.by;
    }
    if (entry.user_id) {
      const resolved = resolveStoredUsername(entry.user_id);
      if (resolved) return resolved;
      return entry.user_id;
    }
    return 'Anonymous';
  };

  return (
    <Card className={cn('border-slate-200', className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="w-4 h-4 text-slate-600" />
                Edit History
                <Badge variant="secondary" className="ml-2">
                  {history.length}
                </Badge>
              </CardTitle>
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {history.map((entry, index) => (
                <div
                  key={index}
                  className="border-l-2 border-emerald-200 pl-4 py-2 space-y-2"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-3 h-3 text-slate-500" />
                    <span className="font-medium text-slate-700">
                      {displayName(entry)}
                    </span>
                    <span className="text-slate-400">•</span>
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span className="text-slate-500">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </div>

                  {entry.changes && Object.keys(entry.changes).length > 0 && (
                    <div className="space-y-1.5">
                      {Array.isArray(entry.changes)
                        ? entry.changes.map((change, idx) => {
                            const field = change.field || `change_${idx}`;
                            const oldVal = change.old !== undefined ? change.old : change.before;
                            const newVal = change.new !== undefined ? change.new : change.after;
                            return (
                              <div key={idx} className="bg-slate-50 rounded-lg p-2 text-xs">
                                <div className="font-medium text-slate-700 mb-1 capitalize">
                                  {String(field).replace(/_/g, ' ')}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <span className="text-slate-500">Old:</span>
                                    <div className="text-red-600 font-mono break-all">
                                      {formatValue(oldVal)}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">New:</span>
                                    <div className="text-emerald-600 font-mono break-all">
                                      {formatValue(newVal)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        : Object.entries(entry.changes).map(([field, change]) => {
                            // support both {old,new} and {before,after} shapes
                            const oldVal = change.old !== undefined ? change.old : change.before;
                            const newVal = change.new !== undefined ? change.new : change.after;
                            return (
                              <div key={field} className="bg-slate-50 rounded-lg p-2 text-xs">
                                <div className="font-medium text-slate-700 mb-1 capitalize">
                                  {field.replace(/_/g, ' ')}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <span className="text-slate-500">Old:</span>
                                    <div className="text-red-600 font-mono break-all">
                                      {formatValue(oldVal)}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">New:</span>
                                    <div className="text-emerald-600 font-mono break-all">
                                      {formatValue(newVal)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
