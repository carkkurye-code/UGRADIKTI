import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { IntegrationService } from '@/services/integrationService';
import { eventBus } from '@/lib/eventBus';
import { createDomainEvent } from '@/lib/domainEvents';

interface TableChannelConfig {
  channelName: string;
  tableName: string;
  eventFilter: 'INSERT' | '*';
  staggerOffsetMs: number;
  handler: (payload: any) => void;
}

interface ChannelState {
  channel: any | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  retryCount: number;
  isConnecting: boolean;
}

/**
 * Resilient Production Realtime Synchronization Hook for UĞRA Platform
 * Listens to Supabase Realtime Postgres Changes on orders, wallets, notifications,
 * and ratings tables in separate channels with controlled reconnection and backoff.
 */
export function useRealtimeSync(userId?: string): void {
  const channelStatesRef = useRef<Record<string, ChannelState>>({});

  useEffect(() => {
    let isMounted = true;

    // Ensure Integration Engine service listeners are active
    try {
      IntegrationService.initialize();
    } catch (e) {
      console.warn('[RealtimeSync] IntegrationService initialization warning:', e);
    }

    if (!isSupabaseConfigured || !supabase) {
      console.log('[RealtimeSync] Running in offline mode (Realtime disabled).');
      return;
    }

    console.log('[RealtimeSync] Initializing resilient Realtime channels for Orders, Wallets, Notifications, and Ratings...');

    // Handlers with safe error boundaries
    const handleOrderChange = (payload: any) => {
      try {
        if (!payload || !payload.eventType) return;
        const newRow = payload.new as any;
        if (!newRow && payload.eventType !== 'DELETE') return;

        if (payload.eventType === 'INSERT' && newRow?.id) {
          eventBus.publish(
            createDomainEvent('TASK_CREATED', newRow.id, {
              taskId: newRow.id,
              customerId: newRow.customer_id || newRow.user_id,
              partnerId: newRow.partner_id,
              price: Number(newRow.total_price || newRow.customer_price || 0),
              pickupAddress: newRow.pickup_address,
              deliveryAddress: newRow.delivery_address,
              taskType: newRow.service_type || newRow.delivery_type,
            })
          );
        } else if (payload.eventType === 'UPDATE' && newRow?.id) {
          const oldRow = payload.old as any;
          const newStatus = newRow.status;
          const oldStatus = oldRow?.status;

          if ((newStatus === 'assigned' || newStatus === 'accepted') && (oldStatus !== 'assigned' && oldStatus !== 'accepted')) {
            eventBus.publish(
              createDomainEvent('TASK_ACCEPTED', newRow.id, {
                taskId: newRow.id,
                assistantId: newRow.assistant_id,
                customerId: newRow.customer_id || newRow.user_id,
              })
            );
          } else if ((newStatus === 'picked_up' || newStatus === 'yolda') && (oldStatus !== 'picked_up' && oldStatus !== 'yolda')) {
            eventBus.publish(
              createDomainEvent('TASK_PICKED_UP', newRow.id, {
                taskId: newRow.id,
                assistantId: newRow.assistant_id,
                customerId: newRow.customer_id || newRow.user_id,
              })
            );
          } else if ((newStatus === 'completed' || newStatus === 'teslim_edildi') && (oldStatus !== 'completed' && oldStatus !== 'teslim_edildi')) {
            eventBus.publish(
              createDomainEvent('TASK_COMPLETED', newRow.id, {
                taskId: newRow.id,
                assistantId: newRow.assistant_id,
                customerId: newRow.customer_id || newRow.user_id,
                partnerId: newRow.partner_id,
                price: Number(newRow.total_price || newRow.customer_price || 0),
              })
            );
          } else if ((newStatus === 'cancelled' || newStatus === 'iptal') && (oldStatus !== 'cancelled' && oldStatus !== 'iptal')) {
            eventBus.publish(
              createDomainEvent('TASK_CANCELLED', newRow.id, {
                taskId: newRow.id,
                customerId: newRow.customer_id || newRow.user_id,
                assistantId: newRow.assistant_id,
                price: Number(newRow.total_price || newRow.customer_price || 0),
                reason: newRow.cancel_reason,
              })
            );
          }
        }
      } catch (err) {
        console.warn('[RealtimeSync] [orders] Safe payload handler caught error:', err);
      }
    };

    const handleWalletChange = (payload: any) => {
      try {
        if (!payload?.new) return;
        const newRow = payload.new as any;
        if (!newRow.profile_id) return;

        eventBus.publish(
          createDomainEvent('WALLET_UPDATED', newRow.profile_id, {
            profileId: newRow.profile_id,
            walletId: newRow.id,
            transactionType: 'realtime_update',
            amount: 0,
            newBalance: newRow.available_balance,
            description: 'Realtime bakiye güncellemesi',
          })
        );
      } catch (err) {
        console.warn('[RealtimeSync] [wallets] Safe payload handler caught error:', err);
      }
    };

    const handleNotificationChange = (payload: any) => {
      try {
        if (!payload?.new) return;
        const newRow = payload.new as any;
        if (!newRow.id) return;

        eventBus.publish(
          createDomainEvent('NOTIFICATION_CREATED', newRow.id, {
            notificationId: newRow.id,
            recipientProfileId: newRow.recipient_profile_id,
            title: newRow.title,
            body: newRow.body,
            type: newRow.type,
          })
        );
      } catch (err) {
        console.warn('[RealtimeSync] [notifications] Safe payload handler caught error:', err);
      }
    };

    const handleRatingChange = (payload: any) => {
      try {
        if (!payload?.new) return;
        const newRow = payload.new as any;
        if (!newRow.id) return;

        eventBus.publish(
          createDomainEvent('RATING_CREATED', newRow.id, {
            ratingId: newRow.id,
            taskId: newRow.task_id,
            reviewerProfileId: newRow.reviewer_profile_id,
            targetProfileId: newRow.target_profile_id,
            targetType: newRow.target_type,
            score: newRow.score,
            comment: newRow.comment,
            tags: newRow.tags,
          })
        );
      } catch (err) {
        console.warn('[RealtimeSync] [ratings] Safe payload handler caught error:', err);
      }
    };

    const configs: TableChannelConfig[] = [
      {
        channelName: 'ugra-realtime-orders',
        tableName: 'orders',
        eventFilter: '*',
        staggerOffsetMs: 0,
        handler: handleOrderChange,
      },
      {
        channelName: 'ugra-realtime-wallets',
        tableName: 'wallets',
        eventFilter: '*',
        staggerOffsetMs: 2000,
        handler: handleWalletChange,
      },
      {
        channelName: 'ugra-realtime-notifications',
        tableName: 'notifications',
        eventFilter: 'INSERT',
        staggerOffsetMs: 4000,
        handler: handleNotificationChange,
      },
      {
        channelName: 'ugra-realtime-ratings',
        tableName: 'ratings',
        eventFilter: 'INSERT',
        staggerOffsetMs: 6000,
        handler: handleRatingChange,
      },
    ];

    // Helper to safely clean up a channel instance
    const cleanupChannel = (channelName: string) => {
      const state = channelStatesRef.current[channelName];
      if (!state) return;

      if (state.reconnectTimer) {
        clearTimeout(state.reconnectTimer);
        state.reconnectTimer = null;
      }

      if (state.channel) {
        try {
          if (supabase && typeof supabase.removeChannel === 'function') {
            supabase.removeChannel(state.channel);
          }
        } catch {}
        state.channel = null;
      }
      state.isConnecting = false;
    };

    // Helper to schedule a reconnection with backoff + stagger
    const scheduleReconnect = (config: TableChannelConfig) => {
      if (!isMounted) return;

      let state = channelStatesRef.current[config.channelName];
      if (!state) {
        state = { channel: null, reconnectTimer: null, retryCount: 0, isConnecting: false };
        channelStatesRef.current[config.channelName] = state;
      }

      if (state.reconnectTimer) {
        clearTimeout(state.reconnectTimer);
        state.reconnectTimer = null;
      }

      // Safely tear down existing dead channel
      if (state.channel) {
        try {
          if (supabase && typeof supabase.removeChannel === 'function') {
            supabase.removeChannel(state.channel);
          }
        } catch {}
        state.channel = null;
      }

      state.retryCount += 1;

      // Cap aggressive retries: 3 attempts with short backoff, then back off to 5 minutes
      let delay: number;
      if (state.retryCount <= 3) {
        const baseDelay = Math.min(30000, 5000 * Math.pow(1.5, state.retryCount - 1));
        const jitter = Math.random() * 1000;
        delay = Math.round(baseDelay + config.staggerOffsetMs + jitter);
        console.warn(`[RealtimeSync] [${config.tableName}] Realtime subscription temporarily disconnected (Attempt ${state.retryCount}/3). Reconnecting in ${(delay / 1000).toFixed(1)}s...`);
      } else {
        // Extended backoff: retry once every 5 minutes (300s) to avoid reconnect loop
        delay = 300000;
        if (state.retryCount === 4) {
          console.warn(`[RealtimeSync] [${config.tableName}] Realtime subscription unavailable (Supabase Realtime publication may not be enabled for table '${config.tableName}'). Will retry quietly every 5 minutes.`);
        }
      }

      state.reconnectTimer = setTimeout(() => {
        if (!isMounted) return;
        connectChannel(config);
      }, delay);
    };

    // Helper to connect a single channel
    const connectChannel = (config: TableChannelConfig) => {
      if (!isMounted || !supabase) return;

      let state = channelStatesRef.current[config.channelName];
      if (!state) {
        state = { channel: null, reconnectTimer: null, retryCount: 0, isConnecting: false };
        channelStatesRef.current[config.channelName] = state;
      }

      if (state.isConnecting) return;
      state.isConnecting = true;

      try {
        // Remove old channel if present
        if (state.channel) {
          try {
            supabase.removeChannel(state.channel);
          } catch {}
          state.channel = null;
        }

        const ch = supabase
          .channel(config.channelName)
          .on(
            'postgres_changes' as any,
            { event: config.eventFilter, schema: 'public', table: config.tableName },
            config.handler
          )
          .subscribe((status: string, err?: any) => {
            if (!isMounted) return;
            const currentState = channelStatesRef.current[config.channelName];
            if (currentState) {
              currentState.isConnecting = false;
            }

            if (status === 'SUBSCRIBED') {
              console.log(`[RealtimeSync] [${config.tableName}] Channel status: SUBSCRIBED`);
              if (currentState) {
                currentState.retryCount = 0;
              }
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              // Gracefully handle socket closures (e.g. 1006) without logging scary errors or throwing exceptions
              scheduleReconnect(config);
            }
          });

        state.channel = ch;
      } catch (e) {
        if (state) state.isConnecting = false;
        scheduleReconnect(config);
      }
    };

    // Initial connection trigger
    configs.forEach(config => {
      connectChannel(config);
    });

    return () => {
      isMounted = false;
      configs.forEach(config => {
        cleanupChannel(config.channelName);
      });
    };
  }, [userId]);
}


