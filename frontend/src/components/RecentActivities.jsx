import React from 'react';
import { FiDownload, FiMessageSquare } from 'react-icons/fi';

function RecentActivities() {
  return (
    <div className="px-4 space-y-2">
      <div className="bg-background/50 backdrop-blur-sm border border-border/50 rounded-lg p-3 shadow-sm hover:bg-accent/10 transition-colors">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-md">
            <FiDownload className="text-primary" size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              Downloaded: API Handbook M1
            </p>
            <p className="text-xs text-muted-foreground">
              10:49:52 PM
            </p>
          </div>
        </div>
      </div>

      <div className="bg-background/50 backdrop-blur-sm border border-border/50 rounded-lg p-3 shadow-sm hover:bg-accent/10 transition-colors">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-md">
            <FiDownload className="text-primary" size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              Downloaded: UU WS 8.pdf
            </p>
            <p className="text-xs text-muted-foreground">
              10:48:26 PM
            </p>
          </div>
        </div>
      </div>

      <div className="bg-background/50 backdrop-blur-sm border border-border/50 rounded-lg p-3 shadow-sm hover:bg-accent/10 transition-colors">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-md">
            <FiMessageSquare className="text-primary" size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              Response: Chat 4
            </p>
            <p className="text-xs text-muted-foreground">
              10:39:33 PM
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecentActivities; 