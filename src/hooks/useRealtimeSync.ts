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
  isCleaningUp: boolean;
  status: 'DISCONNECTED' | 'CONNECTING' | 'SUBSCRIBED' | 'ERROR' | 'CLEANING';
}

/**
 * Resilient Production Realtime Synchronization Hook for UĞRA Platform
 * Listens to Supabase Realtime Postgres Changes on orders, wallets, and notifications
 * in separate channels with idempotent cleanup and controlled reconnection.
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

    console.log('[RealtimeSync] Initializing resilient Realtime channels for Orders, Wallets, and Notifications...');

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

    const configs: TableChannelConfig[] = [
      {
        channelName: 'ugra-realtime-orders',
        tableName: 'orders',
        eventFilter: '*',
        staggerOffsetMs: 0,
        handler: handleOrderChange,
      },
      {
        channelName: 'ugra-realtime-notifications',
        tableName: 'notifications',
        eventFilter: 'INSERT',
        staggerOffsetMs: 2000,
        handler: handleNotificationChange,
      },
    ];

    // Idempotent helper to safely clean up a channel instance
    const cleanupChannel = (channelName: string, tableName: string) => {
      const state = channelStatesRef.current[channelName];
      if (!state) return;

      if (state.isCleaningUp) {
        return;
      }
      state.isCleaningUp = true;

      if (state.reconnectTimer) {
        clearTimeout(state.reconnectTimer);
        state.reconnectTimer = null;
      }

      const existingChannel = state.channel;
      state.channel = null;
      state.isConnecting = false;
      state.status = 'DISCONNECTED';

      if (existingChannel && supabase && typeof supabase.removeChannel === 'function') {
        try {
          console.log(`[RealtimeSync] cleanup: ${tableName}`);
          supabase.removeChannel(existingChannel);
        } catch (err) {
          console.warn(`[RealtimeSync] [${tableName}] Error in removeChannel:`, err);
        }
      }

      state.isCleaningUp = false;
    };

    // Helper to schedule a reconnection with backoff + stagger
    const scheduleReconnect = (config: TableChannelConfig) => {
      if (!isMounted) return;

      let state = channelStatesRef.current[config.channelName];
      if (!state) {
        state = { channel: null, reconnectTimer: null, retryCount: 0, isConnecting: false, isCleaningUp: false, status: 'DISCONNECTED' };
        channelStatesRef.current[config.channelName] = state;
      }

      if (state.reconnectTimer) {
        console.log(`[RealtimeSync] reconnect skipped: ${config.tableName} already scheduled`);
        return;
      }

      // Tear down existing channel safely
      cleanupChannel(config.channelName, config.tableName);

      state.retryCount += 1;

      if (state.retryCount > 3) {
        console.warn(`[RealtimeSync] [${config.tableName}] Subscription unavailable after 3 attempts. Pausing auto-reconnect.`);
        return;
      }

      const baseDelay = Math.min(30000, 5000 * Math.pow(1.5, state.retryCount - 1));
      const jitter = Math.random() * 1000;
      const delay = Math.round(baseDelay + config.staggerOffsetMs + jitter);

      console.log(`[RealtimeSync] reconnect scheduled: ${config.tableName} (attempt ${state.retryCount}/3) in ${(delay / 1000).toFixed(1)}s`);

      state.reconnectTimer = setTimeout(() => {
        if (!state) return;
        state.reconnectTimer = null;
        if (!isMounted) return;
        connectChannel(config);
      }, delay);
    };

    // Helper to connect a single channel
    const connectChannel = (config: TableChannelConfig) => {
      if (!isMounted || !supabase) return;

      let state = channelStatesRef.current[config.channelName];
      if (!state) {
        state = { channel: null, reconnectTimer: null, retryCount: 0, isConnecting: false, isCleaningUp: false, status: 'DISCONNECTED' };
        channelStatesRef.current[config.channelName] = state;
      }

      if (state.isConnecting || state.channel || state.isCleaningUp) {
        console.log(`[RealtimeSync] reconnect skipped: ${config.tableName} already active`);
        return;
      }

      state.isConnecting = true;
      state.status = 'CONNECTING';

      console.log(`[RealtimeSync] subscribing: ${config.tableName}`);

      try {
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
            if (!currentState || currentState.isCleaningUp) return;

            currentState.isConnecting = false;

            if (status === 'SUBSCRIBED') {
              console.log(`[RealtimeSync] subscribed: ${config.tableName}`);
              currentState.status = 'SUBSCRIBED';
              currentState.retryCount = 0;
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              currentState.status = 'ERROR';
              console.warn(`[RealtimeSync] [${config.tableName}] Channel status change: ${status}`);
              // Defer reconnect to next macrotask to prevent synchronous call stack recursion during removeChannel/unsubscribe
              setTimeout(() => {
                if (isMounted) {
                  scheduleReconnect(config);
                }
              }, 0);
            }
          });

        state.channel = ch;
      } catch (e) {
        if (state) {
          state.isConnecting = false;
          state.status = 'ERROR';
        }
        console.warn(`[RealtimeSync] [${config.tableName}] Exception subscribing:`, e);
        setTimeout(() => {
          if (isMounted) {
            scheduleReconnect(config);
          }
        }, 0);
      }
    };

    // Initial connection trigger
    configs.forEach(config => {
      connectChannel(config);
    });

    return () => {
      isMounted = false;
      configs.forEach(config => {
        cleanupChannel(config.channelName, config.tableName);
      });
    };
  }, [userId]);
}


