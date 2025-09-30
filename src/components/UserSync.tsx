'use client';

import { useUser } from '@stackframe/stack';
import { useEffect, useState } from 'react';
import { syncUser } from '@/app/actions/user';

/**
 * A client-side component that automatically triggers the user sync process
 * when a user is authenticated. This should be placed in a central part
 * of your layout so it runs whenever a user is logged in.
 */
export default function UserSync() {
  const user = useUser();
  const [hasSynced, setHasSynced] = useState(false);

  useEffect(() => {
    // Only run the sync process if:
    // 1. We have a user object.
    // 2. We haven't already tried to sync for this session.
    if (user && !hasSynced) {
      console.log('Authenticated user detected. Triggering database sync...');
      setHasSynced(true); // Mark as synced to prevent re-running on every render
      
      syncUser()
        .then(result => {
          if (result.success) {
            console.log('Sync successful on the client:', result.user);
          } else {
            console.error('Sync failed on the client:', result.error);
          }
        })
        .catch(err => {
          console.error('An unexpected error occurred during sync:', err);
        });
    }
  }, [user, hasSynced]);

  // This component doesn't render anything to the UI.
  // It's purely for triggering the background sync process.
  return null;
}
