import React from 'react';

export interface ActiveRequest {
  type: 'hemen' | 'gecerken';
  from?: string;
  to?: string;
  details: string;
  name?: string;
  phone?: string;
  status: 'pending' | 'assigned' | 'transit' | 'delivered';
  createdAt: number;
}

export interface BookingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedService: string | null;
  initialType?: 'hemen' | 'gecerken' | null;
  onSuccess: (request: ActiveRequest) => void;
}

export function BookingDialog(_props: BookingDialogProps) {
  return null;
}
